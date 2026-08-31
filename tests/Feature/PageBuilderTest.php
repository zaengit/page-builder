<?php

namespace Tests\Feature;

use App\Blocks\BlockRenderer;
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

    public function test_draft_can_be_published(): void
    {
        $page = Page::create(['title'=>'Home','slug'=>'home','status'=>'draft','draft_content'=>['blocks'=>[]]]);
        $this->postJson("/api/pages/{$page->id}/publish")->assertOk();
        $page->refresh();
        $this->assertSame('published', $page->status);
        $this->assertSame($page->draft_content, $page->published_content);
    }
}
