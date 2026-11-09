<?php

namespace App\Http\Controllers;

use App\Models\ActionPlan;
use App\Models\AppNotification;
use App\Models\AppUser;
use App\Models\AuditLog;
use App\Models\Community;
use App\Models\KpiDefinition;
use App\Models\Period;
use App\Models\Submission;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Compatibility layer matching the URL shapes and {envelope:[]} responses that
 * the React frontend in src/lib/api.ts was written against. Lets the whole UI
 * work against Laravel without any frontend changes.
 *
 * The frontend sends demo-auth headers (x-user-id, x-user-name, x-user-role).
 * We trust them for writes and fall back gracefully for reads.
 */
class CompatController extends Controller
{
    private function actor(Request $r): array
    {
        $id = $r->header('x-user-id');
        $name = $r->header('x-user-name');
        $role = $r->header('x-user-role');
        if ($id) {
            $u = AppUser::find($id);
            if ($u) {
                return ['id' => $u->id, 'name' => $u->name, 'role' => $u->role];
            }
        }
        return [
            'id' => $id ?: 'anonymous',
            'name' => $name ?: 'Anonymous',
            'role' => $role ?: 'TEAM_LEAD',
        ];
    }

    // ---------- Auth ----------

    public function me(Request $r): JsonResponse
    {
        $a = $this->actor($r);
        $u = AppUser::find($a['id']);
        if ($u) return response()->json(['user' => $u]);

        // Hydrate a demo user so the UI boots even if we have no DB row.
        return response()->json(['user' => [
            'id' => $a['id'],
            'name' => $a['name'],
            'email' => strtolower(str_replace(' ', '.', $a['name'])) . '@commpulse.io',
            'role' => $a['role'],
            'title' => $a['role'],
        ]]);
    }

    public function users(): JsonResponse
    {
        return response()->json(['users' => AppUser::orderBy('sortOrder')->get()]);
    }

    public function switch(Request $r): JsonResponse
    {
        $data = $r->validate(['userId' => 'required|string']);
        $u = AppUser::find($data['userId']);
        if (!$u) return response()->json(['error' => 'User not found'], 404);
        return response()->json(['user' => $u]);
    }

    // ---------- Communities / Teams ----------

    public function communities(): JsonResponse
    {
        return response()->json(['communities' => Community::orderBy('sortOrder')->get()]);
    }

    public function teams(Request $r): JsonResponse
    {
        $q = Team::query();
        if ($r->filled('communityId')) $q->where('communityId', $r->string('communityId'));
        return response()->json(['teams' => $q->orderBy('sortOrder')->get()]);
    }

    // ---------- Periods ----------

    public function periods(): JsonResponse
    {
        return response()->json(['periods' => Period::orderBy('sortOrder')->get()]);
    }

    // ---------- Scorecards ----------

    public function scorecards(Request $r): JsonResponse
    {
        $q = Submission::query();
        foreach (['periodId', 'communityId', 'teamId', 'status'] as $f) {
            if ($r->filled($f)) $q->where($f, $r->string($f));
        }
        return response()->json(['submissions' => $q->orderByDesc('updated_at')->get()]);
    }

    public function submitScorecard(Request $r): JsonResponse
    {
        $data = $r->validate([
            'id' => 'nullable|string',
            'periodId' => 'required|string|exists:periods,id',
            'communityId' => 'required|string|exists:communities,id',
            'teamId' => 'required|string|exists:teams,id',
            'rawInputs' => 'present|array',
            'isDraft' => 'nullable|boolean',
        ]);
        $actor = $this->actor($r);
        $actorModel = AppUser::find($actor['id']);
        $actorName = $actorModel?->name ?? $actor['name'];
        $actorRole = $actorModel?->role ?? $actor['role'];
        $isDraft = (bool) ($data['isDraft'] ?? false);

        return DB::transaction(function () use ($data, $actor, $actorName, $actorRole, $isDraft) {
            $existing = !empty($data['id']) ? Submission::find($data['id']) : null;
            $existing ??= Submission::where('periodId', $data['periodId'])
                ->where('teamId', $data['teamId'])
                ->first();

            $payload = [
                'periodId' => $data['periodId'],
                'communityId' => $data['communityId'],
                'teamId' => $data['teamId'],
                'submittedById' => $actor['id'],
                'submittedByName' => $actorName,
                'submittedByRole' => $actorRole,
                'rawInputs' => $data['rawInputs'],
                'results' => $existing->results ?? [],
                'status' => $isDraft ? 'DRAFT' : 'SUBMITTED',
                'submittedAt' => $isDraft ? null : now(),
            ];

            if ($existing) {
                $existing->update($payload);
                $sub = $existing->refresh();
            } else {
                $payload['id'] = (string) Str::uuid();
                $payload += [
                    'overallWeightedScore' => 0,
                    'provisionalScore' => 0,
                    'isProvisional' => true,
                    'validWeightsTotal' => 0,
                    'onTrackCount' => 0,
                    'needsAttentionCount' => 0,
                    'pendingCount' => 0,
                    'sortOrder' => 0,
                ];
                $sub = Submission::create($payload);
            }

            $this->audit('SCORECARD', $sub->id, $isDraft ? 'SAVED_DRAFT' : 'SUBMITTED',
                $actor, ['status' => $sub->status], $isDraft ? 'Draft saved' : 'Scorecard submitted');

            if (!$isDraft) {
                $this->notify('COMMUNITY_HEAD', 'SUBMISSION',
                    'Scorecard submitted',
                    "{$actorName} submitted a scorecard for review.");
            }

            return response()->json([
                'submission' => $sub,
                'message' => $isDraft ? 'Draft saved' : 'Scorecard submitted',
            ]);
        });
    }

    public function workflow(Request $r, string $id): JsonResponse
    {
        $data = $r->validate([
            'action' => 'required|in:HEAD_APPROVE,HEAD_REQUEST_CHANGES,OPS_APPROVE,OPS_REQUEST_CHANGES,LOCK_SCORECARD',
            'notes' => 'nullable|string',
        ]);
        $actor = $this->actor($r);
        $sub = Submission::findOrFail($id);
        $prev = $sub->status;

        $rules = [
            'HEAD_APPROVE' => [
                'from' => ['SUBMITTED', 'COMMUNITY_HEAD_REVIEW'],
                'to' => 'OPERATIONS_MANAGER_REVIEW',
                'role' => ['COMMUNITY_HEAD', 'SUPER_ADMIN'],
                'ts' => 'reviewedAt',
                'notes' => 'communityHeadNotes',
            ],
            'HEAD_REQUEST_CHANGES' => [
                'from' => ['SUBMITTED', 'COMMUNITY_HEAD_REVIEW'],
                'to' => 'CHANGES_REQUESTED',
                'role' => ['COMMUNITY_HEAD', 'SUPER_ADMIN'],
                'ts' => 'reviewedAt',
                'notes' => 'communityHeadNotes',
            ],
            'OPS_APPROVE' => [
                'from' => ['OPERATIONS_MANAGER_REVIEW'],
                'to' => 'APPROVED',
                'role' => ['OPERATIONS_MANAGER', 'SUPER_ADMIN'],
                'ts' => 'approvedAt',
                'notes' => 'operationsNotes',
            ],
            'OPS_REQUEST_CHANGES' => [
                'from' => ['OPERATIONS_MANAGER_REVIEW'],
                'to' => 'CHANGES_REQUESTED',
                'role' => ['OPERATIONS_MANAGER', 'SUPER_ADMIN'],
                'ts' => 'reviewedAt',
                'notes' => 'operationsNotes',
            ],
            'LOCK_SCORECARD' => [
                'from' => ['APPROVED'],
                'to' => 'LOCKED',
                'role' => ['OPERATIONS_MANAGER', 'SUPER_ADMIN'],
                'ts' => 'lockedAt',
                'notes' => 'operationsNotes',
            ],
        ];
        $rule = $rules[$data['action']];
        if (!in_array($sub->status, $rule['from'], true)) {
            return response()->json(['error' => "Illegal action {$data['action']} from status {$sub->status}"], 409);
        }
        if (!in_array($actor['role'], $rule['role'], true)) {
            return response()->json(['error' => "Role {$actor['role']} cannot perform {$data['action']}"], 403);
        }

        return DB::transaction(function () use ($sub, $rule, $actor, $data, $prev) {
            $sub->status = $rule['to'];
            $sub->{$rule['ts']} = now();
            if (!empty($data['notes']) && !empty($rule['notes'])) {
                $sub->{$rule['notes']} = $data['notes'];
            }
            $sub->save();

            $this->audit('SCORECARD', $sub->id, $data['action'], $actor,
                ['status' => $prev], 'to ' . $sub->status,
                ['status' => $sub->status]);

            $this->notify('TEAM_LEAD', 'APPROVAL', 'Scorecard update',
                "{$actor['name']} performed {$data['action']}.");

            return response()->json(['submission' => $sub->refresh(), 'message' => 'OK']);
        });
    }

    // ---------- Action plans ----------

    public function actions(Request $r): JsonResponse
    {
        $q = ActionPlan::query();
        foreach (['submissionId', 'teamId', 'status'] as $f) {
            if ($r->filled($f)) $q->where($f, $r->string($f));
        }
        return response()->json(['actionPlans' => $q->orderByDesc('updated_at')->get()]);
    }

    public function createAction(Request $r): JsonResponse
    {
        $data = $r->validate([
            'submissionId' => 'nullable|string|exists:submissions,id',
            'periodId' => 'nullable|string|exists:periods,id',
            'communityId' => 'nullable|string|exists:communities,id',
            'teamId' => 'nullable|string|exists:teams,id',
            'kpiKey' => 'required|string',
            'kpiName' => 'required|string',
            'title' => 'required|string',
            'identifiedRootCause' => 'required|string',
            'verifiedFactVsHypothesis' => 'required|string',
            'recommendedIntervention' => 'required|string',
            'actionOwner' => 'required|string',
            'ownerUserId' => 'nullable|string|exists:app_users,id',
            'proposedDeadline' => 'required|date',
            'measurableRecoveryTarget' => 'required|string',
            'currentScoreSummary' => 'required|string',
            'status' => 'nullable|in:DRAFT_AI,PENDING_APPROVAL,ACTIVE,RESOLVED,BLOCKED',
            'aiGenerated' => 'nullable|boolean',
        ]);
        $actor = $this->actor($r);
        $data['id'] = (string) Str::uuid();
        $data += [
            'status' => 'PENDING_APPROVAL',
            'progressPercentage' => 0,
            'aiGenerated' => false,
            'updates' => [],
            'sortOrder' => 0,
        ];
        return DB::transaction(function () use ($data, $actor) {
            $plan = ActionPlan::create($data);
            $this->audit('ACTION_PLAN', $plan->id, 'CREATED', $actor, null, 'Action plan created');
            return response()->json(['actionPlan' => $plan]);
        });
    }

    public function approveAction(Request $r, string $id): JsonResponse
    {
        $plan = ActionPlan::findOrFail($id);
        $actor = $this->actor($r);
        if (!in_array($actor['role'], ['OPERATIONS_MANAGER', 'COMMUNITY_HEAD', 'SUPER_ADMIN'], true)) {
            return response()->json(['error' => "Role {$actor['role']} cannot approve"], 403);
        }
        if ($plan->status !== 'PENDING_APPROVAL') {
            return response()->json(['error' => "Cannot approve plan in {$plan->status}"], 409);
        }
        return DB::transaction(function () use ($plan, $actor) {
            $plan->status = 'ACTIVE';
            $plan->approvedById = $actor['id'];
            $plan->approvedByName = $actor['name'];
            $plan->save();
            $this->audit('ACTION_PLAN', $plan->id, 'APPROVED', $actor,
                ['status' => 'PENDING_APPROVAL'], 'Approved', ['status' => 'ACTIVE']);
            return response()->json(['actionPlan' => $plan->refresh()]);
        });
    }

    public function updateAction(Request $r, string $id): JsonResponse
    {
        $data = $r->validate([
            'note' => 'nullable|string',
            'progressPercentage' => 'nullable|numeric|between:0,100',
            'status' => 'nullable|in:DRAFT_AI,PENDING_APPROVAL,ACTIVE,RESOLVED,BLOCKED',
        ]);
        $plan = ActionPlan::findOrFail($id);
        $actor = $this->actor($r);

        return DB::transaction(function () use ($plan, $data, $actor) {
            if (!empty($data['note'])) {
                $updates = $plan->updates ?? [];
                $updates[] = [
                    'id' => (string) Str::uuid(),
                    'authorId' => $actor['id'],
                    'authorName' => $actor['name'],
                    'note' => $data['note'],
                    'progressPercentage' => $data['progressPercentage'] ?? $plan->progressPercentage,
                    'timestamp' => now()->toIso8601String(),
                ];
                $plan->updates = $updates;
            }
            if (isset($data['progressPercentage'])) $plan->progressPercentage = $data['progressPercentage'];
            if (isset($data['status'])) $plan->status = $data['status'];
            $plan->save();

            $this->audit('ACTION_PLAN', $plan->id, 'UPDATED', $actor, null,
                $data['note'] ?? 'Progress updated',
                ['progress' => $plan->progressPercentage, 'status' => $plan->status]);

            return response()->json(['actionPlan' => $plan->refresh()]);
        });
    }

    // ---------- Audit + notifications ----------

    public function auditLogs(Request $r): JsonResponse
    {
        $q = AuditLog::query();
        if ($r->filled('entityType')) $q->where('entityType', $r->string('entityType'));
        if ($r->filled('entityId'))   $q->where('entityId', $r->string('entityId'));

        // The React UI expects previous/new state as scalar strings (it renders
        // them directly). Flatten {status:X} → "X", otherwise JSON-encode.
        $logs = $q->orderByDesc('timestamp')->limit(500)->get()->map(function ($log) {
            $flatten = function ($v) {
                if ($v === null) return null;
                if (is_string($v)) return $v;
                if (is_array($v)) {
                    if (array_key_exists('status', $v)) return (string) $v['status'];
                    if (count($v) === 1) return (string) reset($v);
                    return json_encode($v);
                }
                return (string) $v;
            };
            $arr = $log->toArray();
            $arr['previousState'] = $flatten($log->previousState);
            $arr['newState'] = $flatten($log->newState);
            return $arr;
        });

        return response()->json(['logs' => $logs]);
    }

    public function notifications(Request $r): JsonResponse
    {
        $q = AppNotification::query();
        if ($r->filled('role')) $q->where(function ($x) use ($r) {
            $x->where('recipientRole', $r->string('role'))->orWhereNull('recipientRole');
        });
        $actor = $this->actor($r);
        $q->orWhere('recipientUserId', $actor['id']);
        return response()->json(['notifications' => $q->orderByDesc('timestamp')->limit(100)->get()]);
    }

    public function markNotificationRead(string $id): JsonResponse
    {
        $n = AppNotification::findOrFail($id);
        $n->read = true;
        $n->save();
        return response()->json(['ok' => true]);
    }

    // ---------- helpers ----------

    private function audit(string $entityType, string $entityId, string $action, array $actor,
                            ?array $previous = null, string $details = '', ?array $new = null): void
    {
        AuditLog::create([
            'id' => (string) Str::uuid(),
            'entityType' => $entityType,
            'entityId' => $entityId,
            'action' => $action,
            'actorId' => $actor['id'],
            'actorName' => $actor['name'],
            'actorRole' => $actor['role'],
            'previousState' => $previous,
            'newState' => $new,
            'details' => $details ?: $action,
            'timestamp' => now(),
            'sortOrder' => 0,
        ]);
    }

    private function notify(string $role, string $type, string $title, string $message): void
    {
        AppNotification::create([
            'id' => (string) Str::uuid(),
            'recipientRole' => $role,
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
