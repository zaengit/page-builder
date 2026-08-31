<?php

namespace App\Http\Controllers;

use App\Blocks\BlockRegistry;
use App\Blocks\BlockRenderer;
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

    public function render(Request $request, BlockRenderer $renderer): JsonResponse
    {
        $block = $request->validate([
            'id' => ['required','string','max:100'],
            'type' => ['required','string','max:100'],
            'attrs' => ['present','array'],
        ]);
        return response()->json(['id' => $block['id'], 'html' => $renderer->render($block, true), 'assets' => ['css' => [], 'js' => []]]);
    }
}
