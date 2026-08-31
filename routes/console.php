<?php

use App\Blocks\BlockRegistry;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

Artisan::command('blocks:cache', function (): int {
    $definitions = app(BlockRegistry::class)->warm();
    $this->info('Cached '.count($definitions).' block manifests.');

    return self::SUCCESS;
})->purpose('Validate and cache all block manifests');

Artisan::command('blocks:clear', function (): int {
    app(BlockRegistry::class)->clear();
    $this->info('Block manifest cache cleared.');

    return self::SUCCESS;
})->purpose('Clear the cached block manifests');

Artisan::command('blocks:list', function (): int {
    $definitions = app(BlockRegistry::class)->all();

    if ($definitions === []) {
        $this->warn('No blocks registered.');
        return self::SUCCESS;
    }

    $this->table(
        ['Name', 'Title', 'Category'],
        array_map(
            fn (array $definition): array => [
                $definition['name'] ?? '',
                $definition['title'] ?? '',
                $definition['category'] ?? '',
            ],
            array_values($definitions),
        ),
    );

    return self::SUCCESS;
})->purpose('List registered page builder blocks');

Artisan::command('make:block {name}', function (string $name): int {
    if (!preg_match('/^[a-z0-9-]+\/[a-z0-9-]+$/', $name)) {
        $this->error('Block name must use namespace/block format, for example core/button.');
        return self::FAILURE;
    }

    [, $slug] = explode('/', $name, 2);
    $directory = base_path('blocks/'.$slug);

    if (File::exists($directory)) {
        $this->error("Block directory already exists: blocks/{$slug}");
        return self::FAILURE;
    }

    File::makeDirectory($directory, 0755, true);

    $manifest = [
        'name' => $name,
        'title' => str($slug)->replace('-', ' ')->title()->toString(),
        'category' => 'custom',
        'icon' => 'block',
        'attributes' => [
            'text' => [
                'type' => 'string',
                'label' => 'Text',
                'default' => 'New block',
            ],
        ],
    ];

    File::put(
        $directory.'/block.json',
        json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL,
    );

    File::put(
        $directory.'/template.blade.php',
        '<section data-block-id="{{ $blockId }}">{{ $attrs[\'text\'] ?? \'\' }}</section>'.PHP_EOL,
    );

    app(BlockRegistry::class)->clear();

    $this->info("Created {$name} in blocks/{$slug}.");
    $this->line('Run php artisan blocks:cache after customizing the manifest.');

    return self::SUCCESS;
})->purpose('Create a new custom block scaffold');
