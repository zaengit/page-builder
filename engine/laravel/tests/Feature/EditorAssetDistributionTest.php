<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Tests\TestCase;
use Zaengit\PageBuilder\Editor\EditorAssetManager;

class EditorAssetDistributionTest extends TestCase
{
    public function test_route_mode_remains_the_default(): void
    {
        config()->set('page-builder.editor_asset_mode', 'route');

        $manager = app(EditorAssetManager::class);

        $this->assertStringContainsString('/page-builder/assets/page-builder.js', $manager->jsUrl());
        $this->assertStringContainsString('/page-builder/assets/page-builder.css', (string) $manager->cssUrl());
    }

    public function test_public_mode_uses_static_urls_with_content_hashes(): void
    {
        $dist = $this->createDistFixture();
        config()->set('page-builder.editor_dist_path', $dist);
        config()->set('page-builder.editor_asset_mode', 'public');
        config()->set('page-builder.editor_public_path', 'vendor/page-builder');
        config()->set('page-builder.editor_public_url', 'https://cdn.example.com/page-builder');

        try {
            $manager = app(EditorAssetManager::class);

            $this->assertMatchesRegularExpression('#^https://cdn\.example\.com/page-builder/page-builder\.js\?v=[a-f0-9]{12}$#', $manager->jsUrl());
            $this->assertMatchesRegularExpression('#^https://cdn\.example\.com/page-builder/page-builder\.css\?v=[a-f0-9]{12}$#', (string) $manager->cssUrl());
        } finally {
            File::deleteDirectory($dist);
        }
    }

    public function test_dev_server_takes_precedence_over_asset_modes(): void
    {
        config()->set('page-builder.editor_asset_mode', 'public');
        config()->set('page-builder.editor_dev_server', 'http://127.0.0.1:5173/');

        $manager = app(EditorAssetManager::class);

        $this->assertSame('http://127.0.0.1:5173/src/main.tsx', $manager->jsUrl());
        $this->assertNull($manager->cssUrl());
    }

    public function test_publish_command_copies_built_assets_to_configured_public_path(): void
    {
        $dist = $this->createDistFixture();
        $relativePath = 'page-builder-test-assets';
        $destination = public_path($relativePath);
        File::deleteDirectory($destination);
        config()->set('page-builder.editor_dist_path', $dist);
        config()->set('page-builder.editor_public_path', $relativePath);

        try {
            $this->assertSame(0, Artisan::call('page-builder:publish-assets'));
            $this->assertFileExists($destination.'/page-builder.js');
            $this->assertFileExists($destination.'/page-builder.css');
        } finally {
            File::deleteDirectory($destination);
            File::deleteDirectory($dist);
        }
    }

    private function createDistFixture(): string
    {
        $directory = storage_path('framework/testing/page-builder-dist-'.uniqid());
        File::ensureDirectoryExists($directory);
        File::put($directory.'/page-builder.js', 'console.log("page-builder");');
        File::put($directory.'/page-builder.css', '[data-page-builder-root]{display:block}');

        return $directory;
    }
}
