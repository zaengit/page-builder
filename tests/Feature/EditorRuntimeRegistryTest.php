<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Blade;
use InvalidArgumentException;
use Tests\TestCase;
use Zaengit\PageBuilder\Blocks\BlockRenderContext;
use Zaengit\PageBuilder\DataProviders\BlockDataProvider;
use Zaengit\PageBuilder\DataProviders\DataProviderRegistry;
use Zaengit\PageBuilder\Editor\EditorResourceRegistry;

final class RuntimeFixtureProvider implements BlockDataProvider
{
    public function resolve(array $attrs, BlockRenderContext $context): mixed
    {
        return ['title' => 'Runtime title'];
    }
}

class EditorRuntimeRegistryTest extends TestCase
{
    public function test_editor_resources_are_registered_and_replaced_by_identifier(): void
    {
        $registry = app(EditorResourceRegistry::class);
        $registry->pattern('hero', 'Hero', [['id' => 'a', 'type' => 'core/heading', 'attrs' => []]], 'marketing');
        $registry->pattern('hero', 'Hero updated', [['id' => 'b', 'type' => 'core/heading', 'attrs' => []]]);
        $registry->template('landing', 'Landing', ['blocks' => []], 'Starter landing page');

        $this->assertSame('Hero updated', $registry->patterns()[0]['title']);
        $this->assertSame('b', $registry->patterns()[0]['blocks'][0]['id']);
        $this->assertSame('Landing', $registry->templates()[0]['title']);
        $this->assertSame('Starter landing page', $registry->templates()[0]['description']);
    }

    public function test_editor_resource_registry_rejects_invalid_contracts(): void
    {
        $this->expectException(InvalidArgumentException::class);
        app(EditorResourceRegistry::class)->pattern('bad id', 'Broken', []);
    }

    public function test_data_provider_metadata_is_available_to_editor_without_exposing_provider_class(): void
    {
        $registry = app(DataProviderRegistry::class);
        $registry->register('catalog', RuntimeFixtureProvider::class, 'Catalog', ['title', 'price.formatted']);

        $this->assertTrue($registry->has('catalog'));
        $this->assertInstanceOf(RuntimeFixtureProvider::class, $registry->resolve('catalog'));
        $this->assertSame([[
            'name' => 'catalog',
            'title' => 'Catalog',
            'paths' => ['title', 'price.formatted'],
        ]], $registry->definitions());
    }

    public function test_blade_editor_runtime_includes_registered_resources_and_explicit_overrides(): void
    {
        app(EditorResourceRegistry::class)
            ->pattern('hero-home', 'Homepage hero', [])
            ->template('starter', 'Starter page', ['blocks' => []]);
        app(DataProviderRegistry::class)->register('catalog', RuntimeFixtureProvider::class, 'Catalog', ['title']);

        $html = Blade::render(
            '<x-page-builder::editor :content="[\'blocks\' => []]" :autosave-ms="2500" :patterns="$patterns" />',
            ['patterns' => [['id' => 'cta', 'title' => 'CTA', 'blocks' => []]]],
        );

        $this->assertStringContainsString('hero-home', $html);
        $this->assertStringContainsString('starter', $html);
        $this->assertStringContainsString('catalog', $html);
        $this->assertStringContainsString('cta', $html);
        $this->assertStringContainsString('2500', $html);
    }
}
