<?php

use App\Http\Controllers\BlockAssetController;
use App\Http\Controllers\PreviewController;
use Illuminate\Support\Facades\Route;

Route::get('/page-builder/preview', [PreviewController::class, 'show'])->name('page-builder.preview');

Route::get('/block-assets/{namespace}/{block}/{asset}', [BlockAssetController::class, 'show'])
    ->where([
        'namespace' => '[a-z0-9-]+',
        'block' => '[a-z0-9-]+',
        'asset' => '[A-Za-z0-9._-]+',
    ]);
