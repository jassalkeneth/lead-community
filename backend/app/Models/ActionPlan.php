<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActionPlan extends Model
{
    protected $table = 'action_plans';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];
    protected $casts = ['updates' => 'array', 'aiGenerated' => 'boolean', 'proposedDeadline' => 'date'];
}
