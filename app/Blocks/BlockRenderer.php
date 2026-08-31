<?php

namespace App\Blocks;

use Illuminate\Support\Facades\View;

final class BlockRenderer
{
    public function __construct(private readonly BlockRegistry $registry) {}

    public function render(array $block, bool $preview = false, string $children = ''): string
    {
        $definition = $this->registry->get((string) ($block['type'] ?? ''));
        if (!$definition) {
            return $preview ? '<div class="pb-missing">Unknown block: '.e($block['type'] ?? '').'</div>' : '';
        }

        $attrs = $block['attrs'] ?? [];
        foreach (($definition['attributes'] ?? []) as $key => $schema) {
            if (!array_key_exists($key, $attrs) && array_key_exists('default', $schema)) $attrs[$key] = $schema['default'];
        }

        return View::file($definition['_template'], [
            'blockId' => (string) ($block['id'] ?? ''),
            'attrs' => $attrs,
            'children' => $children,
            'preview' => $preview,
        ])->render();
    }
}
