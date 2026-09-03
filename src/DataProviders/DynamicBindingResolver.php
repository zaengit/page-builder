<?php

namespace Zaengit\PageBuilder\DataProviders;

use Throwable;
use Zaengit\PageBuilder\Blocks\BlockRenderContext;

final class DynamicBindingResolver
{
    public function __construct(
        private readonly DataProviderRegistry $providers,
    ) {}

    public function resolve(array $attrs, array $bindings, BlockRenderContext $context): array
    {
        foreach ($bindings as $attribute => $binding) {
            if (! is_string($attribute) || ! is_array($binding)) {
                continue;
            }

            $source = $binding['source'] ?? null;
            if (! is_string($source) || $source === '' || ! $this->providers->has($source)) {
                continue;
            }

            try {
                $provider = $this->providers->resolve($source);
                $data = method_exists($provider, 'resolveBinding')
                    ? $provider->resolveBinding($binding, $attrs, $context)
                    : $provider->resolve($attrs, $context);

                $value = ($binding['path'] ?? '') !== ''
                    ? data_get($data, (string) $binding['path'])
                    : $data;

                if ($value === null && array_key_exists('fallback', $binding)) {
                    $value = $binding['fallback'];
                }

                if ($value !== null) {
                    $attrs[$attribute] = $value;
                }
            } catch (Throwable $exception) {
                if ($context->preview && config('app.debug')) {
                    report($exception);
                }
                if (array_key_exists('fallback', $binding)) {
                    $attrs[$attribute] = $binding['fallback'];
                }
            }
        }

        return $attrs;
    }
}
