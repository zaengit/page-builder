<?php

use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Console\Command\Command;
use Zaengit\PageBuilder\Blocks\BlockManifestLoader;
use Zaengit\PageBuilder\Blocks\BlockRegistry;
use Zaengit\PageBuilder\Blocks\BlockScaffolder;
use Zaengit\PageBuilder\Editor\EditorAssetManager;
use Zaengit\PageBuilder\Production\ProductionDoctor;

Artisan::command('page-builder:doctor {--strict : Treat warnings as failures}', function (): int {
    $checks = app(ProductionDoctor::class)->inspect();
    $this->table(
        ['Check', 'Status', 'Detail'],
        array_map(static fn (array $check): array => [
            $check['name'],
            strtoupper($check['status']),
            $check['detail'],
        ], $checks),
    );

    $failures = array_filter($checks, static fn (array $check): bool => $check['status'] === 'failure');
    $warnings = array_filter($checks, static fn (array $check): bool => $check['status'] === 'warning');

    if ($failures !== [] || ((bool) $this->option('strict') && $warnings !== [])) {
        $this->error('Page Builder production diagnostics failed.');

        return Command::FAILURE;
    }

    if ($warnings !== []) {
        $this->warn('Page Builder is operational, but production warnings require review.');
    } else {
        $this->info('Page Builder production diagnostics passed.');
    }

    return Command::SUCCESS;
})->purpose('Check Page Builder production configuration, manifests, limits, and editor assets');

Artisan::command('page-builder:publish-assets', function (): int {
    $destination = app(EditorAssetManager::class)->publish();
    $this->info("Published Page Builder editor assets to {$destination}.");

    return Command::SUCCESS;
})->purpose('Publish Page Builder editor assets for static production delivery');

Artisan::command('blocks:validate', function (): int {
    $definitions = app(BlockManifestLoader::class)->loadAll();
    $this->info('Validated '.count($definitions).' block manifests.');

    return Command::SUCCESS;
})->purpose('Validate all Page Builder block manifests without changing the cache');

Artisan::command('blocks:cache', function (): int {
    $definitions = app(BlockRegistry::class)->warm();
    $this->info('Cached '.count($definitions).' block manifests.');

    return Command::SUCCESS;
})->purpose('Validate and cache all Page Builder block manifests');

Artisan::command('blocks:clear', function (): int {
    app(BlockRegistry::class)->clear();
    $this->info('Block manifest cache cleared.');

    return Command::SUCCESS;
})->purpose('Clear cached Page Builder block manifests');

Artisan::command('blocks:list', function (): int {
    $definitions = app(BlockRegistry::class)->all();
    if ($definitions === []) {
        $this->warn('No blocks registered.');

        return Command::SUCCESS;
    }

    $rows = array_map(static fn (array $definition): array => [
        $definition['name'] ?? '',
        $definition['title'] ?? '',
        $definition['category'] ?? '',
        $definition['version'] ?? 1,
    ], array_values($definitions));

    $this->table(['Name', 'Title', 'Category', 'Version'], $rows);

    return Command::SUCCESS;
})->purpose('List registered Page Builder blocks');

Artisan::command('make:block {name} {--preset=basic : Scaffold preset: basic, interactive, or container}', function (string $name): int {
    $preset = (string) $this->option('preset');

    try {
        $directory = app(BlockScaffolder::class)->scaffold($name, $preset);
    } catch (InvalidArgumentException $exception) {
        $this->error($exception->getMessage());

        return Command::FAILURE;
    }

    app(BlockRegistry::class)->clear();
    $this->info("Created {$name} ({$preset}) in {$directory}.");
    $this->line('Run php artisan blocks:validate after customizing the manifest.');

    return Command::SUCCESS;
})->purpose('Create a Page Builder block scaffold from a preset');
