<?php

namespace App\Providers;

use App\DataProviders\DataProviderRegistry;
use App\DataProviders\ProductDataProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(DataProviderRegistry::class, function (): DataProviderRegistry {
            $registry = new DataProviderRegistry();
            $registry->register('products', ProductDataProvider::class);
            return $registry;
        });
    }

    public function boot(): void {}
}
