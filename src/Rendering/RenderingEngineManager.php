<?php

namespace Zaengit\PageBuilder\Rendering;

use InvalidArgumentException;
use Zaengit\PageBuilder\Engine\Laravel\LaravelRenderingEngine;

final class RenderingEngineManager
{
    public function __construct(private readonly LaravelRenderingEngine $laravel) {}

    /** @param array<string, mixed> $page */
    public function render(array $page, ?string $engine = null): RenderResult
    {
        return $this->engine($engine)->render($page);
    }

    public function engine(?string $name = null): RenderingEngine
    {
        $name ??= (string) config('page-builder.rendering.default', 'laravel');
        if ($name === 'php') {
            $name = 'laravel';
        }

        if ($name === 'laravel') {
            return $this->laravel;
        }

        $definition = config('page-builder.rendering.engines.'.$name);
        if (! is_array($definition)) {
            throw new InvalidArgumentException("Unknown page-builder rendering engine: {$name}");
        }

        $driver = (string) ($definition['driver'] ?? 'process');
        if ($driver !== 'process') {
            throw new InvalidArgumentException("Unsupported page-builder rendering driver: {$driver}");
        }

        $command = $definition['command'] ?? [];
        if (is_string($command)) {
            $command = array_values(array_filter(preg_split('/\s+/', trim($command)) ?: []));
        }
        if (! is_array($command) || array_filter($command, fn ($part) => ! is_string($part) || $part === '') !== []) {
            throw new InvalidArgumentException("Invalid command for page-builder rendering engine: {$name}");
        }

        $blockRoot = (string) ($definition['block_root'] ?? config('page-builder.rendering.block_root', base_path('blocks')));
        $timeoutMs = max(100, (int) ($definition['timeout_ms'] ?? config('page-builder.rendering.timeout_ms', 5000)));

        return new ProcessRenderingEngine(array_values($command), $blockRoot, $timeoutMs);
    }

    /** @return list<string> */
    public function available(): array
    {
        $engines = config('page-builder.rendering.engines', []);
        if (! is_array($engines)) {
            return ['laravel'];
        }

        return array_values(array_unique(['laravel', ...array_keys($engines)]));
    }
}
