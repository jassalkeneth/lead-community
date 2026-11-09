<?php

namespace App\Http\Controllers;

use App\Models\Community;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CommunityController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = Community::query();
        if ($r->filled('activeStatus')) $q->where('activeStatus', $r->string('activeStatus'));
        if ($r->filled('region')) $q->where('region', $r->string('region'));
        return response()->json($q->orderBy('sortOrder')->get());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Community::with('teams')->findOrFail($id));
    }

    public function store(Request $r): JsonResponse
    {
        $data = $r->validate([
            'name' => 'required|string',
            'code' => 'required|string|unique:communities,code',
            'region' => 'required|string',
            'communityHeadId' => 'required|string|exists:app_users,id',
            'headName' => 'required|string',
            'memberCount' => 'nullable|integer|min:0',
            'teamsCount' => 'nullable|integer|min:0',
            'description' => 'required|string',
            'activeStatus' => 'nullable|in:ACTIVE,INACTIVE',
            'sortOrder' => 'nullable|integer',
        ]);
        $data['id'] = (string) Str::uuid();
        $data += ['memberCount' => 0, 'teamsCount' => 0, 'activeStatus' => 'ACTIVE', 'sortOrder' => 0];
        return response()->json(Community::create($data), 201);
    }

    public function update(Request $r, string $id): JsonResponse
    {
        $c = Community::findOrFail($id);
        $data = $r->validate([
            'name' => 'sometimes|string',
            'code' => 'sometimes|string|unique:communities,code,' . $id . ',id',
            'region' => 'sometimes|string',
            'communityHeadId' => 'sometimes|string|exists:app_users,id',
            'headName' => 'sometimes|string',
            'memberCount' => 'sometimes|integer|min:0',
            'teamsCount' => 'sometimes|integer|min:0',
            'description' => 'sometimes|string',
            'activeStatus' => 'sometimes|in:ACTIVE,INACTIVE',
            'sortOrder' => 'sometimes|integer',
        ]);
        $c->update($data);
        return response()->json($c->refresh());
    }

    public function destroy(string $id): JsonResponse
    {
        Community::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
