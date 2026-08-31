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
        $loadedRoots = [];

        foreach ($paths as $configuredPath) {
            if (!is_string($configuredPath) || $configuredPath === '') continue;

            $root = realpath($configuredPath);
            if ($root === false) continue;

            if (isset($loadedRoots[$root])) continue;
            $loadedRoots[$root] = true;

            foreach (glob($root.'/*/block.json') ?: [] as $manifestPath) {
                $realManifest = realpath($manifestPath);
                if ($realManifest === false || !str_starts_with($realManifest, $root.DIRECTORY_SEPARATOR)) throw new RuntimeException('Unsafe block manifest path.');

                $manifest = json_decode(file_get_contents($realManifest), true, flags: JSON_THROW_ON_ERROR);
                if (!is_array($manifest)) throw new RuntimeException("Invalid block manifest in {$manifestPath}");

                $name = $manifest['name'] ?? null;
                if (!is_string($name) || !preg_match('/^[a-z0-9-]+\/[a-z0-9-]+$/', $name)) throw new RuntimeException("Invalid block name in {$manifestPath}");
                if (isset($definitions[$name])) throw new RuntimeException("Duplicate block: {$name}");

                $manifest['version'] ??= 1;
                $this->validateManifest($manifest, $manifestPath, $name);

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

    private function validateManifest(array $manifest, string $manifestPath, string $name): void
    {
        if (!is_int($manifest['version']) || $manifest['version'] < 1) {
            throw new RuntimeException("Invalid version for {$name} in {$manifestPath}");
        }

        foreach (['title', 'category'] as $field) {
            if (!isset($manifest[$field]) || !is_string($manifest[$field]) || trim($manifest[$field]) === '') {
                throw new RuntimeException("Invalid {$field} for {$name} in {$manifestPath}");
            }
        }

        if (!isset($manifest['attributes']) || !is_array($manifest['attributes'])) {
            throw new RuntimeException("Invalid attributes for {$name} in {$manifestPath}");
        }

        foreach ($manifest['attributes'] as $attribute => $schema) {
            if (!is_string($attribute) || $attribute === '' || !is_array($schema) || !isset($schema['type']) || !is_string($schema['type']) || $schema['type'] === '') {
                throw new RuntimeException("Invalid attribute schema for {$name} in {$manifestPath}");
            }
            if (($schema['type'] ?? null) === 'select' && (!isset($schema['options']) || !is_array($schema['options']) || !array_is_list($schema['options']))) {
                throw new RuntimeException("Invalid select options for {$name}.{$attribute}");
            }
            if (($schema['type'] ?? null) === 'repeater' && (!isset($schema['fields']) || !is_array($schema['fields']))) {
                throw new RuntimeException("Invalid repeater fields for {$name}.{$attribute}");
            }
        }

        $supports = $manifest['supports'] ?? [];
        if (!is_array($supports)) throw new RuntimeException("Invalid supports for {$name}");
        if (array_key_exists('children', $supports) && !is_bool($supports['children'])) throw new RuntimeException("Invalid children support for {$name}");
        if (array_key_exists('allowedChildren', $supports)) {
            if (!($supports['children'] ?? false)) throw new RuntimeException("allowedChildren requires children support for {$name}");
            if (!is_array($supports['allowedChildren']) || !array_is_list($supports['allowedChildren'])) throw new RuntimeException("Invalid allowedChildren for {$name}");
            foreach ($supports['allowedChildren'] as $childType) {
                if (!is_string($childType) || !preg_match('/^[a-z0-9-]+\/[a-z0-9-]+$/', $childType)) throw new RuntimeException("Invalid allowed child type for {$name}");
            }
        }

        $assets = $manifest['assets'] ?? [];
        if (!is_array($assets)) throw new RuntimeException("Invalid assets for {$name}");
        foreach (['css', 'js'] as $group) {
            if (isset($assets[$group]) && (!is_array($assets[$group]) || !array_is_list($assets[$group]))) throw new RuntimeException("Invalid {$group} assets for {$name}");
        }

        $variations = $manifest['variations'] ?? [];
        if (!is_array($variations) || !array_is_list($variations)) throw new RuntimeException("Invalid variations for {$name}");
        foreach ($variations as $variation) {
            if (!is_array($variation) || !isset($variation['name'], $variation['title']) || !is_string($variation['name']) || !preg_match('/^[a-z0-9-]+$/', $variation['name']) || !is_string($variation['title']) || trim($variation['title']) === '') {
                throw new RuntimeException("Invalid variation for {$name}");
            }
            $variationAttrs = $variation['attrs'] ?? [];
            if (!is_array($variationAttrs)) throw new RuntimeException("Invalid variation attributes for {$name}.{$variation['name']}");
            foreach (array_keys($variationAttrs) as $attribute) {
                if (!array_key_exists($attribute, $manifest['attributes'])) throw new RuntimeException("Unknown variation attribute {$attribute} for {$name}");
            }
        }
    }
}
