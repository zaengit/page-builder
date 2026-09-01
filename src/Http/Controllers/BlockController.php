<?php

namespace Zaengit\PageBuilder\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Zaengit\PageBuilder\Blocks\BlockRegistry;
use Zaengit\PageBuilder\Blocks\PageContentValidator;
use Zaengit\PageBuilder\Blocks\PageRenderer;

final class BlockController
{
    public function index(BlockRegistry $registry): JsonResponse
    {
        $blocks = array_values(array_map(function (array $definition): array {
            foreach (array_keys($definition) as $key) {
                if (str_starts_with((string) $key, '_')) {
                    unset($definition[$key]);
                }
            }

            return $definition;
        }, $registry->all()));

        return response()->json($blocks);
    }

    public function render(Request $request, PageRenderer $renderer, PageContentValidator $validator): JsonResponse
    {
        $content = $validator->validate(['blocks' => [$request->all()]]);
        $block = $content['blocks'][0];
        $html = $renderer->render($content, true);

        return response()->json(['id' => $block['id'], 'html' => $html, 'assets' => $renderer->assets()]);
    }

    public function renderPage(Request $request, PageRenderer $renderer, PageContentValidator $validator): JsonResponse
    {
        $content = $validator->validate($request->all());
        $html = $renderer->render($content, true);

        return response()->json(['html' => $html, 'assets' => $renderer->assets()]);
    }
}
