<?php

namespace Zaengit\PageBuilder\Rendering;

final class PortableRuntimeRenderer
{
    public function __construct(private readonly UniversalTemplateRenderer $templates)
    {
        // Constructor property promotion wires the portable template renderer.
    }

    public function render(array $page, array $registry, array $runtimeContext = []): array
    {
        $result = ['html' => '', 'assets' => ['css' => [], 'js' => []], 'diagnostics' => []];
        $seen = ['css' => [], 'js' => []];
        $body = '';
        foreach (($page['blocks'] ?? []) as $block) {
            if (is_array($block)) {
                $body .= $this->renderBlock($block, $registry, $runtimeContext, $result, $seen);
            }
        }
        $result['html'] = $this->wrapPage($page, $body);

        return $result;
    }

    private function renderBlock(array $block, array $registry, array $runtimeContext, array &$result, array &$seen): string
    {
        $type = is_string($block['type'] ?? null) ? $block['type'] : '';
        $definition = $registry[$type] ?? null;
        if (is_array($definition) === false) {
            $result['diagnostics'][] = 'unknown_block:'.$type;

            return '';
        }
        foreach (['css', 'js'] as $kind) {
            foreach (($definition['assets'][$kind] ?? []) as $asset) {
                if (is_string($asset) === false || isset($seen[$kind][$asset])) {
                    continue;
                }
                $seen[$kind][$asset] = true;
                $result['assets'][$kind][] = $asset;
            }
        }
        $attrs = [];
        foreach (($definition['attributes'] ?? []) as $key => $schema) {
            if (is_string($key) && is_array($schema) && array_key_exists('default', $schema)) {
                $attrs[$key] = $schema['default'];
            }
        }
        if (is_array($block['attrs'] ?? null)) {
            $attrs = array_replace($attrs, $block['attrs']);
        }
        foreach (($block['bindings'] ?? []) as $attribute => $binding) {
            if (is_string($attribute) === false || is_array($binding) === false || ($binding['source'] ?? null) !== 'context') {
                continue;
            }
            $path = (string) ($binding['path'] ?? '');
            $value = $path === '' ? $runtimeContext : data_get($runtimeContext, $path);
            if ($value === null && array_key_exists('fallback', $binding)) {
                $value = $binding['fallback'];
            }
            if ($value !== null) {
                $attrs[$attribute] = $value;
            }
        }
        $children = '';
        foreach (($block['children'] ?? []) as $child) {
            if (is_array($child)) {
                $children .= $this->renderBlock($child, $registry, $runtimeContext, $result, $seen);
            }
        }
        $template = is_string($definition['template'] ?? null) ? $definition['template'] : '';
        $html = $this->templates->render($template, [
            'attrs' => $attrs,
            'context' => $runtimeContext,
            'children' => $children,
            'blockId' => (string) ($block['id'] ?? ''),
            'slot' => $block['slot'] ?? null,
            'preview' => false,
        ]);

        return $this->wrapBlock($block, $html);
    }

    private function wrapBlock(array $block, string $html): string
    {
        $id = (string) ($block['id'] ?? '');
        $compiled = is_array($block['_render'] ?? null) ? $block['_render'] : null;
        if ($compiled === null) {
            return '<div data-pb-id="'.e($id).'">'.$html.'</div>';
        }
        $slot = array_key_exists('slot', $compiled) && $compiled['slot'] !== null
            ? ' data-pb-slot="'.e((string) $compiled['slot']).'"'
            : '';
        $schemeId = is_string($compiled['colorSchemeId'] ?? null) ? $compiled['colorSchemeId'] : '';
        $scheme = $schemeId !== ''
            ? ' class="pb-color-scheme--'.e($schemeId).'" data-pb-color-scheme="'.e($schemeId).'"'
            : '';
        $style = is_string($compiled['style'] ?? null) ? $compiled['style'] : '';
        $css = is_string($compiled['css'] ?? null) ? str_replace('</style', '', $compiled['css']) : '';
        $responsive = $css !== '' ? '<style data-pb-responsive="'.e($id).'">'.$css.'</style>' : '';

        return '<div data-pb-style-id="'.e($id).'" data-pb-id="'.e($id).'"'.$scheme.$slot.' style="'.e($style).'">'.$html.'</div>'.$responsive;
    }

    private function wrapPage(array $page, string $body): string
    {
        $compiled = is_array($page['_pageRender'] ?? null) ? $page['_pageRender'] : null;
        if ($compiled === null) {
            return '<div class="pb-page">'.$body.'</div>';
        }
        $class = is_string($compiled['class'] ?? null) && $compiled['class'] !== '' ? $compiled['class'] : 'pb-page';
        $style = is_string($compiled['style'] ?? null) ? $compiled['style'] : '';
        $schemeCss = is_string($compiled['colorSchemeCss'] ?? null) ? str_replace('</style', '', $compiled['colorSchemeCss']) : '';
        $typographyCss = is_string($compiled['typographyCss'] ?? null) ? str_replace('</style', '', $compiled['typographyCss']) : '';
        $customCss = is_string($compiled['customCss'] ?? null) ? str_replace(['</style', '<script'], '', $compiled['customCss']) : '';

        return '<div class="'.e($class).'" style="'.e($style).'">'.$body.'</div>'
            .($schemeCss !== '' ? '<style data-pb-color-schemes>'.$schemeCss.'</style>' : '')
            .($typographyCss !== '' ? '<style data-pb-typography>'.$typographyCss.'</style>' : '')
            .($customCss !== '' ? '<style data-pb-page-css>'.$customCss.'</style>' : '');
    }
}
