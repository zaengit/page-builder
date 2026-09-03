<?php

namespace Zaengit\PageBuilder\Blocks;

final class PageRenderer
{
    private array $colorSchemes = [];

    private ?string $defaultColorSchemeId = null;

    public function __construct(
        private readonly BlockRenderer $blocks,
        private readonly AssetCollector $assets,
        private readonly StyleSerializer $styles,
    ) {}

    public function render(array $pageContent, bool $preview = false): string
    {
        $this->assets->reset();

        $settings = is_array($pageContent['settings'] ?? null)
            ? $pageContent['settings']
            : [];

        $this->colorSchemes = $this->normalizeColorSchemes($settings['colorSchemes'] ?? []);
        $requestedDefault = is_string($settings['defaultColorSchemeId'] ?? null)
            ? $settings['defaultColorSchemeId']
            : null;
        $this->defaultColorSchemeId = isset($this->colorSchemes[$requestedDefault])
            ? $requestedDefault
            : array_key_first($this->colorSchemes) ?: null;

        $body = implode('', array_map(
            fn (array $block) => $this->renderBlock($block, $preview),
            $pageContent['blocks'] ?? [],
        ));

        $style = [];

        if (isset($settings['contentWidth'])) {
            $style[] = 'max-width:'.e((string) $settings['contentWidth']);
        }

        if (isset($settings['background'])) {
            $style[] = 'background:'.e((string) $settings['background']);
        }

        $defaultSchemeClass = $this->defaultColorSchemeId
            ? ' pb-color-scheme--'.$this->safeIdentifier($this->defaultColorSchemeId)
            : '';
        $class = trim('pb-page'.$defaultSchemeClass.' '.(string) ($settings['customClass'] ?? ''));
        $tokens = '';

        foreach (($settings['tokens'] ?? []) as $name => $value) {
            if (! is_string($name) || ! is_scalar($value)) {
                continue;
            }

            $tokens .= '--pb-'
                .$this->safeIdentifier($name)
                .':'
                .$this->safeCssValue((string) $value)
                .';';
        }

        $customCss = is_string($settings['customCss'] ?? null)
            ? str_replace(['</style', '<script'], '', $settings['customCss'])
            : '';
        $schemeCss = $this->renderColorSchemeCss();

        return '<div class="'.e($class).'" style="'.implode(';', $style).';'.$tokens.'">'
            .$body
            .'</div>'
            .($schemeCss !== '' ? '<style data-pb-color-schemes>'.$schemeCss.'</style>' : '')
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
        $schemeId = is_string($block['colorSchemeId'] ?? null) && isset($this->colorSchemes[$block['colorSchemeId']])
            ? $block['colorSchemeId']
            : null;
        $schemeClass = $schemeId
            ? ' class="pb-color-scheme--'.e($this->safeIdentifier($schemeId)).'" data-pb-color-scheme="'.e($schemeId).'"'
            : '';

        $wrapper = '<div data-pb-style-id="'.e($id).'"'
            .$schemeClass
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

    private function normalizeColorSchemes(mixed $schemes): array
    {
        if (! is_array($schemes)) {
            return [];
        }

        $normalized = [];

        foreach ($schemes as $scheme) {
            if (! is_array($scheme) || ! is_string($scheme['id'] ?? null) || ! is_array($scheme['colors'] ?? null)) {
                continue;
            }

            $normalized[$scheme['id']] = $scheme;
        }

        return $normalized;
    }

    private function renderColorSchemeCss(): string
    {
        $css = '';

        foreach ($this->colorSchemes as $id => $scheme) {
            $declarations = '';

            foreach (($scheme['colors'] ?? []) as $name => $value) {
                if (! is_string($name) || ! is_scalar($value)) {
                    continue;
                }

                $declarations .= '--pb-color-'.$this->safeIdentifier($name).':'.$this->safeCssValue((string) $value).';';
            }

            if ($declarations === '') {
                continue;
            }

            $selector = '.pb-color-scheme--'.$this->safeIdentifier((string) $id);
            $css .= $selector.'{'.$declarations.'background-color:var(--pb-color-background);color:var(--pb-color-foreground);}';
        }

        return $css;
    }

    private function safeIdentifier(string $value): string
    {
        return preg_replace('/[^a-z0-9_-]/i', '', $value) ?: 'scheme';
    }

    private function safeCssValue(string $value): string
    {
        return str_replace(['<', '>', ';', '{', '}'], '', $value);
    }
}
