<?php

namespace Tests\Feature;

use Tests\TestCase;

final class HttpHardeningTest extends TestCase
{
    public function test_block_asset_urls_are_content_versioned(): void
    {
        foreach (['style.css', 'frontend.js'] as $asset) {
            $path = $this->blocksPath('carousel/'.$asset);
            $hash = hash_file('sha256', $path);
            $this->assertIsString($hash);
            $version = substr($hash, 0, 12);

            $response = $this->get('/block-assets/core/carousel/'.$asset.'?v='.$version);
            $response->assertOk();
            $response->assertHeader('ETag', '"'.$hash.'"');
        }
    }

    public function test_versioned_block_assets_are_immutable_and_support_etag_revalidation(): void
    {
        $path = $this->blocksPath('carousel/style.css');
        $hash = hash_file('sha256', $path);
        $this->assertIsString($hash);
        $version = substr($hash, 0, 12);

        $response = $this->get('/block-assets/core/carousel/style.css?v='.$version);
        $response->assertOk();
        $cacheControl = (string) $response->headers->get('Cache-Control');
        $this->assertStringContainsString('public', $cacheControl);
        $this->assertStringContainsString('max-age=31536000', $cacheControl);
        $this->assertStringContainsString('immutable', $cacheControl);
        $response->assertHeader('ETag', '"'.$hash.'"');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->withHeader('If-None-Match', '"'.$hash.'"')
            ->get('/block-assets/core/carousel/style.css?v='.$version)
            ->assertStatus(304);
    }

    public function test_unversioned_block_assets_keep_short_cache_policy(): void
    {
        $response = $this->get('/block-assets/core/carousel/style.css');
        $response->assertOk();
        $cacheControl = (string) $response->headers->get('Cache-Control');
        $this->assertStringContainsString('public', $cacheControl);
        $this->assertStringContainsString('max-age=3600', $cacheControl);
        $this->assertStringNotContainsString('immutable', $cacheControl);
    }

    public function test_preview_is_same_origin_frame_only_and_never_cached(): void
    {
        $response = $this->get(route('page-builder.preview'));

        $response->assertOk();
        $cacheControl = (string) $response->headers->get('Cache-Control');
        $this->assertStringContainsString('no-store', $cacheControl);
        $this->assertStringContainsString('private', $cacheControl);
        $response->assertHeader('Content-Security-Policy', "frame-ancestors 'self'");
        $response->assertHeader('Referrer-Policy', 'no-referrer');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    }
}
