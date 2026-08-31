<?php

namespace App\Providers;

use App\Blocks\AssetCollector;
use App\DataProviders\DataProviderRegistry;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(AssetCollector::class);
        $this->app->singleton(DataProviderRegistry::class, fn (): DataProviderRegistry => new DataProviderRegistry());
    }

    public function boot(): void {}
}
