<?php

namespace App\Blocks;

final class PageRenderer
{
    public function __construct(private readonly BlockRenderer $blocks) {}

    public function render(array $pageContent, bool $preview = false): string
    {
        return implode('', array_map(fn (array $block) => $this->renderBlock($block, $preview), $pageContent['blocks'] ?? []));
    }

    private function renderBlock(array $block, bool $preview): string
    {
        $children = implode('', array_map(fn (array $child) => $this->renderBlock($child, $preview), $block['children'] ?? []));
        return $this->blocks->render($block, $preview, $children);
    }
}
