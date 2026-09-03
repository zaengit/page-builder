<?php

namespace Zaengit\PageBuilder\Engine\Laravel\Runtime;

use Throwable;
use Zaengit\PageBuilder\Engine\Laravel\Contracts\DatasourceResolver;

final class RuntimeRenderer
{
    public function __construct(
        private readonly TemplateRenderer $templates = new TemplateRenderer,
        private readonly StyleSerializer $styles = new StyleSerializer,
        private readonly LayoutSerializer $layouts = new LayoutSerializer,
        private readonly BlockRegistryLoader $loader = new BlockRegistryLoader,
    ) {}

    /** @param list<string> $blockRoots @param array<string,mixed>|null $registry */
    public function render(array $page, array $blockRoots = [], array $context = [], ?array $registry = null, ?DatasourceResolver $datasource = null): RuntimeRenderResult
    {
        $diagnostics = [];
        $version = $page['version'] ?? null;
        if ($version !== 1) {
            $message = is_scalar($version) ? (string) $version : 'missing';

            return new RuntimeRenderResult('', ['css' => [], 'js' => []], [(new Diagnostic('unsupported_page_version', 'error', '$.version', $message))->toArray()]);
        }

        try {
            $registry ??= $this->loader->load($blockRoots);
        } catch (Throwable $exception) {
            return new RuntimeRenderResult('', ['css' => [], 'js' => []], [(new Diagnostic('block_registry_error', 'error', '$.blocks', $exception->getMessage()))->toArray()]);
        }

        $assets = ['css' => [], 'js' => []];
        $seen = ['css' => [], 'js' => []];
        $body = '';
        foreach (($page['blocks'] ?? []) as $index => $block) {
            if (is_array($block)) {
                $body .= $this->renderBlock($block, $registry, $context, $datasource, $assets, $seen, $diagnostics, null, '$.blocks['.$index.']');
            }
        }

        return new RuntimeRenderResult($this->wrapPage($page, $body), $assets, $diagnostics);
    }

    private function renderBlock(array $block, array $registry, array $context, ?DatasourceResolver $datasource, array &$assets, array &$seen, array &$diagnostics, ?array $parentLayout, string $path): string
    {
        $type = is_string($block['type'] ?? null) ? $block['type'] : '';
        $definition = $registry[$type] ?? null;
        if (! is_array($definition)) {
            $diagnostics[] = (new Diagnostic('unknown_block', 'warning', $path.'.type', $type))->toArray();

            return '';
        }

        $this->collectAssets($definition, $assets, $seen);
        $attrs = is_array($block['attrs'] ?? null) ? $block['attrs'] : [];
        foreach (($definition['attributes'] ?? []) as $key => $schema) {
            if (is_array($schema) && ! array_key_exists($key, $attrs) && array_key_exists('default', $schema)) {
                $attrs[$key] = $schema['default'];
            }
        }

        foreach (($block['bindings'] ?? []) as $attribute => $binding) {
            if (! is_string($attribute) || ! is_array($binding)) {
                continue;
            }
            $source = $binding['source'] ?? null;
            $value = null;
            try {
                if ($source === 'context') {
                    $value = ArrayPath::get($context, (string) ($binding['path'] ?? ''));
                } elseif (is_string($source) && $source !== '' && $datasource !== null) {
                    $data = $datasource->resolve($binding, $attrs, $context);
                    $value = ArrayPath::get($data, (string) ($binding['path'] ?? ''));
                }
            } catch (Throwable $exception) {
                $diagnostics[] = (new Diagnostic('datasource_error', 'warning', $path.'.bindings.'.$attribute, $exception->getMessage()))->toArray();
            }
            if ($value === null && array_key_exists('fallback', $binding)) {
                $value = $binding['fallback'];
            }
            if ($value !== null) {
                $attrs[$attribute] = $value;
            }
        }

        $layout = is_array($block['layout'] ?? null) ? $block['layout'] : [];
        $children = '';
        foreach (($block['children'] ?? []) as $index => $child) {
            if (is_array($child)) {
                $children .= $this->renderBlock($child, $registry, $context, $datasource, $assets, $seen, $diagnostics, $layout, $path.'.children['.$index.']');
            }
        }

        $template = isset($definition['_template']) ? (string) file_get_contents($definition['_template']) : (string) ($definition['template'] ?? '');
        $rendered = $this->templates->render($template, [
            'attrs' => $attrs,
            'context' => $context,
            'children' => $children,
            'blockId' => $block['id'] ?? '',
            'slot' => $block['slot'] ?? null,
            'preview' => false,
        ]);

        return $this->wrapBlock($block, $rendered, $parentLayout);
    }

    private function wrapBlock(array $block, string $rendered, ?array $parentLayout): string
    {
        $id = (string) ($block['id'] ?? '');
        $safeId = $this->escape($id);
        $style = $this->styles->serialize(is_array($block['styles'] ?? null) ? $block['styles'] : [], $id);
        $layout = $this->layouts->serialize(is_array($block['layout'] ?? null) ? $block['layout'] : [], is_array($block['layoutItem'] ?? null) ? $block['layoutItem'] : [], $parentLayout, $id);
        $inlineStyle = trim($style['style'].';'.$layout['style'], ';');
        $css = $style['css'].$layout['css'];
        $slot = isset($block['slot']) ? ' data-pb-slot="'.$this->escape((string) $block['slot']).'"' : '';
        $scheme = is_string($block['colorSchemeId'] ?? null) && $block['colorSchemeId'] !== '' ? (string) $block['colorSchemeId'] : null;
        $schemeAttr = $scheme === null ? '' : ' class="pb-color-scheme--'.$this->escape($this->identifier($scheme)).'" data-pb-color-scheme="'.$this->escape($scheme).'"';
        $wrapper = '<div data-pb-style-id="'.$safeId.'" data-pb-id="'.$safeId.'"'.$schemeAttr.$slot.' style="'.$this->escape($inlineStyle).'">'.$rendered.'</div>';

        return $wrapper.($css !== '' ? '<style data-pb-responsive="'.$safeId.'">'.$this->safeStyleBody($css).'</style>' : '');
    }

    private function wrapPage(array $page, string $body): string
    {
        $settings = is_array($page['settings'] ?? null) ? $page['settings'] : [];
        $schemes = [];
        foreach (($settings['colorSchemes'] ?? []) as $scheme) {
            if (is_array($scheme) && is_string($scheme['id'] ?? null) && is_array($scheme['colors'] ?? null)) {
                $schemes[$scheme['id']] = $scheme;
            }
        }

        $requested = is_string($settings['defaultColorSchemeId'] ?? null) ? $settings['defaultColorSchemeId'] : null;
        $default = isset($schemes[$requested]) ? $requested : array_key_first($schemes);
        $class = trim('pb-page'.($default ? ' pb-color-scheme--'.$this->identifier((string) $default) : '').' '.(string) ($settings['customClass'] ?? ''));
        $style = [];
        if (isset($settings['contentWidth'])) {
            $style[] = 'max-width:'.$this->cssValue((string) $settings['contentWidth']);
        }
        if (isset($settings['background'])) {
            $style[] = 'background:'.$this->cssValue((string) $settings['background']);
        }
        foreach (($settings['tokens'] ?? []) as $name => $value) {
            if (is_string($name) && is_scalar($value)) {
                $style[] = '--pb-'.$this->identifier($name).':'.$this->cssValue((string) $value);
            }
        }

        $out = '<div class="'.$this->escape($class).'" style="'.$this->escape(implode(';', $style)).'">'.$body.'</div>';
        $schemeCss = '';
        foreach ($schemes as $id => $scheme) {
            $declarations = '';
            foreach (($scheme['colors'] ?? []) as $name => $value) {
                if (is_string($name) && is_scalar($value)) {
                    $declarations .= '--pb-color-'.$this->identifier($name).':'.$this->cssValue((string) $value).';';
                }
            }
            if ($declarations !== '') {
                $schemeCss .= '.pb-color-scheme--'.$this->identifier((string) $id).'{'.$declarations.'background-color:var(--pb-color-background);color:var(--pb-color-foreground);}';
            }
        }

        $typography = $this->typographyCss($settings['typography'] ?? null);
        $custom = is_string($settings['customCss'] ?? null) ? $this->safeStyleBody($settings['customCss']) : '';
        if ($schemeCss !== '') {
            $out .= '<style data-pb-color-schemes>'.$schemeCss.'</style>';
        }
        if ($typography !== '') {
            $out .= '<style data-pb-typography>'.$typography.'</style>';
        }
        if ($custom !== '') {
            $out .= '<style data-pb-page-css>'.$custom.'</style>';
        }

        return $out;
    }

    private function typographyCss(mixed $typography): string
    {
        if (! is_array($typography)) {
            return '';
        }
        $families = is_array($typography['families'] ?? null) ? $typography['families'] : [];
        $styles = is_array($typography['styles'] ?? null) ? $typography['styles'] : [];
        $defaults = ['primary' => 'ui-sans-serif,system-ui,sans-serif', 'secondary' => 'Georgia,Cambria,serif', 'monospace' => 'ui-monospace,SFMono-Regular,Menlo,monospace'];
        $root = '';
        foreach ($defaults as $name => $fallback) {
            $value = is_string($families[$name] ?? null) && trim($families[$name]) !== '' ? $families[$name] : $fallback;
            $root .= '--pb-font-'.$name.':'.$this->cssValue($value).';';
        }
        $css = '.pb-page{'.$root.'font-family:var(--pb-font-primary);}';
        $selectors = ['h1' => 'h1,.pb-text-h1', 'h2' => 'h2,.pb-text-h2', 'h3' => 'h3,.pb-text-h3', 'h4' => 'h4,.pb-text-h4', 'h5' => 'h5,.pb-text-h5', 'h6' => 'h6,.pb-text-h6', 'body' => 'p,.pb-text-body', 'bodySmall' => '.pb-text-body-small', 'caption' => '.pb-text-caption', 'label' => 'label,.pb-text-label', 'button' => 'button,.pb-text-button'];
        foreach ($selectors as $name => $selector) {
            $style = is_array($styles[$name] ?? null) ? $styles[$name] : [];
            if ($style === []) {
                continue;
            }
            $family = in_array($style['family'] ?? null, ['primary', 'secondary', 'monospace'], true) ? $style['family'] : 'primary';
            $declarations = 'font-family:var(--pb-font-'.$family.');';
            foreach (['size' => 'font-size', 'weight' => 'font-weight', 'lineHeight' => 'line-height', 'letterSpacing' => 'letter-spacing', 'textTransform' => 'text-transform'] as $key => $property) {
                if (is_string($style[$key] ?? null) && $style[$key] !== '') {
                    $declarations .= $property.':'.$this->cssValue($style[$key]).';';
                }
            }
            $css .= '.pb-page :is('.$selector.'){'.$declarations.'}';
        }

        return $css;
    }

    private function collectAssets(array $definition, array &$assets, array &$seen): void
    {
        foreach (['css', 'js'] as $group) {
            foreach (($definition['assets'][$group] ?? []) as $asset) {
                if (is_string($asset) && ! isset($seen[$group][$asset])) {
                    $seen[$group][$asset] = true;
                    $assets[$group][] = $asset;
                }
            }
        }
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8', true);
    }

    private function identifier(string $value): string
    {
        return preg_replace('/[^a-z0-9_-]/i', '', $value) ?: 'value';
    }

    private function cssValue(string $value): string
    {
        return str_replace(['<', '>', ';', '{', '}'], '', trim($value));
    }

    private function safeStyleBody(string $value): string
    {
        return str_ireplace(['</style', '<script'], '', $value);
    }
}
