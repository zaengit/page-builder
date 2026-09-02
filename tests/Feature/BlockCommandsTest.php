<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Tests\TestCase;
use Zaengit\PageBuilder\Blocks\BlockRegistry;

class BlockCommandsTest extends TestCase
{
    public function test_block_manifest_cache_can_be_warmed_and_cleared(): void
    {
        Cache::forget(BlockRegistry::CACHE_KEY);
        $this->assertSame(0, Artisan::call('blocks:cache'));
        $this->assertTrue(Cache::has(BlockRegistry::CACHE_KEY));
        $this->assertSame(0, Artisan::call('blocks:clear'));
        $this->assertFalse(Cache::has(BlockRegistry::CACHE_KEY));
    }

    public function test_block_manifests_can_be_validated_without_populating_cache(): void
    {
        Cache::forget(BlockRegistry::CACHE_KEY);

        $this->assertSame(0, Artisan::call('blocks:validate'));
        $this->assertFalse(Cache::has(BlockRegistry::CACHE_KEY));
        $this->assertStringContainsString('Validated', Artisan::output());
    }

    public function test_block_management_commands_are_registered(): void
    {
        $commands = Artisan::all();
        $this->assertArrayHasKey('blocks:validate', $commands);
        $this->assertArrayHasKey('blocks:cache', $commands);
        $this->assertArrayHasKey('blocks:clear', $commands);
        $this->assertArrayHasKey('blocks:list', $commands);
        $this->assertArrayHasKey('make:block', $commands);
    }

    public function test_make_block_creates_basic_scaffold_with_inline_editing(): void
    {
        $root = $this->temporaryBlockRoot();

        try {
            config()->set('page-builder.custom_blocks_path', $root);

            $this->assertSame(0, Artisan::call('make:block', ['name' => 'custom/hero']));

            $directory = $root.'/hero';
            $manifest = json_decode((string) File::get($directory.'/block.json'), true, 512, JSON_THROW_ON_ERROR);

            $this->assertSame('custom/hero', $manifest['name']);
            $this->assertSame(['text'], $manifest['supports']['inline']);
            $this->assertTrue($manifest['supports']['styles']);
            $this->assertFileExists($directory.'/template.blade.php');
            $this->assertFileExists($directory.'/style.css');
            $this->assertStringContainsString('data-pb-inline="text"', (string) File::get($directory.'/template.blade.php'));
        } finally {
            File::deleteDirectory($root);
        }
    }

    public function test_make_block_interactive_preset_creates_frontend_asset_contract(): void
    {
        $root = $this->temporaryBlockRoot();

        try {
            config()->set('page-builder.custom_blocks_path', $root);

            $this->assertSame(0, Artisan::call('make:block', [
                'name' => 'custom/carousel',
                '--preset' => 'interactive',
            ]));

            $directory = $root.'/carousel';
            $manifest = json_decode((string) File::get($directory.'/block.json'), true, 512, JSON_THROW_ON_ERROR);

            $this->assertSame(['style.css'], $manifest['assets']['css']);
            $this->assertSame(['frontend.js'], $manifest['assets']['js']);
            $this->assertArrayHasKey('visibleWhen', $manifest['attributes']['interval']);
            $this->assertFileExists($directory.'/frontend.js');
            $this->assertStringContainsString('dataset.pbReady', (string) File::get($directory.'/frontend.js'));
        } finally {
            File::deleteDirectory($root);
        }
    }

    public function test_make_block_container_preset_creates_named_slots(): void
    {
        $root = $this->temporaryBlockRoot();

        try {
            config()->set('page-builder.custom_blocks_path', $root);

            $this->assertSame(0, Artisan::call('make:block', [
                'name' => 'custom/section',
                '--preset' => 'container',
            ]));

            $manifest = json_decode((string) File::get($root.'/section/block.json'), true, 512, JSON_THROW_ON_ERROR);

            $this->assertTrue($manifest['supports']['children']);
            $this->assertSame(['header', 'body'], array_column($manifest['supports']['slots'], 'name'));
        } finally {
            File::deleteDirectory($root);
        }
    }

    public function test_make_block_rejects_unknown_preset_without_creating_directory(): void
    {
        $root = $this->temporaryBlockRoot();

        try {
            config()->set('page-builder.custom_blocks_path', $root);

            $this->assertSame(1, Artisan::call('make:block', [
                'name' => 'custom/broken',
                '--preset' => 'unknown',
            ]));
            $this->assertDirectoryDoesNotExist($root.'/broken');
            $this->assertStringContainsString('Unknown block preset', Artisan::output());
        } finally {
            File::deleteDirectory($root);
        }
    }

    private function temporaryBlockRoot(): string
    {
        $root = sys_get_temp_dir().'/page-builder-command-'.bin2hex(random_bytes(6));
        File::makeDirectory($root, 0755, true);

        return $root;
    }
}
