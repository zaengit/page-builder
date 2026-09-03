<?php

namespace Tests\Feature;

use Illuminate\Validation\ValidationException;
use Tests\TestCase;
use Zaengit\PageBuilder\Blocks\BlockRegistry;
use Zaengit\PageBuilder\Blocks\PageContentValidator;

final class ProductionResourceLimitsTest extends TestCase
{
    public function test_string_attributes_are_bounded(): void
    {
        config()->set('page-builder.limits.max_string_length', 8);

        $this->expectException(ValidationException::class);

        app(PageContentValidator::class)->validate(['blocks' => [[
            'id' => 'heading-1',
            'type' => 'core/heading',
            'attrs' => ['text' => '0123456789'],
        ]]]);
    }

    public function test_block_depth_and_count_limits_are_configurable(): void
    {
        config()->set('page-builder.limits.max_blocks', 1);

        try {
            app(PageContentValidator::class)->validate(['blocks' => [
                ['id' => 'heading-1', 'type' => 'core/heading', 'attrs' => []],
                ['id' => 'heading-2', 'type' => 'core/heading', 'attrs' => []],
            ]]);
            $this->fail('Expected the configured block count limit to reject the payload.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('blocks', $e->errors());
        }
    }

    public function test_custom_css_and_tokens_are_bounded(): void
    {
        config()->set('page-builder.limits.max_custom_css_length', 10);
        config()->set('page-builder.limits.max_tokens', 1);

        try {
            app(PageContentValidator::class)->validate([
                'blocks' => [],
                'settings' => ['customCss' => str_repeat('x', 11)],
            ]);
            $this->fail('Expected oversized custom CSS to be rejected.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('settings.customCss', $e->errors());
        }

        $this->expectException(ValidationException::class);
        app(PageContentValidator::class)->validate([
            'blocks' => [],
            'settings' => ['tokens' => ['one' => '1', 'two' => '2']],
        ]);
    }

    public function test_repeater_item_count_is_bounded(): void
    {
        $root = sys_get_temp_dir().'/page-builder-limit-'.bin2hex(random_bytes(6));
        mkdir($root.'/list', 0777, true);
        file_put_contents($root.'/list/block.json', json_encode([
            'name' => 'test/list',
            'title' => 'List',
            'category' => 'test',
            'attributes' => [
                'items' => [
                    'type' => 'repeater',
                    'fields' => ['label' => ['type' => 'string']],
                ],
            ],
        ], JSON_THROW_ON_ERROR));
        file_put_contents($root.'/list/template.blade.php', '<div></div>');

        config()->set('page-builder.block_paths', [$root]);
        config()->set('page-builder.limits.max_repeater_items', 1);
        app(BlockRegistry::class)->clear();

        try {
            app(PageContentValidator::class)->validate(['blocks' => [[
                'id' => 'list-1',
                'type' => 'test/list',
                'attrs' => ['items' => [['label' => 'a'], ['label' => 'b']]],
            ]]]);
            $this->fail('Expected the repeater item limit to reject the payload.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('blocks.0.attrs.items', $e->errors());
        } finally {
            @unlink($root.'/list/template.blade.php');
            @unlink($root.'/list/block.json');
            @rmdir($root.'/list');
            @rmdir($root);
        }
    }
}
