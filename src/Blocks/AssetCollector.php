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
        foreach (($definition['assets']['css'] ?? []) as $asset) {
            if (is_string($asset)) {
                $this->css[$this->url($name, $asset)] = true;
            }
        }
        foreach (($definition['assets']['js'] ?? []) as $asset) {
            if (is_string($asset)) {
                $this->js[$this->url($name, $asset)] = true;
            }
        }
    }

    public function all(): array
    {
        return ['css' => array_keys($this->css), 'js' => array_keys($this->js)];
    }

    private function url(string $blockName, string $asset): string
    {
        [$namespace, $block] = explode('/', $blockName, 2);

        return '/block-assets/'.rawurlencode($namespace).'/'.rawurlencode($block).'/'.rawurlencode($asset);
    }
}
