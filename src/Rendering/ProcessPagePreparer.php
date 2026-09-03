<?php

namespace Zaengit\PageBuilder\Rendering;

use Zaengit\PageBuilder\Blocks\BlockRenderContext;
use Zaengit\PageBuilder\DataProviders\DynamicBindingResolver;

final class ProcessPagePreparer
{
    public function __construct(private readonly DynamicBindingResolver $bindings) {}

    /**
     * Resolve host-owned bindings into transient attrs before a page is handed to
     * a language-agnostic renderer. Persisted page content is never mutated.
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
        );

        return $copy;
    }

    /**
     * @param array<int, mixed> $blocks
     * @param array<string, mixed> $runtimeContext
     * @return list<array<string, mixed>>
     */
    private function prepareBlocks(array $blocks, array $runtimeContext): array
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
            $block['children'] = $this->prepareBlocks(
                is_array($block['children'] ?? null) ? $block['children'] : [],
                $runtimeContext,
            );
            $prepared[] = $block;
        }

        return $prepared;
    }
}
