<?php

namespace Zaengit\PageBuilder\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Zaengit\PageBuilder\Blocks\BlockRegistry;
use Zaengit\PageBuilder\Blocks\PageContentValidator;
use Zaengit\PageBuilder\Blocks\PageLayoutProcessor;
use Zaengit\PageBuilder\Engine\Laravel\RenderingEngineManager;

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

    public function render(
        Request $request,
        RenderingEngineManager $engines,
        PageContentValidator $validator,
        PageLayoutProcessor $layouts,
    ): JsonResponse {
        $original = ['version' => 1, 'blocks' => [$request->all()]];
        $content = $layouts->apply($original, $validator->validate($original));
        $block = $content['blocks'][0];
        $result = $engines->render($content);

        return response()->json([
            'id' => $block['id'],
            'html' => $result->html,
            'assets' => $result->assets,
            'diagnostics' => $result->diagnostics,
        ]);
    }

    public function renderPage(
        Request $request,
        RenderingEngineManager $engines,
        PageContentValidator $validator,
        PageLayoutProcessor $layouts,
    ): JsonResponse {
        $original = ['version' => 1, ...$request->all()];
        $content = $layouts->apply($original, $validator->validate($original));
        $result = $engines->render($content);

        return response()->json($result->toArray());
    }
}
