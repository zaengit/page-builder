<?php

namespace Zaengit\PageBuilder\Blocks;

final class PageLayoutProcessor
{
    public function apply(array $original, array $validated): array
    {
        $validated['blocks'] = $this->mergeBlocks(
            is_array($original['blocks'] ?? null) ? $original['blocks'] : [],
            is_array($validated['blocks'] ?? null) ? $validated['blocks'] : [],
            'blocks',
        );

        return $validated;
    }

    private function mergeBlocks(array $original, array $validated, string $path): array
    {
        foreach ($validated as $index => $block) {
            $source = is_array($original[$index] ?? null) ? $original[$index] : [];
            $blockPath = $path.'.'.$index;

            if (array_key_exists('layout', $source)) {
                $block['layout'] = LayoutSchemaValidator::section(
                    $source['layout'],
                    $blockPath.'.layout',
                );
            }

            if (array_key_exists('layoutItem', $source)) {
                $block['layoutItem'] = LayoutSchemaValidator::item(
                    $source['layoutItem'],
                    $blockPath.'.layoutItem',
                );
            }

            if (isset($block['children']) && is_array($block['children'])) {
                $block['children'] = $this->mergeBlocks(
                    is_array($source['children'] ?? null) ? $source['children'] : [],
                    $block['children'],
                    $blockPath.'.children',
                );
            }

            $validated[$index] = $block;
        }

        return $validated;
    }
}
