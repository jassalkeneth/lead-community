<?php

namespace App\Http\Controllers;

use App\Models\AppUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = AppUser::query();
        foreach (['role', 'assignedCommunityId', 'assignedTeamId'] as $f) {
            if ($r->filled($f)) $q->where($f, $r->string($f));
        }
        return response()->json($q->orderBy('sortOrder')->get());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(AppUser::findOrFail($id));
    }

    public function store(Request $r): JsonResponse
    {
        $data = $r->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:app_users,email',
            'role' => 'required|in:SUPER_ADMIN,OPERATIONS_MANAGER,COMMUNITY_HEAD,TEAM_LEAD',
            'title' => 'required|string',
            'avatarUrl' => 'nullable|url',
            'assignedCommunityId' => 'nullable|string|exists:communities,id',
            'assignedTeamId' => 'nullable|string|exists:teams,id',
            'sortOrder' => 'nullable|integer',
        ]);
        $data['id'] = (string) Str::uuid();
        $data['sortOrder'] ??= 0;
        return response()->json(AppUser::create($data), 201);
    }

    public function update(Request $r, string $id): JsonResponse
    {
        $user = AppUser::findOrFail($id);
        $data = $r->validate([
            'name' => 'sometimes|string',
            'email' => 'sometimes|email|unique:app_users,email,' . $id . ',id',
            'role' => 'sometimes|in:SUPER_ADMIN,OPERATIONS_MANAGER,COMMUNITY_HEAD,TEAM_LEAD',
            'title' => 'sometimes|string',
            'avatarUrl' => 'nullable|url',
            'assignedCommunityId' => 'nullable|string|exists:communities,id',
            'assignedTeamId' => 'nullable|string|exists:teams,id',
            'sortOrder' => 'sometimes|integer',
        ]);
        $user->update($data);
        return response()->json($user->refresh());
    }

    public function destroy(string $id): JsonResponse
    {
        AppUser::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
