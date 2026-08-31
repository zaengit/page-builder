<?php

namespace Zaengit\PageBuilder\Blocks;

use Illuminate\Support\Facades\Cache;

final class BlockRegistry
{
    public const CACHE_KEY = 'page-builder.block-manifests.v1';
    private ?array $definitions = null;

    public function __construct(private readonly BlockManifestLoader $loader) {}

    public function all(): array
    {
        return $this->definitions ??= Cache::rememberForever(self::CACHE_KEY, fn (): array => $this->loader->loadAll());
    }

    public function get(string $name): ?array { return $this->all()[$name] ?? null; }

    public function warm(): array
    {
        $definitions = $this->loader->loadAll();
        Cache::forever(self::CACHE_KEY, $definitions);
        return $this->definitions = $definitions;
    }

    public function clear(): void
    {
        Cache::forget(self::CACHE_KEY);
        $this->definitions = null;
    }
}
