<?php

namespace Zaengit\PageBuilder\Http\Controllers;

use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Zaengit\PageBuilder\Blocks\BlockRegistry;

final class BlockAssetController
{
    public function show(string $namespace, string $block, string $asset, BlockRegistry $registry): Response
    {
        $definition = $registry->get($namespace.'/'.$block);
        if (!$definition || !preg_match('/^[A-Za-z0-9._-]+$/', $asset)) throw new NotFoundHttpException();

        $allowedCss = array_values(array_filter($definition['assets']['css'] ?? [], 'is_string'));
        $allowedJs = array_values(array_filter($definition['assets']['js'] ?? [], 'is_string'));
        if (!in_array($asset, [...$allowedCss, ...$allowedJs], true)) throw new NotFoundHttpException();

        $directory = $definition['_directory'] ?? realpath(dirname($definition['_template']));
        $path = realpath(($directory ?: '').DIRECTORY_SEPARATOR.$asset);
        if (!is_string($directory) || $path === false || !str_starts_with($path, $directory.DIRECTORY_SEPARATOR)) throw new NotFoundHttpException();

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $type = match ($extension) {
            'css' => 'text/css; charset=UTF-8',
            'js' => 'text/javascript; charset=UTF-8',
            default => throw new NotFoundHttpException(),
        };

        return response(file_get_contents($path), 200, [
            'Content-Type'=>$type,
            'Cache-Control'=>'public, max-age=3600',
            'X-Content-Type-Options'=>'nosniff',
        ]);
    }
}
