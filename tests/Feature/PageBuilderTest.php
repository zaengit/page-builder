<?php

namespace Tests\Feature;

use App\Blocks\BlockRenderer;
use App\Blocks\PageRenderer;
use App\Models\Page;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_heading_is_escaped_and_defaults_are_applied(): void
    {
        $html = app(BlockRenderer::class)->render(['id'=>'h1','type'=>'core/heading','attrs'=>['text'=>'<script>alert(1)</script>']], true);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
        $this->assertStringContainsString('<h2', $html);
    }

    public function test_nested_container_renders_child_blocks_recursively(): void
    {
        $html = app(PageRenderer::class)->render(['blocks'=>[[
            'id'=>'container-1',
            'type'=>'core/container',
            'attrs'=>['maxWidth'=>'1200px','padding'=>'24px'],
            'children'=>[[
                'id'=>'heading-1',
                'type'=>'core/heading',
                'attrs'=>['text'=>'Nested heading','level'=>2,'alignment'=>'left'],
            ]],
        ]]], true);

        $this->assertStringContainsString('data-block-id="container-1"', $html);
        $this->assertStringContainsString('data-block-id="heading-1"', $html);
        $this->assertStringContainsString('Nested heading', $html);
    }

    public function test_render_page_endpoint_accepts_nested_page_json(): void
    {
        $this->postJson('/api/render-page', ['blocks'=>[[
            'id'=>'columns-1',
            'type'=>'core/columns',
            'attrs'=>['columns'=>2,'gap'=>'24px'],
            'children'=>[],
        ]]])->assertOk()->assertJsonStructure(['html','assets']);
    }

    public function test_product_grid_resolves_runtime_data_from_provider(): void
    {
        Product::create(['name'=>'Shirt','slug'=>'shirt','price'=>199000,'category'=>'apparel']);
        Product::create(['name'=>'Shoes','slug'=>'shoes','price'=>399000,'category'=>'footwear']);

        $html = app(BlockRenderer::class)->render([
            'id'=>'products-1',
            'type'=>'commerce/product-grid',
            'attrs'=>['title'=>'Apparel','category'=>'apparel','limit'=>8,'columns'=>4],
        ], true);

        $this->assertStringContainsString('Apparel', $html);
        $this->assertStringContainsString('Shirt', $html);
        $this->assertStringNotContainsString('Shoes', $html);
    }

    public function test_product_grid_limit_is_enforced_by_provider(): void
    {
        Product::create(['name'=>'One','slug'=>'one','price'=>100,'category'=>'test']);
        Product::create(['name'=>'Two','slug'=>'two','price'=>200,'category'=>'test']);

        $html = app(BlockRenderer::class)->render([
            'id'=>'products-2',
            'type'=>'commerce/product-grid',
            'attrs'=>['category'=>'test','limit'=>1],
        ], true);

        $this->assertSame(1, substr_count($html, 'class="product-card"'));
    }

    public function test_assets_are_collected_only_for_used_blocks_and_deduplicated(): void
    {
        $renderer = app(PageRenderer::class);
        $renderer->render(['blocks'=>[
            ['id'=>'products-a','type'=>'commerce/product-grid','attrs'=>[]],
            ['id'=>'heading','type'=>'core/heading','attrs'=>[]],
            ['id'=>'products-b','type'=>'commerce/product-grid','attrs'=>[]],
        ]], true);

        $assets = $renderer->assets();
        $this->assertSame(['/block-assets/commerce/product-grid/style.css'], $assets['css']);
        $this->assertSame([], $assets['js']);
    }

    public function test_only_manifest_declared_assets_can_be_served(): void
    {
        $this->get('/block-assets/commerce/product-grid/style.css')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->get('/block-assets/commerce/product-grid/template.blade.php')->assertNotFound();
    }

    public function test_draft_can_be_published(): void
    {
        $page = Page::create(['title'=>'Home','slug'=>'home','status'=>'draft','draft_content'=>['blocks'=>[]]]);
        $this->postJson("/api/pages/{$page->id}/publish")->assertOk();
        $page->refresh();
        $this->assertSame('published', $page->status);
        $this->assertSame($page->draft_content, $page->published_content);
    }
}
