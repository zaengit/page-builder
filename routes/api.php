<?php

use App\Http\Controllers\BlockController;
use Illuminate\Support\Facades\Route;

Route::prefix('page-builder')->group(function (): void {
    Route::get('/blocks', [BlockController::class, 'index']);
    Route::post('/render-block', [BlockController::class, 'render']);
    Route::post('/render-page', [BlockController::class, 'renderPage']);
});
