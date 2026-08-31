<?php

namespace App\Providers;

use App\Blocks\AssetCollector;
use App\DataProviders\DataProviderRegistry;
use App\DataProviders\ProductDataProvider;
use App\Models\Page;
use App\Policies\PagePolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(AssetCollector::class);

        $this->app->singleton(DataProviderRegistry::class, function (): DataProviderRegistry {
            $registry = new DataProviderRegistry();
            $registry->register('products', ProductDataProvider::class);
            return $registry;
        });
    }

    public function boot(): void
    {
        Gate::policy(Page::class, PagePolicy::class);

        RateLimiter::for('builder-render', function (Request $request): Limit {
            return Limit::perMinute(120)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('builder-preview', function (Request $request): Limit {
            return Limit::perMinute(120)->by((string) ($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('builder-auth', function (Request $request): Limit {
            return Limit::perMinute(10)->by((string) $request->ip());
        });
    }
}
