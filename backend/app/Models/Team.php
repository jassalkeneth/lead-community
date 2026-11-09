<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Team extends Model
{
    protected $table = 'teams';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];

    public function community() { return $this->belongsTo(Community::class, 'communityId'); }
}
