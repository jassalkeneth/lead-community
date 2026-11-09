<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\AppUser;
use App\Models\AuditLog;
use App\Models\Submission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

/**
 * Submission (scorecard) workflow state machine.
 *
 * Transitions:
 *   DRAFT                     -> SUBMITTED                  (submit, by TEAM_LEAD)
 *   SUBMITTED                 -> COMMUNITY_HEAD_REVIEW      (startReview, by COMMUNITY_HEAD)
 *   COMMUNITY_HEAD_REVIEW     -> CHANGES_REQUESTED          (requestChanges, by COMMUNITY_HEAD)
 *   CHANGES_REQUESTED         -> SUBMITTED                  (resubmit, by TEAM_LEAD)
 *   COMMUNITY_HEAD_REVIEW     -> OPERATIONS_MANAGER_REVIEW  (forward, by COMMUNITY_HEAD)
 *   OPERATIONS_MANAGER_REVIEW -> APPROVED                   (approve, by OPERATIONS_MANAGER)
 *   OPERATIONS_MANAGER_REVIEW -> CHANGES_REQUESTED          (requestChanges, by OPERATIONS_MANAGER)
 *   APPROVED                  -> LOCKED                     (lock, by OPERATIONS_MANAGER/SUPER_ADMIN)
 *
 * Audit log + notifications are written in the same DB transaction as the
 * submission update; failure rolls the whole thing back.
 */
class SubmissionWorkflow
{
    private const TRANSITIONS = [
        'submit'         => [['from' => ['DRAFT', 'CHANGES_REQUESTED'], 'to' => 'SUBMITTED',                  'role' => ['TEAM_LEAD']]],
        'startReview'    => [['from' => ['SUBMITTED'],                  'to' => 'COMMUNITY_HEAD_REVIEW',      'role' => ['COMMUNITY_HEAD']]],
        'requestChanges' => [
            ['from' => ['COMMUNITY_HEAD_REVIEW'],     'to' => 'CHANGES_REQUESTED', 'role' => ['COMMUNITY_HEAD']],
            ['from' => ['OPERATIONS_MANAGER_REVIEW'], 'to' => 'CHANGES_REQUESTED', 'role' => ['OPERATIONS_MANAGER']],
        ],
        'forward'        => [['from' => ['COMMUNITY_HEAD_REVIEW'],      'to' => 'OPERATIONS_MANAGER_REVIEW',  'role' => ['COMMUNITY_HEAD']]],
        'approve'        => [['from' => ['OPERATIONS_MANAGER_REVIEW'],  'to' => 'APPROVED',                   'role' => ['OPERATIONS_MANAGER']]],
        'lock'           => [['from' => ['APPROVED'],                   'to' => 'LOCKED',                     'role' => ['OPERATIONS_MANAGER', 'SUPER_ADMIN']]],
    ];

    public function transition(Submission $submission, string $action, AppUser $actor, array $meta = []): Submission
    {
        if (!isset(self::TRANSITIONS[$action])) {
            throw new InvalidArgumentException("Unknown workflow action: {$action}");
        }

        $rule = collect(self::TRANSITIONS[$action])
            ->first(fn ($r) => in_array($submission->status, $r['from'], true));

        if (!$rule) {
            throw new RuntimeException("Illegal transition '{$action}' from status {$submission->status}");
        }

        if (!in_array($actor->role, $rule['role'], true)) {
            throw new RuntimeException("Role {$actor->role} is not permitted to perform {$action}");
        }

        return DB::transaction(function () use ($submission, $action, $actor, $meta, $rule) {
            $previous = $submission->getOriginal();
            $now = now();

            $submission->status = $rule['to'];

            match ($action) {
                'submit' => $submission->submittedAt = $submission->submittedAt ?? $now,
                'startReview' => $submission->reviewedAt = $now,
                'approve' => $submission->approvedAt = $now,
                'lock' => $submission->lockedAt = $now,
                default => null,
            };

            if ($actor->role === 'COMMUNITY_HEAD' && isset($meta['notes'])) {
                $submission->communityHeadNotes = $meta['notes'];
            }
            if ($actor->role === 'OPERATIONS_MANAGER' && isset($meta['notes'])) {
                $submission->operationsNotes = $meta['notes'];
            }

            $submission->save();

            AuditLog::create([
                'id' => (string) Str::uuid(),
                'entityType' => 'SCORECARD',
                'entityId' => $submission->id,
                'action' => strtoupper($action),
                'actorId' => $actor->id,
                'actorName' => $actor->name,
                'actorRole' => $actor->role,
                'previousState' => ['status' => $previous['status'] ?? null],
                'newState' => ['status' => $submission->status],
                'details' => $meta['notes'] ?? "Transitioned to {$submission->status}",
                'timestamp' => $now,
                'sortOrder' => 0,
            ]);

            $this->notify($submission, $action, $actor);

            return $submission->refresh();
        });
    }

    private function notify(Submission $submission, string $action, AppUser $actor): void
    {
        [$recipientRole, $type, $title, $message] = match ($action) {
            'submit'         => ['COMMUNITY_HEAD',     'SUBMISSION',       'Scorecard submitted',     "{$actor->name} submitted a scorecard for review."],
            'startReview'    => ['TEAM_LEAD',          'REVIEW_REQUIRED',  'Scorecard under review',  "{$actor->name} started reviewing your scorecard."],
            'requestChanges' => ['TEAM_LEAD',          'ACTION_REQUIRED',  'Changes requested',       "{$actor->name} requested changes on your scorecard."],
            'forward'        => ['OPERATIONS_MANAGER', 'REVIEW_REQUIRED',  'Scorecard forwarded',     "{$actor->name} forwarded a scorecard for final approval."],
            'approve'        => ['TEAM_LEAD',          'APPROVAL',         'Scorecard approved',      "{$actor->name} approved your scorecard."],
            'lock'           => ['COMMUNITY_HEAD',     'APPROVAL',         'Scorecard locked',        "{$actor->name} locked scorecard {$submission->id}."],
            default          => [null, 'SUBMISSION', 'Scorecard update', 'Scorecard status changed.'],
        };

        AppNotification::create([
            'id' => (string) Str::uuid(),
            'recipientRole' => $recipientRole,
            'recipientUserId' => null,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'read' => false,
            'linkTab' => 'scorecards',
            'timestamp' => now(),
            'sortOrder' => 0,
        ]);
    }
}
