<?php

namespace Zaengit\PageBuilder\DataProviders;

use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

final class DatabaseResourceResolver
{
    /** @return class-string<Model> */
    public function modelClass(array $binding): string
    {
        $resource = trim((string) ($binding['resource'] ?? ''));
        $resources = (array) config('page-builder.data.resources', []);

        if ($resource !== '') {
            $modelClass = $resources[$resource] ?? null;
            if (! is_string($modelClass) || ! is_subclass_of($modelClass, Model::class)) {
                throw new InvalidArgumentException("Database resource [{$resource}] is not configured.");
            }

            return $modelClass;
        }

        // Compatibility with pre-universal persisted bindings. New page content must use resource.
        $legacyModel = (string) ($binding['model'] ?? '');
        $models = (array) config('page-builder.data.models', []);

        if ($legacyModel === '' || ! in_array($legacyModel, array_values($models), true)) {
            throw new InvalidArgumentException('Database binding must reference an allowed resource.');
        }

        if (! is_subclass_of($legacyModel, Model::class)) {
            throw new InvalidArgumentException('Database binding model must extend Eloquent Model.');
        }

        return $legacyModel;
    }
}
