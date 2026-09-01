<?php

namespace Zaengit\PageBuilder\Blocks;

use RuntimeException;

final class BlockManifestLoader
{
    public function __construct(private readonly BlockManifestValidator $validator) {}

    public function loadAll(): array
    {
        $definitions = [];
        $loadedRoots = [];

        foreach ($this->configuredPaths() as $configuredPath) {
            $root = realpath($configuredPath);
            if ($root === false || isset($loadedRoots[$root])) continue;
            $loadedRoots[$root] = true;

            foreach (glob($root.'/*/block.json') ?: [] as $manifestPath) {
                $manifest = $this->loadManifest($manifestPath, $root);
                $name = $manifest['name'];
                if (isset($definitions[$name])) throw new RuntimeException("Duplicate block: {$name}");

                $directory = dirname($manifest['_manifest']);
                $manifest['_template'] = $this->resolveTemplate($directory, $root, $name);
                $manifest['_directory'] = $directory;
                unset($manifest['_manifest']);

                $this->validateAssetFiles($manifest, $directory, $name);
                $definitions[$name] = $manifest;
            }
        }

        return $definitions;
    }

    private function configuredPaths(): array
    {
        $paths = config('page-builder.block_paths', [base_path('blocks')]);
        if (!is_array($paths)) $paths = [$paths];

        return array_values(array_filter($paths, fn ($path): bool => is_string($path) && $path !== ''));
    }

    private function loadManifest(string $manifestPath, string $root): array
    {
        $realManifest = realpath($manifestPath);
        if ($realManifest === false || !str_starts_with($realManifest, $root.DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('Unsafe block manifest path.');
        }

        $manifest = json_decode(file_get_contents($realManifest), true, flags: JSON_THROW_ON_ERROR);
        if (!is_array($manifest)) throw new RuntimeException("Invalid block manifest in {$manifestPath}");

        $manifest['version'] ??= 1;
        $this->validator->validate($manifest, $manifestPath);
        $manifest['_manifest'] = $realManifest;

        return $manifest;
    }

    private function resolveTemplate(string $directory, string $root, string $name): string
    {
        $template = realpath($directory.'/template.blade.php');
        if ($template === false || !str_starts_with($template, $root.DIRECTORY_SEPARATOR)) {
            throw new RuntimeException("Missing or unsafe template for {$name}");
        }

        return $template;
    }

    private function validateAssetFiles(array $manifest, string $directory, string $name): void
    {
        foreach (['css', 'js'] as $extension) {
            foreach (($manifest['assets'][$extension] ?? []) as $asset) {
                if (!is_string($asset)
                    || !preg_match('/^[A-Za-z0-9._-]+$/', $asset)
                    || strtolower(pathinfo($asset, PATHINFO_EXTENSION)) !== $extension) {
                    throw new RuntimeException("Invalid {$extension} asset for {$name}");
                }

                $realAsset = realpath($directory.DIRECTORY_SEPARATOR.$asset);
                if ($realAsset === false || !str_starts_with($realAsset, $directory.DIRECTORY_SEPARATOR)) {
                    throw new RuntimeException("Missing or unsafe asset {$asset} for {$name}");
                }
            }
        }
    }
}
