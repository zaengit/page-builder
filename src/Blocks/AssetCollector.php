<?php

namespace Zaengit\PageBuilder\Blocks;

final class AssetCollector
{
    private array $css = [];

    private array $js = [];

    public function reset(): void
    {
        $this->css = [];
        $this->js = [];
    }

    public function collect(array $definition): void
    {
        $name = $definition['name'] ?? null;
        if (! is_string($name) || ! str_contains($name, '/')) {
            return;
        }

        $directory = is_string($definition['_directory'] ?? null) ? $definition['_directory'] : null;

        foreach (($definition['assets']['css'] ?? []) as $asset) {
            if (is_string($asset)) {
                $this->css[$this->url($name, $asset, $directory)] = true;
            }
        }

        foreach (($definition['assets']['js'] ?? []) as $asset) {
            if (is_string($asset)) {
                $this->js[$this->url($name, $asset, $directory)] = true;
            }
        }
    }

    public function all(): array
    {
        return ['css' => array_keys($this->css), 'js' => array_keys($this->js)];
    }

    private function url(string $blockName, string $asset, ?string $directory): string
    {
        [$namespace, $block] = explode('/', $blockName, 2);
        $url = '/block-assets/'.rawurlencode($namespace).'/'.rawurlencode($block).'/'.rawurlencode($asset);

        if ($directory === null) {
            return $url;
        }

        $path = realpath($directory.DIRECTORY_SEPARATOR.$asset);
        if ($path === false || ! str_starts_with($path, rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR)) {
            return $url;
        }

        $hash = hash_file('sha256', $path);

        return is_string($hash) ? $url.'?v='.substr($hash, 0, 12) : $url;
    }
}
