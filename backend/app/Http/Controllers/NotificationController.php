<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NotificationController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = AppNotification::query();
        foreach (['recipientRole', 'recipientUserId', 'type'] as $f) {
            if ($r->filled($f)) $q->where($f, $r->string($f));
        }
        if ($r->filled('unread')) $q->where('read', false);
        return response()->json($q->orderByDesc('timestamp')->limit(200)->get());
    }

    public function store(Request $r): JsonResponse
    {
        $data = $r->validate([
            'recipientRole' => 'nullable|string',
            'recipientUserId' => 'nullable|string|exists:app_users,id',
            'title' => 'required|string',
            'message' => 'required|string',
            'type' => 'required|in:DEADLINE,SUBMISSION,APPROVAL,ACTION_REQUIRED,AI_INSIGHT,REVIEW_REQUIRED',
            'linkTab' => 'nullable|string',
        ]);
        $data['id'] = (string) Str::uuid();
        $data['read'] = false;
        $data['timestamp'] = now();
        $data['sortOrder'] = 0;
        return response()->json(AppNotification::create($data), 201);
    }

    public function markRead(string $id): JsonResponse
    {
        $n = AppNotification::findOrFail($id);
        $n->read = true;
        $n->save();
        return response()->json($n);
    }

    public function markAllRead(Request $r): JsonResponse
    {
        $q = AppNotification::query()->where('read', false);
        if ($r->filled('recipientUserId')) $q->where('recipientUserId', $r->string('recipientUserId'));
        if ($r->filled('recipientRole')) $q->where('recipientRole', $r->string('recipientRole'));
        $affected = $q->update(['read' => true]);
        return response()->json(['updated' => $affected]);
    }

    public function destroy(string $id): JsonResponse
    {
        AppNotification::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
