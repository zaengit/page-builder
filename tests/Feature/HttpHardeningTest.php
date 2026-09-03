<?php

namespace Tests\Feature;

use Tests\TestCase;
use Zaengit\PageBuilder\Blocks\PageRenderer;

final class HttpHardeningTest extends TestCase
{
    public function test_block_asset_urls_are_content_versioned(): void
    {
        $renderer = app(PageRenderer::class);
        $renderer->render(['blocks' => [[
            'id' => 'carousel-1',
            'type' => 'core/carousel',
            'attrs' => [],
        ]]]);

        $assets = $renderer->assets();

        $this->assertMatchesRegularExpression('#^/block-assets/core/carousel/style\.css\?v=[a-f0-9]{12}$#', $assets['css'][0]);
        $this->assertMatchesRegularExpression('#^/block-assets/core/carousel/frontend\.js\?v=[a-f0-9]{12}$#', $assets['js'][0]);
    }

    public function test_versioned_block_assets_are_immutable_and_support_etag_revalidation(): void
    {
        $path = base_path('blocks/carousel/style.css');
        $hash = hash_file('sha256', $path);
        $this->assertIsString($hash);
        $version = substr($hash, 0, 12);

        $response = $this->get('/block-assets/core/carousel/style.css?v='.$version);
        $response->assertOk();
        $response->assertHeader('Cache-Control', 'public, max-age=31536000, immutable');
        $response->assertHeader('ETag', '"'.$hash.'"');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->withHeader('If-None-Match', '"'.$hash.'"')
            ->get('/block-assets/core/carousel/style.css?v='.$version)
            ->assertStatus(304);
    }

    public function test_unversioned_block_assets_keep_short_cache_policy(): void
    {
        $this->get('/block-assets/core/carousel/style.css')
            ->assertOk()
            ->assertHeader('Cache-Control', 'public, max-age=3600');
    }

    public function test_preview_is_same_origin_frame_only_and_never_cached(): void
    {
        $response = $this->get(route('page-builder.preview'));

        $response->assertOk();
        $response->assertHeader('Cache-Control', 'no-store, private');
        $response->assertHeader('Content-Security-Policy', "frame-ancestors 'self'");
        $response->assertHeader('Referrer-Policy', 'no-referrer');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    }
}
