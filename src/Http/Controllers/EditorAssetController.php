<?php

namespace Zaengit\PageBuilder\Http\Controllers;

use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class EditorAssetController
{
    public function show(string $asset): BinaryFileResponse|Response
    {
        $allowed = array_filter([
            (string) config('page-builder.editor_js', 'page-builder.js'),
            (string) config('page-builder.editor_css', 'page-builder.css'),
        ]);

        if (!in_array($asset, $allowed, true)) abort(404);

        $root = realpath((string) config('page-builder.editor_dist_path'));
        if ($root === false) return $this->missingBuildResponse();

        $path = realpath($root.DIRECTORY_SEPARATOR.$asset);
        if ($path === false || !str_starts_with($path, $root.DIRECTORY_SEPARATOR)) return $this->missingBuildResponse();

        $mime = str_ends_with($asset, '.css') ? 'text/css; charset=UTF-8' : 'text/javascript; charset=UTF-8';

        return response()->file($path, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function missingBuildResponse(): Response
    {
        return response('Page Builder editor assets have not been built.', 503)
            ->header('Content-Type', 'text/plain; charset=UTF-8')
            ->header('Cache-Control', 'no-store')
            ->header('X-Content-Type-Options', 'nosniff');
    }
}
