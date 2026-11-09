<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppUser extends Model
{
    protected $table = 'app_users';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];
}
