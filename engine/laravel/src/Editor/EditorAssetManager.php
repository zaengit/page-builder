<?php

namespace Zaengit\PageBuilder\Editor;

use Illuminate\Filesystem\Filesystem;
use RuntimeException;

final class EditorAssetManager
{
    public function __construct(private readonly Filesystem $files) {}

    public function jsUrl(): string
    {
        $devServer = rtrim((string) config('page-builder.editor_dev_server', ''), '/');

        if ($devServer !== '') {
            return $devServer.'/src/main.tsx';
        }

        return $this->url((string) config('page-builder.editor_js', 'page-builder.js'));
    }

    public function cssUrl(): ?string
    {
        if (rtrim((string) config('page-builder.editor_dev_server', ''), '/') !== '') {
            return null;
        }

        return $this->url((string) config('page-builder.editor_css', 'page-builder.css'));
    }

    public function publish(): string
    {
        $source = rtrim((string) config('page-builder.editor_dist_path'), DIRECTORY_SEPARATOR);
        $destination = public_path(trim((string) config('page-builder.editor_public_path', 'vendor/page-builder'), '/'));

        if (! $this->files->isDirectory($source)) {
            throw new RuntimeException("Page Builder editor dist directory does not exist: {$source}");
        }

        $this->files->ensureDirectoryExists($destination);

        if (! $this->files->copyDirectory($source, $destination)) {
            throw new RuntimeException("Unable to publish Page Builder editor assets to {$destination}");
        }

        return $destination;
    }

    private function url(string $assetName): string
    {
        if (preg_match('/^[A-Za-z0-9._-]+$/', $assetName) !== 1) {
            throw new RuntimeException("Invalid Page Builder editor asset name: {$assetName}");
        }

        if ((string) config('page-builder.editor_asset_mode', 'route') !== 'public') {
            return route('page-builder.editor-asset', ['asset' => $assetName]);
        }

        $baseUrl = rtrim((string) config('page-builder.editor_public_url', ''), '/');
        $path = trim((string) config('page-builder.editor_public_path', 'vendor/page-builder'), '/').'/'.$assetName;
        $url = $baseUrl !== '' ? $baseUrl.'/'.$assetName : asset($path);
        $source = rtrim((string) config('page-builder.editor_dist_path'), DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$assetName;

        if (! $this->files->isFile($source)) {
            return $url;
        }

        return $url.'?v='.substr(sha1_file($source) ?: '', 0, 12);
    }
}
