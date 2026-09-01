<?php

namespace Zaengit\PageBuilder\DataProviders;

use InvalidArgumentException;

final class DataProviderRegistry
{
    /** @var array<string, class-string<BlockDataProvider>> */
    private array $providers = [];

    public function register(string $name, string $provider): void
    {
        if (! is_subclass_of($provider, BlockDataProvider::class)) {
            throw new InvalidArgumentException("Data provider [{$provider}] must implement BlockDataProvider.");
        }
        $this->providers[$name] = $provider;
    }

    public function has(string $name): bool
    {
        return isset($this->providers[$name]);
    }

    public function resolve(string $name): BlockDataProvider
    {
        if (! $this->has($name)) {
            throw new InvalidArgumentException("Unknown data provider [{$name}].");
        }

        return app($this->providers[$name]);
    }
}
