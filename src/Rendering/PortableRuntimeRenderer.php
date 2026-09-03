<?php

namespace Zaengit\PageBuilder\Rendering;

final class PortableRuntimeRenderer
{
    public function __construct(private readonly UniversalTemplateRenderer $templates) {}

    /**
     * @param array<string, mixed> $page
     * @param array<string, array<string, mixed>> $registry
     * @param array<string, mixed> $runtimeContext
     * @return array{html:string,assets:array{css:list<string>,js:list<string>},diagnostics:list<string>}
     */
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
        $result['html'] = '<div class="pb-page">'.$body.'</div>';

        return $result;
    }

    /**
     * @param array<string, mixed> $block
     * @param array<string, array<string, mixed>> $registry
     * @param array<string, mixed> $runtimeContext
     * @param array{html:string,assets:array{css:list<string>,js:list<string>},diagnostics:list<string>} $result
     * @param array{css:array<string,bool>,js:array<string,bool>} $seen
     */
    private function renderBlock(array $block, array $registry, array $runtimeContext, array &$result, array &$seen): string
    {
        $type = is_string($block['type'] ?? null) ? $block['type'] : '';
        $definition = $registry[$type] ?? null;
        if (! is_array($definition)) {
            $result['diagnostics'][] = 'unknown_block:'.$type;

            return '';
        }

        foreach (['css', 'js'] as $kind) {
            foreach (($definition['assets'][$kind] ?? []) as $asset) {
                if (! is_string($asset) || isset($seen[$kind][$asset])) {
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
            if (! is_string($attribute) || ! is_array($binding) || ($binding['source'] ?? null) !== 'context') {
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

    /** @param array<string, mixed> $block */
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
}
