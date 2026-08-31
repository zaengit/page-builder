<?php

use App\Blocks\PageRenderer;
use App\Http\Controllers\PreviewController;
use App\Models\Page;
use Illuminate\Support\Facades\Route;

Route::get('/preview/{page}', [PreviewController::class, 'show'])->name('preview');

Route::get('/{slug}', function (string $slug, PageRenderer $renderer) {
    $page = Page::query()->where('slug', $slug)->where('status', 'published')->firstOrFail();
    return response()->view('page', [
        'title' => $page->title,
        'content' => $renderer->render($page->published_content ?? ['blocks' => []], false),
        'preview' => false,
    ]);
})->where('slug', '^(?!api|preview|up).+$');
