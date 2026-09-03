<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Blade;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Tests\TestCase;
use Zaengit\PageBuilder\Blocks\BlockManifestLoader;
use Zaengit\PageBuilder\Blocks\BlockMigrationRegistry;
use Zaengit\PageBuilder\Blocks\BlockRegistry;
use Zaengit\PageBuilder\Blocks\PageContentValidator;

class ProductionIntegrationTest extends TestCase
{
    public function test_named_runtime_routes_are_available(): void
    {
        $this->assertSame(url('/api/page-builder/blocks'), route('page-builder.blocks'));
        $this->assertSame(url('/api/page-builder/render-page'), route('page-builder.render-page'));
        $this->assertSame(url('/page-builder/preview'), route('page-builder.preview'));
    }

    public function test_editor_component_contains_runtime_contract_and_hidden_input(): void
    {
        $html = Blade::render('<x-page-builder::editor name="layout" :content="$content" />', [
            'content' => ['blocks' => [['id' => 'h1', 'type' => 'core/heading', 'attrs' => ['text' => "O'Reilly"]]]],
        ]);

        $this->assertStringContainsString('data-page-builder-root', $html);
        $this->assertStringContainsString('data-page-builder-runtime', $html);
        $this->assertStringContainsString('name="layout"', $html);
        $this->assertStringContainsString('O&#039;Reilly', $html);
    }

    public function test_unbuilt_editor_asset_fails_explicitly_and_unknown_assets_are_hidden(): void
    {
        $this->get('/page-builder/assets/page-builder.js')->assertStatus(503)->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->get('/page-builder/assets/secret.php')->assertNotFound();
    }

    public function test_server_rejects_children_not_allowed_by_parent_manifest(): void
    {
        $root = $this->makeBlockRoot([
            'parent' => [
                'name' => 'test/parent',
                'title' => 'Parent',
                'category' => 'test',
                'attributes' => [],
                'supports' => ['children' => true, 'allowedChildren' => ['test/allowed']],
            ],
            'allowed' => ['name' => 'test/allowed', 'title' => 'Allowed', 'category' => 'test', 'attributes' => []],
            'forbidden' => ['name' => 'test/forbidden', 'title' => 'Forbidden', 'category' => 'test', 'attributes' => []],
        ]);

        config()->set('page-builder.block_paths', [$root]);
        app(BlockRegistry::class)->clear();

        try {
            $this->postJson('/api/page-builder/render-page', ['blocks' => [[
                'id' => 'parent', 'type' => 'test/parent', 'attrs' => [], 'children' => [[
                    'id' => 'forbidden', 'type' => 'test/forbidden', 'attrs' => [],
                ]],
            ]]])->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.children.0.type']);
        } finally {
            $this->removeDirectory($root);
        }
    }

    public function test_manifest_rejects_allowed_children_without_children_support(): void
    {
        $root = $this->makeBlockRoot([
            'broken' => [
                'name' => 'test/broken',
                'title' => 'Broken',
                'category' => 'test',
                'attributes' => [],
                'supports' => ['allowedChildren' => ['test/child']],
            ],
        ]);

        config()->set('page-builder.block_paths', [$root]);

        try {
            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessage('allowedChildren requires children support');
            app(BlockManifestLoader::class)->loadAll();
        } finally {
            $this->removeDirectory($root);
        }
    }

    public function test_manifest_rejects_empty_custom_control_name(): void
    {
        $root = $this->makeBlockRoot([
            'broken-control' => [
                'name' => 'test/broken-control',
                'title' => 'Broken control',
                'category' => 'test',
                'attributes' => [
                    'color' => ['type' => 'string', 'control' => ''],
                ],
            ],
        ]);

        config()->set('page-builder.block_paths', [$root]);

        try {
            $this->expectException(RuntimeException::class);
            $this->expectExceptionMessage('Invalid control for test/broken-control.color');
            app(BlockManifestLoader::class)->loadAll();
        } finally {
            $this->removeDirectory($root);
        }
    }

    public function test_old_block_attrs_are_migrated_before_validation(): void
    {
        $root = $this->makeBlockRoot([
            'versioned' => [
                'name' => 'test/versioned', 'title' => 'Versioned', 'category' => 'test', 'version' => 2,
                'attributes' => ['text' => ['type' => 'string', 'default' => '']],
            ],
        ]);
        config()->set('page-builder.block_paths', [$root]);
        app(BlockRegistry::class)->clear();
        app(BlockMigrationRegistry::class)->register('test/versioned', 1, fn (array $attrs): array => ['text' => (string) ($attrs['legacyText'] ?? '')]);

        try {
            $content = app(PageContentValidator::class)->validate(['blocks' => [[
                'id' => 'legacy', 'type' => 'test/versioned', 'version' => 1, 'attrs' => ['legacyText' => 'Migrated'],
            ]]]);
            $this->assertSame(2, $content['blocks'][0]['version']);
            $this->assertSame(['text' => 'Migrated'], $content['blocks'][0]['attrs']);
        } finally {
            $this->removeDirectory($root);
        }
    }

    public function test_missing_block_migration_is_rejected(): void
    {
        $root = $this->makeBlockRoot([
            'unmigrated' => [
                'name' => 'test/unmigrated', 'title' => 'Unmigrated', 'category' => 'test', 'version' => 2,
                'attributes' => ['text' => ['type' => 'string', 'default' => '']],
            ],
        ]);
        config()->set('page-builder.block_paths', [$root]);
        app(BlockRegistry::class)->clear();

        try {
            app(PageContentValidator::class)->validate(['blocks' => [[
                'id' => 'legacy', 'type' => 'test/unmigrated', 'version' => 1, 'attrs' => ['text' => 'Old'],
            ]]]);
            $this->fail('Expected missing migration validation failure.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('blocks.0.version', $e->errors());
            $this->assertStringContainsString('Missing migration', $e->errors()['blocks.0.version'][0]);
        } finally {
            $this->removeDirectory($root);
        }
    }

    public function test_future_block_schema_version_is_rejected(): void
    {
        $this->expectException(ValidationException::class);
        app(PageContentValidator::class)->validate(['blocks' => [[
            'id' => 'future', 'type' => 'core/heading', 'version' => 99, 'attrs' => [],
        ]]]);
    }

    private function makeBlockRoot(array $blocks): string
    {
        $root = sys_get_temp_dir().'/page-builder-'.bin2hex(random_bytes(6));
        mkdir($root, 0777, true);

        foreach ($blocks as $directory => $manifest) {
            $path = $root.'/'.$directory;
            mkdir($path, 0777, true);
            file_put_contents($path.'/block.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
            file_put_contents($path.'/template.blade.php', '<div data-block-id="{{ $blockId }}">{!! $children !!}</div>');
        }

        return $root;
    }

    private function removeDirectory(string $directory): void
    {
        if (! is_dir($directory)) {
            return;
        }

        foreach (array_diff(scandir($directory) ?: [], ['.', '..']) as $entry) {
            $path = $directory.'/'.$entry;
            if (is_dir($path)) {
                $this->removeDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($directory);
    }
}
