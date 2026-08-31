<?php

use App\Blocks\PageRenderer;
use App\Http\Controllers\BlockAssetController;
use App\Http\Controllers\PreviewController;
use App\Models\Page;
use Illuminate\Support\Facades\Route;

Route::get('/preview/{page}', [PreviewController::class, 'show'])
    ->middleware('auth')
    ->name('preview');

Route::get('/block-assets/{namespace}/{block}/{asset}', [BlockAssetController::class, 'show'])
    ->where([
        'namespace' => '[a-z0-9-]+',
        'block' => '[a-z0-9-]+',
        'asset' => '[A-Za-z0-9._-]+',
    ]);

Route::get('/{slug}', function (string $slug, PageRenderer $renderer) {
    $page = Page::query()->where('slug', $slug)->where('status', 'published')->firstOrFail();
    $content = $renderer->render($page->published_content ?? ['blocks' => []], false);

    return response()->view('page', [
        'title' => $page->title,
        'content' => $content,
        'assets' => $renderer->assets(),
        'preview' => false,
    ]);
})->where('slug', '^(?!api|preview|block-assets|up).+$');
