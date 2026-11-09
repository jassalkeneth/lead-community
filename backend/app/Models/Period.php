<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Period extends Model
{
    protected $table = 'periods';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];
    protected $casts = ['isCurrent' => 'boolean', 'startDate' => 'date', 'endDate' => 'date', 'submissionDeadline' => 'datetime'];
}
