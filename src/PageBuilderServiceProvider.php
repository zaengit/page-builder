<?php

namespace Zaengit\PageBuilder;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;
use Zaengit\PageBuilder\Blocks\AssetCollector;
use Zaengit\PageBuilder\Blocks\BlockMigrationRegistry;
use Zaengit\PageBuilder\DataProviders\DataProviderRegistry;
use Zaengit\PageBuilder\Editor\EditorResourceRegistry;

final class PageBuilderServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/page-builder.php', 'page-builder');
        $this->app->scoped(AssetCollector::class);
        $this->app->singleton(DataProviderRegistry::class, fn () => new DataProviderRegistry);
        $this->app->singleton(EditorResourceRegistry::class, fn () => new EditorResourceRegistry);
        $this->app->singleton(BlockMigrationRegistry::class, fn () => new BlockMigrationRegistry);
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/page-builder.php');
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'page-builder');
        Blade::anonymousComponentPath(__DIR__.'/../resources/views/components', 'page-builder');

        if ($this->app->runningInConsole()) {
            require __DIR__.'/../routes/console.php';
        }

        $this->publishes([
            __DIR__.'/../config/page-builder.php' => config_path('page-builder.php'),
        ], 'page-builder-config');

        $this->publishes([
            __DIR__.'/../resources/dist' => public_path(trim((string) config('page-builder.editor_public_path', 'vendor/page-builder'), '/')),
        ], 'page-builder-assets');
    }
}
