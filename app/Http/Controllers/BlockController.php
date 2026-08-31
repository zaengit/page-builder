<?php

namespace App\Http\Controllers;

use App\Blocks\BlockRegistry;
use App\Blocks\PageRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BlockController
{
    public function index(BlockRegistry $registry): JsonResponse
    {
        $blocks = array_values(array_map(function (array $definition): array {
            unset($definition['_template']);
            return $definition;
        }, $registry->all()));
        return response()->json($blocks);
    }

    public function render(Request $request, PageRenderer $renderer): JsonResponse
    {
        $block = $request->validate([
            'id' => ['required', 'string', 'max:100'],
            'type' => ['required', 'string', 'max:100'],
            'attrs' => ['present', 'array'],
            'children' => ['sometimes', 'array'],
        ]);

        $html = $renderer->render(['blocks' => [$block]], true);

        return response()->json([
            'id' => $block['id'],
            'html' => $html,
            'assets' => $renderer->assets(),
        ]);
    }

    public function renderPage(Request $request, PageRenderer $renderer): JsonResponse
    {
        $content = $request->validate([
            'blocks' => ['present', 'array'],
        ]);

        $html = $renderer->render($content, true);

        return response()->json([
            'html' => $html,
            'assets' => $renderer->assets(),
        ]);
    }
}
