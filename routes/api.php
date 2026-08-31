<?php

use App\Http\Controllers\BlockController;
use App\Http\Controllers\PageController;
use Illuminate\Support\Facades\Route;

Route::get('/blocks', [BlockController::class, 'index']);
Route::post('/render-block', [BlockController::class, 'render']);
Route::get('/pages/{page}', [PageController::class, 'show']);
Route::post('/pages', [PageController::class, 'store']);
Route::put('/pages/{page}', [PageController::class, 'update']);
Route::post('/pages/{page}/publish', [PageController::class, 'publish']);
