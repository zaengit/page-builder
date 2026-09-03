<?php

namespace Zaengit\PageBuilder\DataProviders;

use InvalidArgumentException;

final class DataProviderRegistry
{
    /** @var array<string, array{provider:class-string<BlockDataProvider|DataProvider>,title:string,paths:array<int,string>}> */
    private array $providers = [];

    public function register(string $name, string $provider, ?string $title = null, array $paths = []): void
    {
        if ($name === '' || preg_match('/^[a-zA-Z0-9._-]+$/', $name) !== 1) {
            throw new InvalidArgumentException("Invalid data provider name [{$name}].");
        }
        if (! is_subclass_of($provider, BlockDataProvider::class) && ! is_subclass_of($provider, DataProvider::class)) {
            throw new InvalidArgumentException("Data provider [{$provider}] must implement BlockDataProvider or DataProvider.");
        }
        foreach ($paths as $path) {
            if (! is_string($path) || trim($path) === '') {
                throw new InvalidArgumentException("Data provider [{$name}] paths must be non-empty strings.");
            }
        }

        $this->providers[$name] = [
            'provider' => $provider,
            'title' => $title !== null && $title !== '' ? $title : str($name)->headline()->toString(),
            'paths' => array_values($paths),
        ];
    }

    public function has(string $name): bool
    {
        return isset($this->providers[$name]);
    }

    public function resolve(string $name): BlockDataProvider|DataProvider
    {
        if (! $this->has($name)) {
            throw new InvalidArgumentException("Unknown data provider [{$name}].");
        }

        return app($this->providers[$name]['provider']);
    }

    /** @return array<int, array{name:string,title:string,paths:array<int,string>}> */
    public function definitions(): array
    {
        return array_map(
            fn (string $name, array $definition): array => [
                'name' => $name,
                'title' => $definition['title'],
                'paths' => $definition['paths'],
            ],
            array_keys($this->providers),
            array_values($this->providers),
        );
    }
}
