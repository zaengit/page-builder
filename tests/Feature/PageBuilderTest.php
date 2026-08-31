<?php

namespace Tests\Feature;

use App\Blocks\BlockRenderer;
use App\Blocks\PageRenderer;
use App\Models\Page;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageBuilderTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $email = 'owner@example.com'): User
    {
        return User::create(['name'=>'Owner','email'=>$email,'password'=>'password123']);
    }

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
            'id'=>'container-1','type'=>'core/container','attrs'=>['maxWidth'=>'1200px','padding'=>'24px'],
            'children'=>[['id'=>'heading-1','type'=>'core/heading','attrs'=>['text'=>'Nested heading','level'=>2,'alignment'=>'left']]],
        ]]], true);
        $this->assertStringContainsString('data-block-id="container-1"', $html);
        $this->assertStringContainsString('Nested heading', $html);
    }

    public function test_builder_api_requires_authentication(): void
    {
        $this->getJson('/api/blocks')->assertUnauthorized();
        $this->postJson('/api/render-page', ['blocks'=>[]])->assertUnauthorized();
    }

    public function test_render_page_endpoint_accepts_nested_page_json_for_authenticated_user(): void
    {
        $this->actingAs($this->user());
        $this->postJson('/api/render-page', ['blocks'=>[[
            'id'=>'columns-1','type'=>'core/columns','attrs'=>['columns'=>2,'gap'=>'24px'],'children'=>[],
        ]]])->assertOk()->assertJsonStructure(['html','assets']);
    }

    public function test_recursive_validator_rejects_unknown_block_type(): void
    {
        $this->actingAs($this->user());
        $this->postJson('/api/render-page', ['blocks'=>[[
            'id'=>'bad-1','type'=>'custom/missing','attrs'=>[],
        ]]])->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.type']);
    }

    public function test_recursive_validator_rejects_duplicate_block_ids(): void
    {
        $this->actingAs($this->user());
        $this->postJson('/api/render-page', ['blocks'=>[
            ['id'=>'same','type'=>'core/heading','attrs'=>[]],
            ['id'=>'container','type'=>'core/container','attrs'=>[],'children'=>[
                ['id'=>'same','type'=>'core/heading','attrs'=>[]],
            ]],
        ]])->assertUnprocessable()->assertJsonValidationErrors(['blocks.1.children.0.id']);
    }

    public function test_recursive_validator_rejects_invalid_attribute_types_and_unknown_attributes(): void
    {
        $this->actingAs($this->user());

        $this->postJson('/api/render-page', ['blocks'=>[[
            'id'=>'heading-1','type'=>'core/heading','attrs'=>['level'=>'two'],
        ]]])->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.attrs.level']);

        $this->postJson('/api/render-page', ['blocks'=>[[
            'id'=>'heading-2','type'=>'core/heading','attrs'=>['unknown'=>'value'],
        ]]])->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.attrs.unknown']);
    }

    public function test_recursive_validator_rejects_children_on_non_container_block(): void
    {
        $this->actingAs($this->user());
        $this->postJson('/api/render-page', ['blocks'=>[[
            'id'=>'heading-parent','type'=>'core/heading','attrs'=>[],
            'children'=>[['id'=>'heading-child','type'=>'core/heading','attrs'=>[]]],
        ]]])->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.children']);
    }

    public function test_page_is_created_for_authenticated_owner(): void
    {
        $user = $this->user();
        $this->actingAs($user)->postJson('/api/pages', [
            'title'=>'Owned page','slug'=>'owned-page','content'=>['blocks'=>[]],
        ])->assertCreated()->assertJsonPath('user_id', $user->id);
    }

    public function test_invalid_nested_content_cannot_be_saved(): void
    {
        $user = $this->user();
        $this->actingAs($user)->postJson('/api/pages', [
            'title'=>'Invalid','slug'=>'invalid','content'=>['blocks'=>[[
                'id'=>'container','type'=>'core/container','attrs'=>[],'children'=>[[
                    'id'=>'bad','type'=>'core/heading','attrs'=>['level'=>99],
                ]],
            ]]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.children.0.attrs.level']);
    }

    public function test_other_user_cannot_read_update_publish_or_preview_page(): void
    {
        $owner = $this->user();
        $other = $this->user('other@example.com');
        $page = $owner->pages()->create(['title'=>'Private','slug'=>'private','status'=>'draft','draft_content'=>['blocks'=>[]]]);

        $this->actingAs($other);
        $this->getJson("/api/pages/{$page->id}")->assertForbidden();
        $this->putJson("/api/pages/{$page->id}", ['content'=>['blocks'=>[]]])->assertForbidden();
        $this->postJson("/api/pages/{$page->id}/publish")->assertForbidden();
        $this->get("/preview/{$page->id}")->assertForbidden();
    }

    public function test_owner_can_preview_and_publish_while_public_route_only_uses_published_content(): void
    {
        $owner = $this->user();
        $page = $owner->pages()->create([
            'title'=>'Home','slug'=>'home','status'=>'draft',
            'draft_content'=>['blocks'=>[['id'=>'h','type'=>'core/heading','attrs'=>['text'=>'Draft title']]]],
        ]);

        $this->actingAs($owner)->get("/preview/{$page->id}")->assertOk()->assertSee('Draft title');
        $this->get('/home')->assertNotFound();
        $this->actingAs($owner)->postJson("/api/pages/{$page->id}/publish")->assertOk();
        $this->get('/home')->assertOk()->assertSee('Draft title');
    }

    public function test_product_grid_resolves_runtime_data_from_provider(): void
    {
        Product::create(['name'=>'Shirt','slug'=>'shirt','price'=>199000,'category'=>'apparel']);
        Product::create(['name'=>'Shoes','slug'=>'shoes','price'=>399000,'category'=>'footwear']);
        $html = app(BlockRenderer::class)->render(['id'=>'products-1','type'=>'commerce/product-grid','attrs'=>['title'=>'Apparel','category'=>'apparel','limit'=>8,'columns'=>4]], true);
        $this->assertStringContainsString('Shirt', $html);
        $this->assertStringNotContainsString('Shoes', $html);
    }

    public function test_assets_are_collected_only_for_used_blocks_and_deduplicated(): void
    {
        $renderer = app(PageRenderer::class);
        $renderer->render(['blocks'=>[
            ['id'=>'products-a','type'=>'commerce/product-grid','attrs'=>[]],
            ['id'=>'products-b','type'=>'commerce/product-grid','attrs'=>[]],
        ]], true);
        $this->assertSame(['/block-assets/commerce/product-grid/style.css'], $renderer->assets()['css']);
    }

    public function test_carousel_is_ssr_first_and_react_assets_are_lazy_and_deduplicated(): void
    {
        $renderer = app(PageRenderer::class);
        $html = $renderer->render(['blocks'=>[
            ['id'=>'carousel-a','type'=>'core/carousel','attrs'=>['items'=>[['title'=>'Alpha','description'=>'First','image'=>'']]]],
            ['id'=>'carousel-b','type'=>'core/carousel','attrs'=>['items'=>[['title'=>'Beta','description'=>'Second','image'=>'']]]],
        ]], false);
        $this->assertStringContainsString('Alpha', $html);
        $this->assertSame(['/block-assets/core/carousel/frontend.js'], $renderer->assets()['js']);
        $renderer->render(['blocks'=>[['id'=>'heading-only','type'=>'core/heading','attrs'=>[]]]], false);
        $this->assertSame(['css'=>[], 'js'=>[]], $renderer->assets());
    }

    public function test_only_manifest_declared_assets_can_be_served(): void
    {
        $this->get('/block-assets/commerce/product-grid/style.css')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->get('/block-assets/core/carousel/frontend.js')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->get('/block-assets/commerce/product-grid/template.blade.php')->assertNotFound();
    }
}
