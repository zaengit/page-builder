<?php

namespace Zaengit\PageBuilder\Blocks;

final class PageRenderer
{
    public function __construct(
        private readonly BlockRenderer $blocks,
        private readonly AssetCollector $assets,
    ) {}

    public function render(array $pageContent, bool $preview = false): string
    {
        $this->assets->reset();

        return implode('', array_map(fn (array $block) => $this->renderBlock($block, $preview), $pageContent['blocks'] ?? []));
    }

    public function assets(): array
    {
        return $this->assets->all();
    }

    private function renderBlock(array $block, bool $preview): string
    {
        $children = implode('', array_map(fn (array $child) => $this->renderBlock($child, $preview), $block['children'] ?? []));
        $html = $this->blocks->render($block, $preview, $children);

        if (! $preview) {
            return $html;
        }

        $id = e((string) ($block['id'] ?? ''));
        $type = e((string) ($block['type'] ?? ''));

        return '<div class="pb-preview-block" data-pb-block-id="'.$id.'" data-pb-block-type="'.$type.'">'.$html.'</div>';
    }
}
