<?php

use Illuminate\Support\Facades\Route;
use Zaengit\PageBuilder\Http\Controllers\BlockAssetController;
use Zaengit\PageBuilder\Http\Controllers\BlockController;
use Zaengit\PageBuilder\Http\Controllers\EditorAssetController;
use Zaengit\PageBuilder\Http\Controllers\MediaController;
use Zaengit\PageBuilder\Http\Controllers\PreviewController;

$middleware = config('page-builder.middleware', []);
$assetMiddleware = config('page-builder.asset_middleware', []);
$routePrefix = trim((string) config('page-builder.route_prefix', 'page-builder'), '/');

Route::middleware(is_array($middleware) ? $middleware : [$middleware])->group(function () use ($routePrefix): void {
    Route::prefix((string) config('page-builder.api_prefix', 'api/page-builder'))->group(function (): void {
        Route::get('/blocks', [BlockController::class, 'index'])->name('page-builder.blocks');
        Route::post('/render-block', [BlockController::class, 'render'])->name('page-builder.render-block');
        Route::post('/render-page', [BlockController::class, 'renderPage'])->name('page-builder.render-page');
        Route::get('/media', [MediaController::class, 'index'])->name('page-builder.media.index');
        Route::post('/media', [MediaController::class, 'store'])->name('page-builder.media.store');
        Route::delete('/media/{media}', [MediaController::class, 'destroy'])
            ->where('media', '[A-Za-z0-9._-]+')
            ->name('page-builder.media.destroy');
    });

    Route::get('/'.$routePrefix.'/preview', [PreviewController::class, 'show'])
        ->name('page-builder.preview');
});

Route::middleware(is_array($assetMiddleware) ? $assetMiddleware : [$assetMiddleware])->group(function () use ($routePrefix): void {
    Route::get('/'.$routePrefix.'/assets/{asset}', [EditorAssetController::class, 'show'])
        ->where('asset', '[A-Za-z0-9._-]+')
        ->name('page-builder.editor-asset');

    Route::get('/'.$routePrefix.'/media/{media}', [MediaController::class, 'show'])
        ->where('media', '[A-Za-z0-9._-]+')
        ->name('page-builder.media.show');

    Route::get('/block-assets/{namespace}/{block}/{asset}', [BlockAssetController::class, 'show'])
        ->where([
            'namespace' => '[a-z0-9-]+',
            'block' => '[a-z0-9-]+',
            'asset' => '[A-Za-z0-9._-]+',
        ]);
});
