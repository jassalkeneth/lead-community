<?php

namespace App\Http\Controllers;

use App\Models\ActionPlan;
use App\Models\AppNotification;
use App\Models\AppUser;
use App\Models\AuditLog;
use App\Models\Community;
use App\Models\KpiDefinition;
use App\Models\Period;
use App\Models\Team;
use Illuminate\Http\JsonResponse;

class ResourceController extends Controller
{
    public function users(): JsonResponse        { return response()->json(AppUser::orderBy('sortOrder')->get()); }
    public function communities(): JsonResponse  { return response()->json(Community::orderBy('sortOrder')->get()); }
    public function teams(): JsonResponse        { return response()->json(Team::orderBy('sortOrder')->get()); }
    public function periods(): JsonResponse      { return response()->json(Period::orderBy('sortOrder')->get()); }
    public function kpis(): JsonResponse         { return response()->json(KpiDefinition::orderBy('sortOrder')->get()); }
    public function actionPlans(): JsonResponse  { return response()->json(ActionPlan::orderBy('sortOrder')->get()); }
    public function audit(): JsonResponse        { return response()->json(AuditLog::orderByDesc('timestamp')->limit(500)->get()); }
    public function notifications(): JsonResponse{ return response()->json(AppNotification::orderByDesc('timestamp')->limit(200)->get()); }
    public function health(): JsonResponse       {
        return response()->json(['ok' => true, 'engine' => config('database.default'), 'schemaVersion' => 1]);
    }
}
