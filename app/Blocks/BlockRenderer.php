<?php

namespace App\Blocks;

use App\DataProviders\DataProviderRegistry;
use Illuminate\Support\Facades\View;

final class BlockRenderer
{
    public function __construct(
        private readonly BlockRegistry $registry,
        private readonly DataProviderRegistry $providers,
        private readonly AssetCollector $assets,
    ) {}

    public function render(array $block, bool $preview = false, string $children = ''): string
    {
        $definition = $this->registry->get((string) ($block['type'] ?? ''));
        if (!$definition) {
            return $preview ? '<div class="pb-missing">Unknown block: '.e($block['type'] ?? '').'</div>' : '';
        }

        $this->assets->collect($definition);

        $attrs = $block['attrs'] ?? [];
        foreach (($definition['attributes'] ?? []) as $key => $schema) {
            if (!array_key_exists($key, $attrs) && array_key_exists('default', $schema)) {
                $attrs[$key] = $schema['default'];
            }
        }

        $context = new BlockRenderContext(
            blockId: (string) ($block['id'] ?? ''),
            blockType: (string) ($block['type'] ?? ''),
            attrs: $attrs,
            data: null,
            preview: $preview,
        );

        $data = null;
        $providerName = $definition['data']['provider'] ?? null;
        if (is_string($providerName) && $providerName !== '') {
            $data = $this->providers->resolve($providerName)->resolve($attrs, $context);
            $context = new BlockRenderContext(
                blockId: $context->blockId,
                blockType: $context->blockType,
                attrs: $context->attrs,
                data: $data,
                preview: $context->preview,
            );
        }

        return View::file($definition['_template'], [
            'blockId' => $context->blockId,
            'attrs' => $context->attrs,
            'data' => $data,
            'context' => $context,
            'children' => $children,
            'preview' => $preview,
        ])->render();
    }
}
