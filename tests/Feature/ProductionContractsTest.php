<?php

namespace Tests\Feature;

use Illuminate\Validation\ValidationException;
use Tests\TestCase;
use Zaengit\PageBuilder\Blocks\BlockRegistry;
use Zaengit\PageBuilder\Blocks\BlockRenderContext;
use Zaengit\PageBuilder\Blocks\PageContentValidator;
use Zaengit\PageBuilder\DataProviders\BlockDataProvider;
use Zaengit\PageBuilder\DataProviders\DataProviderRegistry;
use Zaengit\PageBuilder\DataProviders\DynamicBindingResolver;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\RuntimeRenderer;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\StyleSerializer;

final class ProductionContractsTest extends TestCase
{
    public function test_responsive_styles_are_serialized_for_desktop_tablet_and_mobile(): void
    {
        $serialized = app(StyleSerializer::class)->serialize([
            'padding' => ['desktop' => '48px', 'tablet' => '24px', 'mobile' => '12px'],
            'fontSize' => ['desktop' => '40px', 'mobile' => '28px'],
            'hidden' => ['tablet' => true],
        ], 'hero-1');

        $this->assertStringContainsString('padding:48px', $serialized['style']);
        $this->assertStringContainsString('font-size:40px', $serialized['style']);
        $this->assertStringContainsString('@media(max-width:1024px)', $serialized['css']);
        $this->assertStringContainsString('padding:24px', $serialized['css']);
        $this->assertStringContainsString('display:none', $serialized['css']);
        $this->assertStringContainsString('@media(max-width:640px)', $serialized['css']);
        $this->assertStringContainsString('font-size:28px', $serialized['css']);
    }

    public function test_style_serializer_strips_css_breakout_characters(): void
    {
        $serialized = app(StyleSerializer::class)->serialize([
            'background' => 'red;}</style><script>alert(1)</script>',
        ], 'safe');

        $this->assertStringNotContainsString(';', $serialized['style']);
        $this->assertStringNotContainsString('{', $serialized['style']);
        $this->assertStringNotContainsString('}', $serialized['style']);
        $this->assertStringNotContainsString('<', $serialized['style']);
        $this->assertStringNotContainsString('>', $serialized['style']);
    }

    public function test_page_settings_render_width_background_tokens_class_and_custom_css(): void
    {
        $result = app(RuntimeRenderer::class)->render([
            'version' => 1,
            'blocks' => [],
            'settings' => [
                'contentWidth' => '1200px',
                'background' => '#fafafa',
                'customClass' => 'landing-page',
                'tokens' => ['brand color' => '#123456'],
                'customCss' => '.landing-page{min-height:100vh}',
            ],
        ], [base_path('blocks')]);
        $html = $result->html;

        $this->assertStringContainsString('pb-page landing-page', $html);
        $this->assertStringContainsString('max-width:1200px', $html);
        $this->assertStringContainsString('background:#fafafa', $html);
        $this->assertStringContainsString('--pb-brandcolor:#123456', $html);
        $this->assertStringContainsString('<style data-pb-page-css>', $html);
        $this->assertStringContainsString('min-height:100vh', $html);
    }

    public function test_custom_css_strips_style_and_script_breakout_sequences(): void
    {
        $result = app(RuntimeRenderer::class)->render([
            'version' => 1,
            'blocks' => [],
            'settings' => ['customCss' => '.x{color:red}</style><script>alert(1)</script>'],
        ], [base_path('blocks')]);
        $html = $result->html;

        $this->assertStringNotContainsString('</style><script>', $html);
        $this->assertStringNotContainsString('<script>', $html);
    }

    public function test_lock_contract_accepts_booleans_and_rejects_non_booleans(): void
    {
        $content = app(PageContentValidator::class)->validate(['blocks' => [[
            'id' => 'heading-1',
            'type' => 'core/heading',
            'attrs' => [],
            'lock' => ['move' => true, 'remove' => false, 'edit' => true],
        ]]]);

        $this->assertSame(['move' => true, 'remove' => false, 'edit' => true], $content['blocks'][0]['lock']);

        $this->expectException(ValidationException::class);
        app(PageContentValidator::class)->validate(['blocks' => [[
            'id' => 'heading-2',
            'type' => 'core/heading',
            'attrs' => [],
            'lock' => ['move' => 'yes'],
        ]]]);
    }

    public function test_slots_accept_allowed_children_and_reject_unknown_slots(): void
    {
        $root = $this->makeBlockRoot([
            'layout' => [
                'name' => 'test/layout',
                'title' => 'Layout',
                'category' => 'test',
                'attributes' => [],
                'supports' => [
                    'children' => true,
                    'slots' => [[
                        'name' => 'content',
                        'allowedChildren' => ['test/text'],
                    ]],
                ],
            ],
            'text' => [
                'name' => 'test/text',
                'title' => 'Text',
                'category' => 'test',
                'attributes' => ['text' => ['type' => 'string', 'default' => '']],
            ],
        ]);

        config()->set('page-builder.block_paths', [$root]);
        app(BlockRegistry::class)->clear();

        try {
            $valid = app(PageContentValidator::class)->validate(['blocks' => [[
                'id' => 'layout',
                'type' => 'test/layout',
                'attrs' => [],
                'children' => [[
                    'id' => 'text',
                    'type' => 'test/text',
                    'slot' => 'content',
                    'attrs' => ['text' => 'Hello'],
                ]],
            ]]]);

            $this->assertSame('content', $valid['blocks'][0]['children'][0]['slot']);

            try {
                app(PageContentValidator::class)->validate(['blocks' => [[
                    'id' => 'layout-2',
                    'type' => 'test/layout',
                    'attrs' => [],
                    'children' => [[
                        'id' => 'text-2',
                        'type' => 'test/text',
                        'slot' => 'sidebar',
                        'attrs' => ['text' => 'Hello'],
                    ]],
                ]]]);
                $this->fail('Expected an unknown slot validation failure.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('blocks.0.children.0.slot', $e->errors());
            }
        } finally {
            $this->removeDirectory($root);
        }
    }

    public function test_dynamic_binding_resolves_nested_paths_and_fallbacks(): void
    {
        $registry = app(DataProviderRegistry::class);
        $registry->register('test-product', ProductionContractProvider::class);
        $resolver = app(DynamicBindingResolver::class);
        $context = new BlockRenderContext('block-1', 'test/block', [], null, false);

        $resolved = $resolver->resolve(
            ['title' => 'Static', 'missing' => 'Static missing'],
            [
                'title' => ['source' => 'test-product', 'path' => 'product.title'],
                'missing' => ['source' => 'test-product', 'path' => 'product.missing', 'fallback' => 'Fallback'],
            ],
            $context,
        );

        $this->assertSame('Dynamic title', $resolved['title']);
        $this->assertSame('Fallback', $resolved['missing']);
    }

    public function test_unknown_dynamic_provider_leaves_static_value_untouched(): void
    {
        $resolver = app(DynamicBindingResolver::class);
        $context = new BlockRenderContext('block-1', 'test/block', [], null, false);

        $resolved = $resolver->resolve(
            ['title' => 'Static'],
            ['title' => ['source' => 'not-registered', 'path' => 'title']],
            $context,
        );

        $this->assertSame('Static', $resolved['title']);
    }

    private function makeBlockRoot(array $blocks): string
    {
        $root = sys_get_temp_dir().'/page-builder-contracts-'.bin2hex(random_bytes(6));
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

final class ProductionContractProvider implements BlockDataProvider
{
    public function resolve(array $attrs, BlockRenderContext $context): mixed
    {
        return ['product' => ['title' => 'Dynamic title']];
    }
}
