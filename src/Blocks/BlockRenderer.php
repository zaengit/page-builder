<?php

namespace Zaengit\PageBuilder\Blocks;

use Illuminate\Support\Facades\View;
use Zaengit\PageBuilder\DataProviders\DataProviderRegistry;
use Zaengit\PageBuilder\DataProviders\DynamicBindingResolver;

final class BlockRenderer
{
    public function __construct(
        private readonly BlockRegistry $registry,
        private readonly DataProviderRegistry $providers,
        private readonly DynamicBindingResolver $bindings,
        private readonly AssetCollector $assets,
    ) {}

    public function render(array $block, bool $preview = false, string $children = ''): string
    {
        $definition = $this->registry->get((string) ($block['type'] ?? ''));

        if (! $definition) {
            return $preview ? '<div class="pb-missing">Unknown block: '.e($block['type'] ?? '').'</div>' : '';
        }

        $this->assets->collect($definition);
        $attrs = $block['attrs'] ?? [];

        foreach (($definition['attributes'] ?? []) as $key => $schema) {
            if (! array_key_exists($key, $attrs) && array_key_exists('default', $schema)) {
                $attrs[$key] = $schema['default'];
            }
        }

        $runtimeContext = $this->runtimeContext();
        $context = new BlockRenderContext(
            (string) ($block['id'] ?? ''),
            (string) ($block['type'] ?? ''),
            $attrs,
            null,
            $preview,
            $runtimeContext,
        );

        $attrs = $this->bindings->resolve(
            $attrs,
            is_array($block['bindings'] ?? null) ? $block['bindings'] : [],
            $context,
        );
        $context = new BlockRenderContext($context->blockId, $context->blockType, $attrs, null, $preview, $runtimeContext);

        $data = null;
        $providerName = $definition['data']['provider'] ?? null;

        if (is_string($providerName) && $providerName !== '') {
            $data = $this->providers->resolve($providerName)->resolve($attrs, $context);
            $context = new BlockRenderContext(
                $context->blockId,
                $context->blockType,
                $context->attrs,
                $data,
                $context->preview,
                $runtimeContext,
            );
        }

        return View::file($definition['_template'], [
            'blockId' => $context->blockId,
            'attrs' => $context->attrs,
            'data' => $data,
            'context' => $context,
            'children' => $children,
            'preview' => $preview,
            'slot' => $block['slot'] ?? null,
        ])->render();
    }

    private function runtimeContext(): array
    {
        if (! app()->bound('request')) return [];
        $request = request();
        $explicit = $request->attributes->get('page_builder_context', []);
        $route = $request->route();
        $routeParameters = is_object($route) && method_exists($route, 'parameters') ? $route->parameters() : [];
        $previewContext = $request->input('context', []);

        return array_replace_recursive(
            is_array($routeParameters) ? $routeParameters : [],
            is_array($explicit) ? $explicit : [],
            is_array($previewContext) ? $previewContext : [],
        );
    }
}
