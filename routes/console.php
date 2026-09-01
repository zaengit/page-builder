<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Symfony\Component\Console\Command\Command;
use Zaengit\PageBuilder\Blocks\BlockName;
use Zaengit\PageBuilder\Blocks\BlockRegistry;

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
    ], array_values($definitions));

    $this->table(['Name', 'Title', 'Category'], $rows);

    return Command::SUCCESS;
})->purpose('List registered Page Builder blocks');

Artisan::command('make:block {name}', function (string $name): int {
    if (! BlockName::isValid($name)) {
        $this->error('Block name must use namespace/block format, for example custom/button.');

        return Command::FAILURE;
    }

    [, $slug] = explode('/', $name, 2);
    $root = rtrim((string) config('page-builder.custom_blocks_path', base_path('blocks')), DIRECTORY_SEPARATOR);
    $directory = $root.DIRECTORY_SEPARATOR.$slug;

    if (File::exists($directory)) {
        $this->error("Block directory already exists: {$directory}");

        return Command::FAILURE;
    }

    File::makeDirectory($directory, 0755, true);
    File::put($directory.'/block.json', json_encode([
        'name' => $name,
        'version' => 1,
        'title' => str($slug)->replace('-', ' ')->title()->toString(),
        'category' => 'custom',
        'icon' => 'block',
        'attributes' => [
            'text' => ['type' => 'string', 'label' => 'Text', 'default' => 'New block'],
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL);
    File::put($directory.'/template.blade.php', '<section data-block-id="{{ $blockId }}">{{ $attrs[\'text\'] ?? \'\' }}</section>'.PHP_EOL);

    app(BlockRegistry::class)->clear();
    $this->info("Created {$name} in {$directory}.");
    $this->line('Run php artisan blocks:cache after customizing the manifest.');

    return Command::SUCCESS;
})->purpose('Create a new Page Builder block scaffold');
