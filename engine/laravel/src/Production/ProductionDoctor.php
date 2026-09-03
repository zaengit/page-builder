<?php

namespace Zaengit\PageBuilder\Production;

use Throwable;
use Zaengit\PageBuilder\Blocks\BlockManifestLoader;

final class ProductionDoctor
{
    public function __construct(private readonly BlockManifestLoader $loader) {}

    /**
     * @return array<int, array{name: string, status: 'ok'|'warning'|'failure', detail: string}>
     */
    public function inspect(): array
    {
        $checks = [];

        try {
            $blocks = $this->loader->loadAll();
            $checks[] = [
                'name' => 'Block manifests',
                'status' => $blocks === [] ? 'warning' : 'ok',
                'detail' => $blocks === [] ? 'No block manifests were discovered.' : count($blocks).' block manifests validated.',
            ];
        } catch (Throwable $e) {
            $checks[] = [
                'name' => 'Block manifests',
                'status' => 'failure',
                'detail' => $e->getMessage(),
            ];
        }

        $mode = (string) config('page-builder.editor_asset_mode', 'route');
        if (! in_array($mode, ['route', 'public'], true)) {
            $checks[] = [
                'name' => 'Editor asset mode',
                'status' => 'failure',
                'detail' => "Unsupported editor asset mode [{$mode}]. Use route or public.",
            ];
        } else {
            $checks[] = [
                'name' => 'Editor asset mode',
                'status' => 'ok',
                'detail' => "Using {$mode} delivery.",
            ];
            $checks[] = $this->assetCheck($mode);
        }

        $middleware = config('page-builder.middleware', []);
        $hasMiddleware = is_array($middleware) ? $middleware !== [] : is_string($middleware) && $middleware !== '';
        $checks[] = [
            'name' => 'Route protection',
            'status' => $hasMiddleware ? 'ok' : 'warning',
            'detail' => $hasMiddleware
                ? 'Page Builder API and preview middleware are configured.'
                : 'No Page Builder middleware is configured. Protect editor/render/preview routes in the host application before public deployment.',
        ];

        foreach ([
            'max_depth',
            'max_blocks',
            'max_string_length',
            'max_repeater_items',
            'max_custom_css_length',
            'max_tokens',
        ] as $limit) {
            $value = (int) config('page-builder.limits.'.$limit, 0);
            if ($value < 1) {
                $checks[] = [
                    'name' => 'Resource limits',
                    'status' => 'failure',
                    'detail' => "Configured limit [{$limit}] must be at least 1.",
                ];

                break;
            }
        }

        if (! array_filter($checks, static fn (array $check): bool => $check['name'] === 'Resource limits')) {
            $checks[] = [
                'name' => 'Resource limits',
                'status' => 'ok',
                'detail' => 'All payload resource limits are enabled.',
            ];
        }

        return $checks;
    }

    /** @return array{name: string, status: 'ok'|'warning'|'failure', detail: string} */
    private function assetCheck(string $mode): array
    {
        $files = array_values(array_filter([
            (string) config('page-builder.editor_js', 'page-builder.js'),
            (string) config('page-builder.editor_css', 'page-builder.css'),
        ]));

        $directory = $mode === 'public'
            ? public_path(trim((string) config('page-builder.editor_public_path', 'vendor/page-builder'), '/'))
            : (string) config('page-builder.editor_dist_path');

        foreach ($files as $file) {
            $path = rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$file;
            if (! is_file($path) || ! is_readable($path) || filesize($path) === 0) {
                $instruction = $mode === 'public'
                    ? 'Run php artisan page-builder:publish-assets after installing the release.'
                    : 'Install an official release containing compiled resources/dist assets.';

                return [
                    'name' => 'Editor assets',
                    'status' => 'failure',
                    'detail' => "Missing or unreadable editor asset [{$path}]. {$instruction}",
                ];
            }
        }

        return [
            'name' => 'Editor assets',
            'status' => 'ok',
            'detail' => count($files).' editor assets are present and readable.',
        ];
    }
}
