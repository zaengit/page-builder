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
    ) {
        // Constructor property promotion wires render preparation services.
    }

    public function prepare(array $page, array $runtimeContext): array
    {
        $copy = $page;
        $settings = is_array($page['settings'] ?? null) ? $page['settings'] : [];
        $copy['_pageRender'] = $this->compilePageSettings($settings);
        $copy['blocks'] = $this->prepareBlocks(
            is_array($page['blocks'] ?? null) ? $page['blocks'] : [],
            $runtimeContext,
            null,
        );

        return $copy;
    }

    private function prepareBlocks(array $blocks, array $runtimeContext, ?array $parentLayout): array
    {
        $prepared = [];

        foreach ($blocks as $block) {
            if (is_array($block) === false) {
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

    /** @return array{class:string,style:string,colorSchemeCss:string,typographyCss:string,customCss:string} */
    private function compilePageSettings(array $settings): array
    {
        $schemes = [];
        foreach (($settings['colorSchemes'] ?? []) as $scheme) {
            if (is_array($scheme) && is_string($scheme['id'] ?? null) && is_array($scheme['colors'] ?? null)) {
                $schemes[$scheme['id']] = $scheme;
            }
        }
        $requested = is_string($settings['defaultColorSchemeId'] ?? null) ? $settings['defaultColorSchemeId'] : null;
        $defaultId = isset($schemes[$requested]) ? $requested : array_key_first($schemes);
        $class = trim('pb-page'.($defaultId ? ' pb-color-scheme--'.$this->safeIdentifier($defaultId) : '').' '.(string) ($settings['customClass'] ?? ''));

        $style = [];
        if (isset($settings['contentWidth'])) {
            $style[] = 'max-width:'.$this->safeCssValue((string) $settings['contentWidth']);
        }
        if (isset($settings['background'])) {
            $style[] = 'background:'.$this->safeCssValue((string) $settings['background']);
        }
        foreach (($settings['tokens'] ?? []) as $name => $value) {
            if (is_string($name) && is_scalar($value)) {
                $style[] = '--pb-'.$this->safeIdentifier($name).':'.$this->safeCssValue((string) $value);
            }
        }

        $schemeCss = '';
        foreach ($schemes as $id => $scheme) {
            $declarations = '';
            foreach (($scheme['colors'] ?? []) as $name => $value) {
                if (is_string($name) && is_scalar($value)) {
                    $declarations .= '--pb-color-'.$this->safeIdentifier($name).':'.$this->safeCssValue((string) $value).';';
                }
            }
            if ($declarations !== '') {
                $schemeCss .= '.pb-color-scheme--'.$this->safeIdentifier((string) $id).'{'.$declarations.'background-color:var(--pb-color-background);color:var(--pb-color-foreground);}';
            }
        }

        $customCss = is_string($settings['customCss'] ?? null)
            ? str_replace(['</style', '<script'], '', $settings['customCss'])
            : '';

        return [
            'class' => $class,
            'style' => implode(';', $style),
            'colorSchemeCss' => $schemeCss,
            'typographyCss' => $this->compileTypography($settings['typography'] ?? null),
            'customCss' => $customCss,
        ];
    }

    private function compileTypography(mixed $typography): string
    {
        if (is_array($typography) === false) {
            return '';
        }
        $families = is_array($typography['families'] ?? null) ? $typography['families'] : [];
        $styles = is_array($typography['styles'] ?? null) ? $typography['styles'] : [];
        $defaults = [
            'primary' => 'ui-sans-serif,system-ui,sans-serif',
            'secondary' => 'Georgia,Cambria,serif',
            'monospace' => 'ui-monospace,SFMono-Regular,Menlo,monospace',
        ];
        $selectors = [
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
        foreach ($defaults as $name => $fallback) {
            $value = is_string($families[$name] ?? null) && trim($families[$name]) !== '' ? $families[$name] : $fallback;
            $root .= '--pb-font-'.$name.':'.$this->safeCssValue($value).';';
        }
        $css = '.pb-page{'.$root.'font-family:var(--pb-font-primary);}';
        foreach ($selectors as $name => $selector) {
            $style = is_array($styles[$name] ?? null) ? $styles[$name] : [];
            if ($style === []) {
                continue;
            }
            $family = in_array($style['family'] ?? null, ['primary', 'secondary', 'monospace'], true) ? $style['family'] : 'primary';
            $declarations = 'font-family:var(--pb-font-'.$family.');';
            foreach ([
                'size' => 'font-size',
                'weight' => 'font-weight',
                'lineHeight' => 'line-height',
                'letterSpacing' => 'letter-spacing',
                'textTransform' => 'text-transform',
            ] as $key => $property) {
                if (is_string($style[$key] ?? null) && $style[$key] !== '') {
                    $declarations .= $property.':'.$this->safeCssValue($style[$key]).';';
                }
            }
            $css .= '.pb-page :is('.$selector.'){'.$declarations.'}';
        }

        return $css;
    }

    private function safeIdentifier(string $value): string
    {
        return preg_replace('/[^a-z0-9_-]/i', '', $value) ?: 'value';
    }

    private function safeCssValue(string $value): string
    {
        return str_replace(['<', '>', ';', '{', '}'], '', trim($value));
    }
}
