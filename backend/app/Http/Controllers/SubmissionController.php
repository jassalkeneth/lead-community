<?php

namespace App\Http\Controllers;

use App\Models\AppUser;
use App\Models\Submission;
use App\Services\SubmissionWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SubmissionController extends Controller
{
    public function __construct(private SubmissionWorkflow $workflow) {}

    public function index(Request $request): JsonResponse
    {
        $q = Submission::query();
        foreach (['periodId', 'communityId', 'teamId', 'status'] as $f) {
            if ($request->filled($f)) $q->where($f, $request->string($f));
        }
        return response()->json($q->orderBy('sortOrder')->orderByDesc('updated_at')->get());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Submission::with(['actionPlans'])->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'periodId' => 'required|string|exists:periods,id',
            'communityId' => 'required|string|exists:communities,id',
            'teamId' => 'required|string|exists:teams,id',
            'submittedById' => 'required|string|exists:app_users,id',
            'rawInputs' => 'present|array',
            'results' => 'present|array',
            'overallWeightedScore' => 'numeric',
            'provisionalScore' => 'numeric',
        ]);

        $actor = AppUser::findOrFail($data['submittedById']);
        $submission = Submission::create(array_merge($data, [
            'id' => (string) Str::uuid(),
            'submittedByName' => $actor->name,
            'submittedByRole' => $actor->role,
            'status' => 'DRAFT',
            'isProvisional' => true,
            'validWeightsTotal' => 0,
            'onTrackCount' => 0,
            'needsAttentionCount' => 0,
            'pendingCount' => 0,
            'sortOrder' => 0,
        ]));

        return response()->json($submission, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $submission = Submission::findOrFail($id);
        if (!in_array($submission->status, ['DRAFT', 'CHANGES_REQUESTED'], true)) {
            return response()->json([
                'message' => "Submissions in status {$submission->status} cannot be edited",
            ], 409);
        }
        $data = $request->validate([
            'rawInputs' => 'sometimes|array',
            'results' => 'sometimes|array',
            'overallWeightedScore' => 'sometimes|numeric',
            'provisionalScore' => 'sometimes|numeric',
            'isProvisional' => 'sometimes|boolean',
            'validWeightsTotal' => 'sometimes|numeric',
            'onTrackCount' => 'sometimes|integer|min:0',
            'needsAttentionCount' => 'sometimes|integer|min:0',
            'pendingCount' => 'sometimes|integer|min:0',
            'communityHeadNotes' => 'nullable|string',
            'operationsNotes' => 'nullable|string',
        ]);
        $submission->update($data);
        return response()->json($submission->refresh());
    }

    public function destroy(string $id): JsonResponse
    {
        $submission = Submission::findOrFail($id);
        if ($submission->status === 'LOCKED') {
            return response()->json(['message' => 'Locked submissions cannot be deleted'], 409);
        }
        $submission->delete();
        return response()->json(null, 204);
    }

    public function transition(Request $request, string $id, string $action): JsonResponse
    {
        $data = $request->validate([
            'actorId' => 'required|string|exists:app_users,id',
            'notes' => 'nullable|string',
        ]);

        $submission = Submission::findOrFail($id);
        $actor = AppUser::findOrFail($data['actorId']);
        $updated = $this->workflow->transition($submission, $action, $actor, $data);

        return response()->json($updated);
    }
}
