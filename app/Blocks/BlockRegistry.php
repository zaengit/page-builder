<?php

namespace App\Blocks;

final class BlockRegistry
{
    private ?array $definitions = null;
    public function __construct(private readonly BlockManifestLoader $loader) {}
    public function all(): array { return $this->definitions ??= $this->loader->loadAll(); }
    public function get(string $name): ?array { return $this->all()[$name] ?? null; }
}
