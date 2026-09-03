<?php

namespace Tests\Feature;

use Tests\TestCase;
use Zaengit\PageBuilder\Blocks\BlockRenderer;
use Zaengit\PageBuilder\Blocks\PageRenderer;

class PageBuilderTest extends TestCase
{
    public function test_heading_is_escaped_and_defaults_are_applied(): void
    {
        $html = app(BlockRenderer::class)->render([
            'id'=>'h1',
            'type'=>'core/heading',
            'attrs'=>['text'=>'<script>alert(1)</script>'],
        ], true);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
        $this->assertStringContainsString('<h2', $html);
    }

    public function test_nested_container_renders_child_blocks_recursively(): void
    {
        $html = app(PageRenderer::class)->render(['blocks'=>[[
            'id'=>'container-1','type'=>'core/container','attrs'=>['maxWidth'=>'1200px','padding'=>'24px'],
            'children'=>[['id'=>'heading-1','type'=>'core/heading','attrs'=>['text'=>'Nested heading','level'=>2,'alignment'=>'left']]],
        ]]], true);
        $this->assertStringContainsString('data-block-id="container-1"', $html);
        $this->assertStringContainsString('Nested heading', $html);
    }

    public function test_builder_api_is_available_without_authentication(): void
    {
        $this->getJson('/api/page-builder/blocks')->assertOk()->assertJsonFragment(['name'=>'core/heading']);
        $this->postJson('/api/page-builder/render-page', ['blocks'=>[]])->assertOk()->assertJsonStructure(['html','assets']);
    }

    public function test_render_page_endpoint_accepts_nested_page_json(): void
    {
        $this->postJson('/api/page-builder/render-page', ['blocks'=>[[
            'id'=>'columns-1','type'=>'core/columns','attrs'=>['columns'=>2,'gap'=>'24px'],'children'=>[],
        ]]])->assertOk()->assertJsonStructure(['html','assets']);
    }

    public function test_recursive_validator_rejects_unknown_block_type(): void
    {
        $this->postJson('/api/page-builder/render-page', ['blocks'=>[['id'=>'bad-1','type'=>'custom/missing','attrs'=>[]]]])
            ->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.type']);
    }

    public function test_recursive_validator_rejects_duplicate_block_ids(): void
    {
        $this->postJson('/api/page-builder/render-page', ['blocks'=>[
            ['id'=>'same','type'=>'core/heading','attrs'=>[]],
            ['id'=>'container','type'=>'core/container','attrs'=>[],'children'=>[['id'=>'same','type'=>'core/heading','attrs'=>[]]]],
        ]])->assertUnprocessable()->assertJsonValidationErrors(['blocks.1.children.0.id']);
    }

    public function test_recursive_validator_rejects_invalid_attribute_types_and_unknown_attributes(): void
    {
        $this->postJson('/api/page-builder/render-page', ['blocks'=>[['id'=>'heading-1','type'=>'core/heading','attrs'=>['level'=>'two']]]])
            ->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.attrs.level']);
        $this->postJson('/api/page-builder/render-page', ['blocks'=>[['id'=>'heading-2','type'=>'core/heading','attrs'=>['unknown'=>'value']]]])
            ->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.attrs.unknown']);
    }

    public function test_recursive_validator_rejects_children_on_non_container_block(): void
    {
        $this->postJson('/api/page-builder/render-page', ['blocks'=>[[
            'id'=>'heading-parent','type'=>'core/heading','attrs'=>[],
            'children'=>[['id'=>'heading-child','type'=>'core/heading','attrs'=>[]]],
        ]]])->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.children']);
    }

    public function test_carousel_is_ssr_first_and_assets_are_lazy_and_deduplicated(): void
    {
        $renderer = app(PageRenderer::class);
        $html = $renderer->render(['blocks'=>[
            ['id'=>'carousel-a','type'=>'core/carousel','attrs'=>['items'=>[['title'=>'Alpha','description'=>'First','image'=>'']]]],
            ['id'=>'carousel-b','type'=>'core/carousel','attrs'=>['items'=>[['title'=>'Beta','description'=>'Second','image'=>'']]]],
        ]], false);
        $this->assertStringContainsString('Alpha', $html);
        $this->assertStringContainsString('Beta', $html);
        $this->assertCount(1, $renderer->assets()['css']);
        $this->assertCount(1, $renderer->assets()['js']);
        $this->assertMatchesRegularExpression('#^/block-assets/core/carousel/style\.css\?v=[a-f0-9]{12}$#', $renderer->assets()['css'][0]);
        $this->assertMatchesRegularExpression('#^/block-assets/core/carousel/frontend\.js\?v=[a-f0-9]{12}$#', $renderer->assets()['js'][0]);
        $renderer->render(['blocks'=>[['id'=>'heading-only','type'=>'core/heading','attrs'=>[]]]], false);
        $this->assertSame(['css'=>[], 'js'=>[]], $renderer->assets());
    }

    public function test_only_manifest_declared_assets_can_be_served(): void
    {
        $this->get('/block-assets/core/carousel/style.css')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->get('/block-assets/core/carousel/frontend.js')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->get('/block-assets/core/carousel/template.blade.php')->assertNotFound();
    }

    public function test_preview_shell_is_builder_only_and_publicly_available(): void
    {
        $this->get('/page-builder/preview')->assertOk()->assertSee('Page Builder Preview')->assertSee('pb-canvas');
    }
}
