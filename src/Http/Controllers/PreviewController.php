<?php

namespace Zaengit\PageBuilder\Http\Controllers;

use Illuminate\Http\Response;

final class PreviewController
{
    public function show(): Response
    {
        return response()->view('page-builder::preview', [
            'title' => 'Page Builder Preview',
            'content' => '',
            'assets' => ['css' => [], 'js' => []],
            'preview' => true,
        ], 200, [
            'Cache-Control' => 'no-store, private',
            'Content-Security-Policy' => "frame-ancestors 'self'",
            'Referrer-Policy' => 'no-referrer',
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
        ]);
    }
}
