<?php

namespace Zaengit\PageBuilder\Engine\Laravel;

use Zaengit\PageBuilder\Engine\Laravel\Runtime\RuntimeRenderer;

final class LaravelRenderingEngine implements RenderingEngine
{
    public function __construct(
        private readonly RuntimeRenderer $runtime,
        private readonly LaravelDatasourceResolver $datasources,
    ) {}

    public function render(array $page): RenderResult
    {
        $result = $this->runtime->render(
            $page,
            $this->blockPaths(),
            $this->runtimeContext(),
            null,
            $this->datasources,
        );

        return new RenderResult($result->html, $result->assets, $result->diagnostics);
    }

    /** @return list<string> */
    private function blockPaths(): array
    {
        $paths = config('page-builder.block_paths', [base_path('blocks')]);

        if (! is_array($paths)) {
            $paths = [$paths];
        }

        return array_values(array_filter(
            $paths,
            fn ($path): bool => is_string($path) && $path !== '',
        ));
    }

    /** @return array<string, mixed> */
    private function runtimeContext(): array
    {
        if (! app()->bound('request')) {
            return [];
        }

        $request = request();
        $explicit = $request->attributes->get('page_builder_context', []);
        $route = $request->route();
        $routeParameters = is_object($route) && method_exists($route, 'parameters')
            ? $route->parameters()
            : [];
        $preview = $request->input('context', []);

        return array_replace_recursive(
            is_array($routeParameters) ? $routeParameters : [],
            is_array($explicit) ? $explicit : [],
            is_array($preview) ? $preview : [],
        );
    }
}
