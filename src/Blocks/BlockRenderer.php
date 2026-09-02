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

        $context = new BlockRenderContext(
            (string) ($block['id'] ?? ''),
            (string) ($block['type'] ?? ''),
            $attrs,
            null,
            $preview,
        );

        $attrs = $this->bindings->resolve(
            $attrs,
            is_array($block['bindings'] ?? null) ? $block['bindings'] : [],
            $context,
        );
        $context = new BlockRenderContext($context->blockId, $context->blockType, $attrs, null, $preview);

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
}
