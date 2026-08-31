<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class Product extends Model
{
    protected $fillable = ['name', 'slug', 'price', 'category', 'image_url'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2'];
    }
}
