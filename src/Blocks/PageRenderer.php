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
        private readonly LayoutSerializer $layouts,
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
        $firstSchemeId = array_key_first($this->colorSchemes);
        $this->defaultColorSchemeId = isset($this->colorSchemes[$requestedDefault])
            ? $requestedDefault
            : $firstSchemeId;

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
        $typographyCss = $this->renderTypographyCss($settings['typography'] ?? null);

        return '<div class="'.e($class).'" style="'.implode(';', $style).';'.$tokens.'">'
            .$body
            .'</div>'
            .($schemeCss !== '' ? '<style data-pb-color-schemes>'.$schemeCss.'</style>' : '')
            .($typographyCss !== '' ? '<style data-pb-typography>'.$typographyCss.'</style>' : '')
            .($customCss !== '' ? '<style data-pb-page-css>'.$customCss.'</style>' : '');
    }

    public function assets(): array
    {
        return $this->assets->all();
    }

    private function renderBlock(array $block, bool $preview, ?array $parentLayout = null): string
    {
        $layout = is_array($block['layout'] ?? null)
            ? $block['layout']
            : [];
        $children = implode('', array_map(
            fn (array $child) => $this->renderBlock($child, $preview, $layout),
            $block['children'] ?? [],
        ));

        $html = $this->blocks->render($block, $preview, $children);
        $id = (string) ($block['id'] ?? '');
        $serialized = $this->styles->serialize(
            is_array($block['styles'] ?? null) ? $block['styles'] : [],
            $id,
        );
        $layoutSerialized = $this->layouts->serialize(
            $layout,
            is_array($block['layoutItem'] ?? null) ? $block['layoutItem'] : [],
            $parentLayout,
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
        $inlineStyle = trim($serialized['style'].';'.$layoutSerialized['style'], ';');
        $responsiveCss = $serialized['css'].$layoutSerialized['css'];

        $wrapper = '<div data-pb-style-id="'.e($id).'" data-pb-id="'.e($id).'"'
            .$schemeClass
            .$slot
            .' style="'.e($inlineStyle).'">'
            .$html
            .'</div>'
            .($responsiveCss !== ''
                ? '<style data-pb-responsive="'.e($id).'">'.$responsiveCss.'</style>'
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

    private function renderTypographyCss(mixed $typography): string
    {
        if (! is_array($typography)) {
            return '';
        }

        $families = is_array($typography['families'] ?? null) ? $typography['families'] : [];
        $styles = is_array($typography['styles'] ?? null) ? $typography['styles'] : [];
        $familyDefaults = [
            'primary' => 'ui-sans-serif,system-ui,sans-serif',
            'secondary' => 'Georgia,Cambria,serif',
            'monospace' => 'ui-monospace,SFMono-Regular,Menlo,monospace',
        ];
        $styleSelectors = [
            'h1' => 'h1,.pb-text-h1',
            'h2' => 'h2,.pb-text-h2',
            'h3' => 'h3,.pb-text-h3',
            'h4' => 'h4,.pb-text-h4',
            'h5' => 'h5,.pb-text-h5',
            'h6' => 'h6,.pb-text-h6',
            'body' => 'p,.pb-text-body',
            'bodySmall' => '.pb-text-body-small',
            'caption' => '.pb-text-caption',
            'label' => 'label,.pb-text-label',
            'button' => 'button,.pb-text-button',
        ];

        $root = '';
        foreach ($familyDefaults as $name => $fallback) {
            $value = is_string($families[$name] ?? null) && trim($families[$name]) !== ''
                ? $families[$name]
                : $fallback;
            $root .= '--pb-font-'.$name.':'.$this->safeCssValue($value).';';
        }

        $css = '.pb-page{'.$root.'font-family:var(--pb-font-primary);}';

        foreach ($styleSelectors as $name => $selector) {
            $style = is_array($styles[$name] ?? null) ? $styles[$name] : [];
            if ($style === []) {
                continue;
            }

            $family = in_array($style['family'] ?? null, ['primary', 'secondary', 'monospace'], true)
                ? $style['family']
                : 'primary';
            $declarations = 'font-family:var(--pb-font-'.$family.');';

            foreach ([
                'size' => 'font-size',
                'weight' => 'font-weight',
                'lineHeight' => 'line-height',
                'letterSpacing' => 'letter-spacing',
                'textTransform' => 'text-transform',
            ] as $key => $property) {
                if (! is_string($style[$key] ?? null) || $style[$key] === '') {
                    continue;
                }
                $declarations .= $property.':'.$this->safeCssValue($style[$key]).';';
            }

            $css .= '.pb-page :is('.$selector.'){'.$declarations.'}';
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
