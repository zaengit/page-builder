<?php

namespace App\Blocks;

use RuntimeException;

final class BlockManifestLoader
{
    public function loadAll(): array
    {
        $root = realpath(base_path('blocks'));
        if ($root === false) return [];

        $definitions = [];
        foreach (glob($root.'/*/block.json') ?: [] as $manifestPath) {
            $realManifest = realpath($manifestPath);
            if ($realManifest === false || !str_starts_with($realManifest, $root.DIRECTORY_SEPARATOR)) {
                throw new RuntimeException('Unsafe block manifest path.');
            }

            $manifest = json_decode(file_get_contents($realManifest), true, flags: JSON_THROW_ON_ERROR);
            $name = $manifest['name'] ?? null;
            if (!is_string($name) || !preg_match('/^[a-z0-9-]+\/[a-z0-9-]+$/', $name)) {
                throw new RuntimeException("Invalid block name in {$manifestPath}");
            }
            if (isset($definitions[$name])) throw new RuntimeException("Duplicate block: {$name}");

            $directory = dirname($realManifest);
            $template = realpath($directory.'/template.blade.php');
            if ($template === false || !str_starts_with($template, $root.DIRECTORY_SEPARATOR)) {
                throw new RuntimeException("Missing or unsafe template for {$name}");
            }

            $manifest['_template'] = $template;
            $definitions[$name] = $manifest;
        }

        return $definitions;
    }
}
