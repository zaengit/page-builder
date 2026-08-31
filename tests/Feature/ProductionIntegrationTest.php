<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Blade;
use RuntimeException;
use Tests\TestCase;
use Zaengit\PageBuilder\Blocks\BlockManifestLoader;
use Zaengit\PageBuilder\Blocks\BlockRegistry;

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
        if (!is_dir($directory)) return;
        foreach (array_diff(scandir($directory) ?: [], ['.', '..']) as $entry) {
            $path = $directory.'/'.$entry;
            if (is_dir($path)) $this->removeDirectory($path); else @unlink($path);
        }
        @rmdir($directory);
    }
}
