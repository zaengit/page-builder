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
            'children.*.id' => ['required_with:children', 'string', 'max:100'],
            'children.*.type' => ['required_with:children', 'string', 'max:100'],
            'children.*.attrs' => ['required_with:children', 'array'],
        ]);

        $html = $renderer->render(['blocks' => [$block]], true);

        return response()->json([
            'id' => $block['id'],
            'html' => $html,
            'assets' => ['css' => [], 'js' => []],
        ]);
    }
}
