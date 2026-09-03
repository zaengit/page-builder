<?php

namespace Zaengit\PageBuilder\Rendering;

final class PortableRuntimeRenderer
{
    public function __construct(private readonly UniversalTemplateRenderer $templates) {}

    /**
     * Render the canonical portable runtime contract used by all language adapters.
     *
     * @param array<string, mixed> $page
     * @param array<string, array<string, mixed>> $registry
     * @param array<string, mixed> $runtimeContext
     * @return array{html:string,assets:array{css:list<string>,js:list<string>},diagnostics:list<string>}
     */
    public function render(array $page, array $registry, array $runtimeContext = []): array
    {
        $result = [
            'html' => '',
            'assets' => ['css' => [], 'js' => []],
            'diagnostics' => [],
        ];
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

        return '<div data-pb-id="'.e((string) ($block['id'] ?? '')).'">'.$html.'</div>';
    }
}
