<?php

namespace App\Http\Controllers;

use App\Models\ActionPlan;
use App\Models\AppUser;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ActionPlanController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = ActionPlan::query();
        foreach (['submissionId', 'communityId', 'teamId', 'kpiKey', 'status', 'ownerUserId'] as $f) {
            if ($r->filled($f)) $q->where($f, $r->string($f));
        }
        return response()->json($q->orderBy('sortOrder')->orderByDesc('updated_at')->get());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(ActionPlan::findOrFail($id));
    }

    public function store(Request $r): JsonResponse
    {
        $data = $r->validate([
            'submissionId' => 'nullable|string|exists:submissions,id',
            'periodId' => 'nullable|string|exists:periods,id',
            'communityId' => 'nullable|string|exists:communities,id',
            'teamId' => 'nullable|string|exists:teams,id',
            'kpiKey' => 'required|string|exists:kpi_definitions,key',
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
            'progressPercentage' => 'nullable|numeric|between:0,100',
            'aiGenerated' => 'nullable|boolean',
        ]);
        $data['id'] = (string) Str::uuid();
        $data += [
            'status' => 'PENDING_APPROVAL',
            'progressPercentage' => 0,
            'aiGenerated' => false,
            'updates' => [],
            'sortOrder' => 0,
        ];
        return response()->json(ActionPlan::create($data), 201);
    }

    public function update(Request $r, string $id): JsonResponse
    {
        $p = ActionPlan::findOrFail($id);
        $data = $r->validate([
            'title' => 'sometimes|string',
            'identifiedRootCause' => 'sometimes|string',
            'verifiedFactVsHypothesis' => 'sometimes|string',
            'recommendedIntervention' => 'sometimes|string',
            'actionOwner' => 'sometimes|string',
            'ownerUserId' => 'nullable|string|exists:app_users,id',
            'proposedDeadline' => 'sometimes|date',
            'measurableRecoveryTarget' => 'sometimes|string',
            'currentScoreSummary' => 'sometimes|string',
            'status' => 'sometimes|in:DRAFT_AI,PENDING_APPROVAL,ACTIVE,RESOLVED,BLOCKED',
            'progressPercentage' => 'sometimes|numeric|between:0,100',
        ]);
        $p->update($data);
        return response()->json($p->refresh());
    }

    public function addUpdate(Request $r, string $id): JsonResponse
    {
        $p = ActionPlan::findOrFail($id);
        $data = $r->validate([
            'authorId' => 'required|string|exists:app_users,id',
            'note' => 'required|string',
            'progressPercentage' => 'nullable|numeric|between:0,100',
            'status' => 'nullable|in:DRAFT_AI,PENDING_APPROVAL,ACTIVE,RESOLVED,BLOCKED',
        ]);

        return DB::transaction(function () use ($p, $data) {
            $author = AppUser::findOrFail($data['authorId']);
            $updates = $p->updates ?? [];
            $updates[] = [
                'id' => (string) Str::uuid(),
                'authorId' => $author->id,
                'authorName' => $author->name,
                'note' => $data['note'],
                'progressPercentage' => $data['progressPercentage'] ?? $p->progressPercentage,
                'timestamp' => now()->toIso8601String(),
            ];
            $p->updates = $updates;
            if (isset($data['progressPercentage'])) $p->progressPercentage = $data['progressPercentage'];
            if (isset($data['status'])) $p->status = $data['status'];
            $p->save();

            AuditLog::create([
                'id' => (string) Str::uuid(),
                'entityType' => 'ACTION_PLAN',
                'entityId' => $p->id,
                'action' => 'UPDATE_ADDED',
                'actorId' => $author->id,
                'actorName' => $author->name,
                'actorRole' => $author->role,
                'newState' => ['progress' => $p->progressPercentage, 'status' => $p->status],
                'details' => $data['note'],
                'timestamp' => now(),
                'sortOrder' => 0,
            ]);

            return response()->json($p->refresh());
        });
    }

    public function approve(Request $r, string $id): JsonResponse
    {
        $p = ActionPlan::findOrFail($id);
        $data = $r->validate(['actorId' => 'required|string|exists:app_users,id']);
        $actor = AppUser::findOrFail($data['actorId']);

        if (!in_array($actor->role, ['OPERATIONS_MANAGER', 'COMMUNITY_HEAD', 'SUPER_ADMIN'], true)) {
            return response()->json(['message' => "Role {$actor->role} cannot approve action plans"], 403);
        }
        if ($p->status !== 'PENDING_APPROVAL') {
            return response()->json(['message' => "Cannot approve plan in status {$p->status}"], 409);
        }

        return DB::transaction(function () use ($p, $actor) {
            $p->status = 'ACTIVE';
            $p->approvedById = $actor->id;
            $p->approvedByName = $actor->name;
            $p->save();

            AuditLog::create([
                'id' => (string) Str::uuid(),
                'entityType' => 'ACTION_PLAN',
                'entityId' => $p->id,
                'action' => 'APPROVED',
                'actorId' => $actor->id,
                'actorName' => $actor->name,
                'actorRole' => $actor->role,
                'newState' => ['status' => 'ACTIVE'],
                'details' => 'Action plan approved',
                'timestamp' => now(),
                'sortOrder' => 0,
            ]);

            return response()->json($p->refresh());
        });
    }

    public function destroy(string $id): JsonResponse
    {
        ActionPlan::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
