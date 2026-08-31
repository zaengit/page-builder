<?php

namespace Zaengit\PageBuilder\Blocks;

use RuntimeException;

final class BlockManifestLoader
{
    public function loadAll(): array
    {
        $paths = config('page-builder.block_paths', [base_path('blocks')]);
        if (!is_array($paths)) $paths = [$paths];

        $definitions = [];
        foreach ($paths as $configuredPath) {
            if (!is_string($configuredPath) || $configuredPath === '') continue;
            $root = realpath($configuredPath);
            if ($root === false) continue;

            foreach (glob($root.'/*/block.json') ?: [] as $manifestPath) {
                $realManifest = realpath($manifestPath);
                if ($realManifest === false || !str_starts_with($realManifest, $root.DIRECTORY_SEPARATOR)) throw new RuntimeException('Unsafe block manifest path.');

                $manifest = json_decode(file_get_contents($realManifest), true, flags: JSON_THROW_ON_ERROR);
                $name = $manifest['name'] ?? null;
                if (!is_string($name) || !preg_match('/^[a-z0-9-]+\/[a-z0-9-]+$/', $name)) throw new RuntimeException("Invalid block name in {$manifestPath}");
                if (isset($definitions[$name])) throw new RuntimeException("Duplicate block: {$name}");

                $directory = dirname($realManifest);
                $template = realpath($directory.'/template.blade.php');
                if ($template === false || !str_starts_with($template, $root.DIRECTORY_SEPARATOR)) throw new RuntimeException("Missing or unsafe template for {$name}");

                foreach (['css'=>'css','js'=>'js'] as $group => $extension) {
                    foreach (($manifest['assets'][$group] ?? []) as $asset) {
                        if (!is_string($asset) || !preg_match('/^[A-Za-z0-9._-]+$/', $asset) || strtolower(pathinfo($asset, PATHINFO_EXTENSION)) !== $extension) throw new RuntimeException("Invalid {$group} asset for {$name}");
                        $realAsset = realpath($directory.DIRECTORY_SEPARATOR.$asset);
                        if ($realAsset === false || !str_starts_with($realAsset, $directory.DIRECTORY_SEPARATOR)) throw new RuntimeException("Missing or unsafe asset {$asset} for {$name}");
                    }
                }

                $manifest['_template'] = $template;
                $manifest['_directory'] = $directory;
                $definitions[$name] = $manifest;
            }
        }

        return $definitions;
    }
}
