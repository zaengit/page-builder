<?php

namespace Zaengit\PageBuilder;

use Illuminate\Support\ServiceProvider;
use Zaengit\PageBuilder\Blocks\AssetCollector;
use Zaengit\PageBuilder\DataProviders\DataProviderRegistry;

final class PageBuilderServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/page-builder.php', 'page-builder');
        $this->app->scoped(AssetCollector::class);
        $this->app->singleton(DataProviderRegistry::class, fn () => new DataProviderRegistry());
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/../routes/page-builder.php');
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'page-builder');

        if ($this->app->runningInConsole()) {
            require __DIR__.'/../routes/console.php';
        }

        $this->publishes([
            __DIR__.'/../config/page-builder.php' => config_path('page-builder.php'),
        ], 'page-builder-config');
    }
}
