<?php

use Illuminate\Support\Facades\Route;
use Zaengit\PageBuilder\Http\Controllers\BlockAssetController;
use Zaengit\PageBuilder\Http\Controllers\BlockController;
use Zaengit\PageBuilder\Http\Controllers\PreviewController;

$middleware = config('page-builder.middleware', []);
$assetMiddleware = config('page-builder.asset_middleware', []);

Route::middleware(is_array($middleware) ? $middleware : [$middleware])->group(function (): void {
    Route::prefix((string) config('page-builder.api_prefix', 'api/page-builder'))->group(function (): void {
        Route::get('/blocks', [BlockController::class, 'index']);
        Route::post('/render-block', [BlockController::class, 'render']);
        Route::post('/render-page', [BlockController::class, 'renderPage']);
    });

    Route::get('/'.trim((string) config('page-builder.route_prefix', 'page-builder'), '/').'/preview', [PreviewController::class, 'show'])
        ->name('page-builder.preview');
});

Route::middleware(is_array($assetMiddleware) ? $assetMiddleware : [$assetMiddleware])
    ->get('/block-assets/{namespace}/{block}/{asset}', [BlockAssetController::class, 'show'])
    ->where([
        'namespace'=>'[a-z0-9-]+',
        'block'=>'[a-z0-9-]+',
        'asset'=>'[A-Za-z0-9._-]+',
    ]);
