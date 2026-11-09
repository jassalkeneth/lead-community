<?php

use App\Http\Controllers\ActionPlanController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\CommunityController;
use App\Http\Controllers\CompatController;
use App\Http\Controllers\KpiDefinitionController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PeriodController;
use App\Http\Controllers\ResourceController;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [ResourceController::class, 'health']);

/*
 * Compat routes MUST come first so their specific paths (e.g. /communities/teams,
 * /audit/notifications) win over parameterized REST routes like
 * /communities/{community} and /audit/{id}.
 */
Route::get('/auth/me',               [CompatController::class, 'me']);
Route::get('/auth/users',            [CompatController::class, 'users']);
Route::post('/auth/switch',          [CompatController::class, 'switch']);

Route::get('/communities/teams',     [CompatController::class, 'teams']);
Route::get('/communities',           [CompatController::class, 'communities']);

Route::get('/periods',               [CompatController::class, 'periods']);

Route::get('/scorecards',            [CompatController::class, 'scorecards']);
Route::post('/scorecards/submit',    [CompatController::class, 'submitScorecard']);
Route::post('/scorecards/{id}/workflow', [CompatController::class, 'workflow']);

Route::get('/actions',               [CompatController::class, 'actions']);
Route::post('/actions',              [CompatController::class, 'createAction']);
Route::post('/actions/{id}/approve', [CompatController::class, 'approveAction']);
Route::post('/actions/{id}/update',  [CompatController::class, 'updateAction']);

Route::get('/audit/notifications',             [CompatController::class, 'notifications']);
Route::post('/audit/notifications/{id}/read',  [CompatController::class, 'markNotificationRead']);
Route::get('/audit',                           [CompatController::class, 'auditLogs']);

// ---------- REST routes (used by src/lib/laravelApi.ts and admin tools) ----------
Route::apiResource('users',       UserController::class);
Route::apiResource('teams',       TeamController::class);
Route::apiResource('kpis',        KpiDefinitionController::class);

Route::apiResource('submissions', SubmissionController::class)->except(['update']);
Route::put('/submissions/{submission}',    [SubmissionController::class, 'update']);
Route::patch('/submissions/{submission}',  [SubmissionController::class, 'update']);
Route::post('/submissions/{submission}/{action}', [SubmissionController::class, 'transition'])
    ->where('action', 'submit|startReview|requestChanges|forward|approve|lock');

Route::apiResource('action-plans', ActionPlanController::class);
Route::post('/action-plans/{actionPlan}/updates',  [ActionPlanController::class, 'addUpdate']);
Route::post('/action-plans/{actionPlan}/approve',  [ActionPlanController::class, 'approve']);

Route::get('/notifications',                [NotificationController::class, 'index']);
Route::post('/notifications',               [NotificationController::class, 'store']);
Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
Route::patch('/notifications/{id}/read',    [NotificationController::class, 'markRead']);
Route::delete('/notifications/{id}',        [NotificationController::class, 'destroy']);

// Communities / periods writes (keep typed controllers; reads are covered by compat above).
Route::post('/communities',              [CommunityController::class, 'store']);
Route::get('/communities/{community}',   [CommunityController::class, 'show']);
Route::put('/communities/{community}',   [CommunityController::class, 'update']);
Route::patch('/communities/{community}', [CommunityController::class, 'update']);
Route::delete('/communities/{community}',[CommunityController::class, 'destroy']);

Route::post('/periods',              [PeriodController::class, 'store']);
Route::get('/periods/{period}',      [PeriodController::class, 'show']);
Route::put('/periods/{period}',      [PeriodController::class, 'update']);
Route::patch('/periods/{period}',    [PeriodController::class, 'update']);
Route::delete('/periods/{period}',   [PeriodController::class, 'destroy']);
Route::post('/periods/{period}/set-current', [PeriodController::class, 'setCurrent']);

Route::get('/audit/{id}',  [AuditController::class, 'show']);
