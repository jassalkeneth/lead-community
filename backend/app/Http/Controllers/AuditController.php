<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = AuditLog::query();
        foreach (['entityType', 'entityId', 'actorId', 'actorRole', 'action'] as $f) {
            if ($r->filled($f)) $q->where($f, $r->string($f));
        }
        return response()->json($q->orderByDesc('timestamp')->limit(500)->get());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(AuditLog::findOrFail($id));
    }
}
