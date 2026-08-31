<?php

namespace Tests\Feature;

use App\Blocks\BlockRenderer;
use App\Blocks\PageRenderer;
use App\Models\Page;
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

    public function test_draft_can_be_published(): void
    {
        $page = Page::create(['title'=>'Home','slug'=>'home','status'=>'draft','draft_content'=>['blocks'=>[]]]);
        $this->postJson("/api/pages/{$page->id}/publish")->assertOk();
        $page->refresh();
        $this->assertSame('published', $page->status);
        $this->assertSame($page->draft_content, $page->published_content);
    }
}
