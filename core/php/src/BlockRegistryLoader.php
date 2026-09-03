<?php

namespace Zaengit\PageBuilder\Core;

use RuntimeException;

final class BlockRegistryLoader
{
    /** @param list<string> $roots @return array<string,array<string,mixed>> */
    public function load(array $roots): array
    {
        $registry = [];
        $seenRoots = [];
        foreach ($roots as $configured) {
            $root = realpath($configured);
            if ($root === false || isset($seenRoots[$root])) continue;
            $seenRoots[$root] = true;
            foreach (glob($root.'/*/block.json') ?: [] as $manifestPath) {
                $real = realpath($manifestPath);
                if ($real === false || ! str_starts_with($real, $root.DIRECTORY_SEPARATOR)) throw new RuntimeException('unsafe_manifest_path');
                $manifest = json_decode((string) file_get_contents($real), true, flags: JSON_THROW_ON_ERROR);
                if (! is_array($manifest)) throw new RuntimeException('invalid_manifest');
                $manifest['version'] ??= 1;
                $name = $manifest['name'] ?? null;
                if (! is_string($name) || preg_match('/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/', $name) !== 1) throw new RuntimeException('invalid_block_name');
                if (isset($registry[$name])) throw new RuntimeException('duplicate_block:'.$name);
                $directory = dirname($real);
                $template = realpath($directory.'/template.html');
                if ($template === false || ! str_starts_with($template, $directory.DIRECTORY_SEPARATOR)) throw new RuntimeException('missing_portable_template:'.$name);
                $manifest['_template'] = $template;
                $manifest['_directory'] = $directory;
                foreach (['css', 'js'] as $extension) foreach (($manifest['assets'][$extension] ?? []) as $asset) {
                    if (! is_string($asset) || preg_match('/^[A-Za-z0-9._-]+$/', $asset) !== 1 || strtolower(pathinfo($asset, PATHINFO_EXTENSION)) !== $extension || realpath($directory.'/'.$asset) === false) throw new RuntimeException('invalid_asset:'.$name);
                }
                $registry[$name] = $manifest;
            }
        }
        return $registry;
    }
}
