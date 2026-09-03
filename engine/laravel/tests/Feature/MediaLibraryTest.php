<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class MediaLibraryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        config()->set('page-builder.media.disk', 'public');
        config()->set('page-builder.media.directory', 'page-builder/media');
        config()->set('page-builder.media.max_upload_kb', 2048);
        config()->set('page-builder.media.max_items', 250);
    }

    public function test_media_library_can_upload_list_search_serve_and_delete_images(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true);
        self::assertIsString($png);

        $upload = UploadedFile::fake()->createWithContent('Homepage Hero.png', $png);
        $stored = $this->postJson(route('page-builder.media.store'), ['file' => $upload])
            ->assertCreated()
            ->assertJsonPath('data.mimeType', 'image/png')
            ->json('data');

        self::assertIsArray($stored);
        self::assertStringContainsString('homepage-hero-', (string) $stored['name']);
        Storage::disk('public')->assertExists('page-builder/media/'.$stored['id']);

        $this->getJson(route('page-builder.media.index'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $stored['id']);

        $this->getJson(route('page-builder.media.index', ['q' => 'homepage']))
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson(route('page-builder.media.index', ['q' => 'missing']))
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->get(route('page-builder.media.show', ['media' => $stored['id']]))
            ->assertOk()
            ->assertHeader('content-type', 'image/png');

        $this->deleteJson(route('page-builder.media.destroy', ['media' => $stored['id']]))
            ->assertOk()
            ->assertJson(['deleted' => true]);

        Storage::disk('public')->assertMissing('page-builder/media/'.$stored['id']);
    }

    public function test_media_library_rejects_non_images(): void
    {
        $file = UploadedFile::fake()->createWithContent('payload.txt', 'not an image');

        $this->postJson(route('page-builder.media.store'), ['file' => $file])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');
    }
}
