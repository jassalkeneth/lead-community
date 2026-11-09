<?php

namespace App\Http\Controllers;

use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TeamController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = Team::query();
        if ($r->filled('communityId')) $q->where('communityId', $r->string('communityId'));
        if ($r->filled('department')) $q->where('department', $r->string('department'));
        return response()->json($q->orderBy('sortOrder')->get());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Team::findOrFail($id));
    }

    public function store(Request $r): JsonResponse
    {
        $data = $r->validate([
            'communityId' => 'required|string|exists:communities,id',
            'name' => 'required|string',
            'teamLeadId' => 'required|string|exists:app_users,id',
            'leadName' => 'required|string',
            'department' => 'required|string',
            'membersCount' => 'nullable|integer|min:0',
            'sortOrder' => 'nullable|integer',
        ]);
        $data['id'] = (string) Str::uuid();
        $data += ['membersCount' => 0, 'sortOrder' => 0];
        return response()->json(Team::create($data), 201);
    }

    public function update(Request $r, string $id): JsonResponse
    {
        $t = Team::findOrFail($id);
        $data = $r->validate([
            'communityId' => 'sometimes|string|exists:communities,id',
            'name' => 'sometimes|string',
            'teamLeadId' => 'sometimes|string|exists:app_users,id',
            'leadName' => 'sometimes|string',
            'department' => 'sometimes|string',
            'membersCount' => 'sometimes|integer|min:0',
            'sortOrder' => 'sometimes|integer',
        ]);
        $t->update($data);
        return response()->json($t->refresh());
    }

    public function destroy(string $id): JsonResponse
    {
        Team::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
