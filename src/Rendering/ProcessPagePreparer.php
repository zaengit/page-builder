<?php

namespace Zaengit\PageBuilder\Rendering;

use Zaengit\PageBuilder\Blocks\BlockRenderContext;
use Zaengit\PageBuilder\Blocks\LayoutSerializer;
use Zaengit\PageBuilder\Blocks\StyleSerializer;
use Zaengit\PageBuilder\DataProviders\DynamicBindingResolver;

final class ProcessPagePreparer
{
    public function __construct(
        private readonly DynamicBindingResolver $bindings,
        private readonly StyleSerializer $styles,
        private readonly LayoutSerializer $layouts,
    ) {}

    /**
     * Resolve host-owned bindings and compile layout/style metadata into a
     * transient, language-neutral render envelope. Persisted page JSON is not mutated.
     *
     * @param array<string, mixed> $page
     * @param array<string, mixed> $runtimeContext
     * @return array<string, mixed>
     */
    public function prepare(array $page, array $runtimeContext): array
    {
        $copy = $page;
        $copy['blocks'] = $this->prepareBlocks(
            is_array($page['blocks'] ?? null) ? $page['blocks'] : [],
            $runtimeContext,
            null,
        );

        return $copy;
    }

    /**
     * @param array<int, mixed> $blocks
     * @param array<string, mixed> $runtimeContext
     * @param array<string, mixed>|null $parentLayout
     * @return list<array<string, mixed>>
     */
    private function prepareBlocks(array $blocks, array $runtimeContext, ?array $parentLayout): array
    {
        $prepared = [];

        foreach ($blocks as $block) {
            if (! is_array($block)) {
                continue;
            }

            $attrs = is_array($block['attrs'] ?? null) ? $block['attrs'] : [];
            $context = new BlockRenderContext(
                (string) ($block['id'] ?? ''),
                (string) ($block['type'] ?? ''),
                $attrs,
                null,
                false,
                $runtimeContext,
            );
            $bindings = is_array($block['bindings'] ?? null) ? $block['bindings'] : [];
            $block['attrs'] = $this->bindings->resolve($attrs, $bindings, $context);

            $id = (string) ($block['id'] ?? '');
            $layout = is_array($block['layout'] ?? null) ? $block['layout'] : [];
            $style = $this->styles->serialize(
                is_array($block['styles'] ?? null) ? $block['styles'] : [],
                $id,
            );
            $layoutStyle = $this->layouts->serialize(
                $layout,
                is_array($block['layoutItem'] ?? null) ? $block['layoutItem'] : [],
                $parentLayout,
                $id,
            );
            $block['_render'] = [
                'style' => trim($style['style'].';'.$layoutStyle['style'], ';'),
                'css' => $style['css'].$layoutStyle['css'],
                'slot' => isset($block['slot']) ? (string) $block['slot'] : null,
                'colorSchemeId' => is_string($block['colorSchemeId'] ?? null)
                    ? $block['colorSchemeId']
                    : null,
            ];
            $block['children'] = $this->prepareBlocks(
                is_array($block['children'] ?? null) ? $block['children'] : [],
                $runtimeContext,
                $layout,
            );
            $prepared[] = $block;
        }

        return $prepared;
    }
}
