<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Blade;
use Tests\TestCase;

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
}
