<?php

namespace Zaengit\PageBuilder\Engine\Laravel;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;
use Zaengit\PageBuilder\Engine\Laravel\Contracts\DatasourceResolver;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\ArrayPath;

final class LaravelDatasourceResolver implements DatasourceResolver
{
    public function resolve(array $binding, array $attrs, array $context): mixed
    {
        if (($binding['source'] ?? null) !== 'database') {
            return null;
        }

        $resource = (string) ($binding['resource'] ?? '');
        $modelClass = config('page-builder.data.resources.'.$resource);

        if (! is_string($modelClass) || ! is_subclass_of($modelClass, Model::class)) {
            throw new RuntimeException('unknown_resource:'.$resource);
        }

        /** @var Model $model */
        $model = new $modelClass;
        /** @var Builder<Model> $query */
        $query = $model->newQuery();
        $spec = is_array($binding['query'] ?? null) ? $binding['query'] : [];
        $relations = array_values(array_filter(
            (array) ($spec['with'] ?? []),
            fn ($value) => is_string($value) && preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $value),
        ));

        if ($relations !== []) {
            $query->with(array_slice($relations, 0, 20));
        }

        $this->applyFilters($query, $spec);
        $this->applyOrdering($query, $spec);

        $contextKey = trim((string) ($binding['contextKey'] ?? ''));
        if ($contextKey !== '') {
            $value = ArrayPath::get($context, $contextKey);
            if ($value instanceof Model) {
                $value = $value->getKey();
            }
            if ($value !== null) {
                $query->where($model->getQualifiedKeyName(), $value);
            }
        }

        if (($binding['mode'] ?? 'single') === 'collection') {
            $max = max(1, (int) config('page-builder.data.max_results', 100));
            $limit = max(1, min((int) ($spec['limit'] ?? 12), $max));

            return [
                'items' => $query->limit($limit)->get()->map->toArray()->all(),
                'pagination' => null,
            ];
        }

        if (($binding['recordId'] ?? null) !== null && $binding['recordId'] !== '') {
            $query->whereKey($binding['recordId']);
        }

        return $query->first()?->toArray();
    }

    /** @param Builder<Model> $query */
    private function applyFilters(Builder $query, array $spec): void
    {
        foreach (array_slice((array) ($spec['where'] ?? []), 0, 50) as $filter) {
            if (! is_array($filter)) {
                continue;
            }

            $column = (string) ($filter['column'] ?? '');
            $operator = strtolower((string) ($filter['operator'] ?? '='));
            if (! preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $column)) {
                continue;
            }

            if ($operator === 'in' || $operator === 'not in') {
                $values = is_array($filter['value'] ?? null)
                    ? $filter['value']
                    : array_filter(array_map('trim', explode(',', (string) ($filter['value'] ?? ''))));
                if ($operator === 'in') {
                    $query->whereIn($column, $values);
                } else {
                    $query->whereNotIn($column, $values);
                }

                continue;
            }

            if ($operator === 'null') {
                $query->whereNull($column);

                continue;
            }

            if ($operator === 'not null') {
                $query->whereNotNull($column);

                continue;
            }

            if (in_array($operator, ['=', '!=', '<>', '>', '>=', '<', '<=', 'like', 'not like'], true)) {
                $query->where($column, $operator, $filter['value'] ?? null);
            }
        }
    }

    /** @param Builder<Model> $query */
    private function applyOrdering(Builder $query, array $spec): void
    {
        foreach (array_slice((array) ($spec['orderBy'] ?? []), 0, 10) as $order) {
            if (! is_array($order)) {
                continue;
            }

            $column = (string) ($order['column'] ?? '');
            if (! preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $column)) {
                continue;
            }

            $query->orderBy(
                $column,
                strtolower((string) ($order['direction'] ?? 'asc')) === 'desc' ? 'desc' : 'asc',
            );
        }
    }
}
