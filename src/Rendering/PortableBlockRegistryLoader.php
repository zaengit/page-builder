<?php

namespace Zaengit\PageBuilder\Rendering;

use RuntimeException;
use Zaengit\PageBuilder\Blocks\BlockManifestValidator;

final class PortableBlockRegistryLoader
{
    public function __construct(private readonly BlockManifestValidator $validator)
    {
    }

    /**
     * @param  list<string>  $roots
     * @return array<string, array<string, mixed>>
     */
    public function load(array $roots): array
    {
        $registry = [];
        $loadedRoots = [];

        foreach ($roots as $configuredRoot) {
            $root = realpath($configuredRoot);
            if ($root === false || isset($loadedRoots[$root])) {
                continue;
            }
            $loadedRoots[$root] = true;

            foreach (glob($root.'/*/block.json') ?: [] as $manifestPath) {
                $realManifest = realpath($manifestPath);
                if ($realManifest === false || ! str_starts_with($realManifest, $root.DIRECTORY_SEPARATOR)) {
                    throw new RuntimeException('Unsafe portable block manifest path.');
                }

                $manifest = json_decode(file_get_contents($realManifest), true, flags: JSON_THROW_ON_ERROR);
                if (! is_array($manifest)) {
                    throw new RuntimeException("Invalid block manifest in {$manifestPath}");
                }
                $manifest['version'] ??= 1;
                $this->validator->validate($manifest, $realManifest);

                $name = (string) $manifest['name'];
                if (isset($registry[$name])) {
                    throw new RuntimeException("Duplicate portable block: {$name}");
                }

                $templateName = is_string($manifest['template'] ?? null) && $manifest['template'] !== ''
                    ? $manifest['template']
                    : 'template.html';
                if (! preg_match('/^[A-Za-z0-9._-]+\.html$/', $templateName)) {
                    throw new RuntimeException("Invalid portable template name for {$name}");
                }

                $directory = dirname($realManifest);
                $templatePath = realpath($directory.DIRECTORY_SEPARATOR.$templateName);
                if ($templatePath === false || ! str_starts_with($templatePath, $directory.DIRECTORY_SEPARATOR)) {
                    throw new RuntimeException("Missing portable template for {$name}");
                }

                $template = file_get_contents($templatePath);
                if ($template === false) {
                    throw new RuntimeException("Unable to read portable template for {$name}");
                }

                $manifest['template'] = $template;
                $manifest['_directory'] = $directory;
                $registry[$name] = $manifest;
            }
        }

        return $registry;
    }
}
