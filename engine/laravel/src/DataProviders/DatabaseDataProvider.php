<?php

namespace Zaengit\PageBuilder\DataProviders;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use InvalidArgumentException;

final class DatabaseDataProvider implements DataProvider
{
    public function resolve(array $binding, array $attrs = [], array $context = []): mixed
    {
        $model = $this->model($binding);
        /** @var Builder<Model> $query */
        $query = $model::query();
        $spec = is_array($binding['query'] ?? null) ? $binding['query'] : [];

        $this->relations($query, $spec);
        $this->filters($query, $spec);
        $this->orders($query, $spec);

        if (($binding['mode'] ?? 'single') === 'collection') {
            return $this->collection($query, $spec);
        }

        $recordId = $binding['recordId'] ?? null;
        if (($recordId === null || $recordId === '') && isset($binding['contextKey']) && is_string($binding['contextKey'])) {
            $recordId = $this->contextValue($context, $binding['contextKey']);
        }
        if ($recordId !== null && $recordId !== '') {
            $query->whereKey($recordId);
        }

        return $query->first()?->toArray();
    }

    /** @return class-string<Model> */
    private function model(array $binding): string
    {
        $resource = (string) ($binding['resource'] ?? '');
        $resources = (array) config('page-builder.data.resources', []);
        $model = $resources[$resource] ?? null;

        if (! is_string($model) || ! is_subclass_of($model, Model::class)) {
            throw new InvalidArgumentException('Unknown database resource: '.$resource);
        }

        return $model;
    }

    /** @param Builder<Model> $query */
    private function relations(Builder $query, array $spec): void
    {
        $relations = array_values(array_filter(
            array_slice((array) ($spec['with'] ?? []), 0, 20),
            fn (mixed $relation): bool => is_string($relation) && preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $relation) === 1,
        ));
        if ($relations !== []) {
            $query->with($relations);
        }
    }

    /** @param Builder<Model> $query */
    private function filters(Builder $query, array $spec): void
    {
        foreach (array_slice((array) ($spec['where'] ?? []), 0, 50) as $filter) {
            if (! is_array($filter)) {
                continue;
            }

            $column = (string) ($filter['column'] ?? '');
            $operator = strtolower((string) ($filter['operator'] ?? '='));
            if (preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $column) !== 1) {
                continue;
            }

            if ($operator === 'null') {
                $query->whereNull($column);
            } elseif ($operator === 'not null') {
                $query->whereNotNull($column);
            } elseif ($operator === 'in' || $operator === 'not in') {
                $values = is_array($filter['value'] ?? null) ? $filter['value'] : [$filter['value'] ?? null];
                $operator === 'in' ? $query->whereIn($column, $values) : $query->whereNotIn($column, $values);
            } elseif (in_array($operator, ['=', '!=', '<>', '>', '>=', '<', '<=', 'like', 'not like'], true)) {
                $query->where($column, $operator, $filter['value'] ?? null);
            }
        }
    }

    /** @param Builder<Model> $query */
    private function orders(Builder $query, array $spec): void
    {
        foreach (array_slice((array) ($spec['orderBy'] ?? []), 0, 10) as $order) {
            if (! is_array($order)) {
                continue;
            }
            $column = (string) ($order['column'] ?? '');
            if (preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $column) !== 1) {
                continue;
            }
            $direction = strtolower((string) ($order['direction'] ?? 'asc')) === 'desc' ? 'desc' : 'asc';
            $query->orderBy($column, $direction);
        }
    }

    private function contextValue(array $context, string $path): mixed
    {
        $value = $context;
        foreach (explode('.', $path) as $segment) {
            if (! is_array($value) || ! array_key_exists($segment, $value)) {
                return null;
            }
            $value = $value[$segment];
        }

        return $value;
    }

    /** @param Builder<Model> $query */
    private function collection(Builder $query, array $spec): array
    {
        $max = (int) config('page-builder.data.max_results', 100);
        $limit = max(1, min((int) ($spec['limit'] ?? 12), $max));
        $requestedPerPage = max(0, (int) ($spec['perPage'] ?? 0));
        $perPage = min($requestedPerPage, $max);

        if ($perPage > 0) {
            /** @var LengthAwarePaginator<int, Model> $paginator */
            $paginator = $query->paginate($perPage, ['*'], 'page', max(1, (int) ($spec['page'] ?? request()->integer('page', 1))));

            return [
                'items' => array_map(fn (Model $item): array => $item->toArray(), $paginator->items()),
                'pagination' => [
                    'currentPage' => $paginator->currentPage(),
                    'perPage' => $paginator->perPage(),
                    'lastPage' => $paginator->lastPage(),
                    'total' => $paginator->total(),
                    'hasMorePages' => $paginator->hasMorePages(),
                ],
            ];
        }

        $items = $query->limit($limit)->get()->map(fn (Model $item): array => $item->toArray())->values()->all();

        return [
            'items' => $items,
            'pagination' => null,
        ];
    }
}
