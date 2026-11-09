<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Community extends Model
{
    protected $table = 'communities';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];

    public function teams() { return $this->hasMany(Team::class, 'communityId'); }
}
