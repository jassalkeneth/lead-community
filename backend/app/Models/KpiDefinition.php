<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KpiDefinition extends Model
{
    protected $table = 'kpi_definitions';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];
    protected $casts = ['isSystem' => 'boolean'];
}
