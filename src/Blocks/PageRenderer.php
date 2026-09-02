<?php

namespace Zaengit\PageBuilder\Blocks;

final class PageRenderer
{
    public function __construct(
        private readonly BlockRenderer $blocks,
        private readonly AssetCollector $assets,
        private readonly StyleSerializer $styles,
    ) {}

    public function render(array $pageContent, bool $preview = false): string
    {
        $this->assets->reset();

        $body = implode('', array_map(
            fn (array $block) => $this->renderBlock($block, $preview),
            $pageContent['blocks'] ?? [],
        ));

        $settings = is_array($pageContent['settings'] ?? null)
            ? $pageContent['settings']
            : [];

        $style = [];

        if (isset($settings['contentWidth'])) {
            $style[] = 'max-width:'.e((string) $settings['contentWidth']);
        }

        if (isset($settings['background'])) {
            $style[] = 'background:'.e((string) $settings['background']);
        }

        $class = trim('pb-page '.(string) ($settings['customClass'] ?? ''));
        $tokens = '';

        foreach (($settings['tokens'] ?? []) as $name => $value) {
            if (! is_string($name) || ! is_scalar($value)) {
                continue;
            }

            $tokens .= '--pb-'
                .preg_replace('/[^a-z0-9_-]/i', '', $name)
                .':'
                .str_replace(['<', '>', ';', '{', '}'], '', (string) $value)
                .';';
        }

        $customCss = is_string($settings['customCss'] ?? null)
            ? str_replace(['</style', '<script'], '', $settings['customCss'])
            : '';

        return '<div class="'.e($class).'" style="'.implode(';', $style).';'.$tokens.'">'
            .$body
            .'</div>'
            .($customCss !== '' ? '<style data-pb-page-css>'.$customCss.'</style>' : '');
    }

    public function assets(): array
    {
        return $this->assets->all();
    }

    private function renderBlock(array $block, bool $preview): string
    {
        $children = implode('', array_map(
            fn (array $child) => $this->renderBlock($child, $preview),
            $block['children'] ?? [],
        ));

        $html = $this->blocks->render($block, $preview, $children);
        $id = (string) ($block['id'] ?? '');
        $serialized = $this->styles->serialize(
            is_array($block['styles'] ?? null) ? $block['styles'] : [],
            $id,
        );
        $slot = isset($block['slot'])
            ? ' data-pb-slot="'.e((string) $block['slot']).'"'
            : '';

        $wrapper = '<div data-pb-style-id="'.e($id).'"'
            .$slot
            .' style="'.e($serialized['style']).'">'
            .$html
            .'</div>'
            .($serialized['css'] !== ''
                ? '<style data-pb-responsive="'.e($id).'">'.$serialized['css'].'</style>'
                : '');

        if (! $preview) {
            return $wrapper;
        }

        return '<div class="pb-preview-block" data-pb-block-id="'.e($id)
            .'" data-pb-block-type="'.e((string) ($block['type'] ?? '')).'">'
            .$wrapper
            .'</div>';
    }
}
