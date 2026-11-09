<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Submission extends Model
{
    protected $table = 'submissions';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];
    protected $casts = [
        'rawInputs' => 'array',
        'results' => 'array',
        'isProvisional' => 'boolean',
        'submittedAt' => 'datetime',
        'reviewedAt' => 'datetime',
        'approvedAt' => 'datetime',
        'lockedAt' => 'datetime',
    ];

    public const STATUSES = [
        'DRAFT', 'SUBMITTED', 'COMMUNITY_HEAD_REVIEW',
        'CHANGES_REQUESTED', 'OPERATIONS_MANAGER_REVIEW',
        'APPROVED', 'LOCKED',
    ];

    public function period() { return $this->belongsTo(Period::class, 'periodId'); }
    public function community() { return $this->belongsTo(Community::class, 'communityId'); }
    public function team() { return $this->belongsTo(Team::class, 'teamId'); }
    public function actionPlans() { return $this->hasMany(ActionPlan::class, 'submissionId'); }
}
