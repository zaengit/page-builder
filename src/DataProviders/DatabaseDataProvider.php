<?php

namespace Zaengit\PageBuilder\DataProviders;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use InvalidArgumentException;
use Zaengit\PageBuilder\Blocks\BlockRenderContext;

final class DatabaseDataProvider implements BlockDataProvider
{
    public function resolve(array $attrs, BlockRenderContext $context): mixed
    {
        return [];
    }

    public function resolveBinding(array $binding, array $attrs, BlockRenderContext $context): mixed
    {
        $modelClass = (string) ($binding['model'] ?? '');
        $models = (array) config('page-builder.data.models', []);

        if ($modelClass === '' || ! in_array($modelClass, array_values($models), true)) {
            throw new InvalidArgumentException('Database binding model is not allowed.');
        }
        if (! is_subclass_of($modelClass, Model::class)) {
            throw new InvalidArgumentException('Database binding model must extend Eloquent Model.');
        }

        /** @var Model $model */
        $model = new $modelClass;
        $query = $model->newQuery();
        $spec = is_array($binding['query'] ?? null) ? $binding['query'] : [];

        $this->applyRelations($query, $spec);
        $this->applyFilters($query, $spec);
        $this->applyOrdering($query, $spec);

        $contextKey = trim((string) ($binding['contextKey'] ?? ''));
        if ($contextKey !== '') {
            $contextValue = data_get($context->runtimeContext, $contextKey);
            if ($contextValue !== null) {
                $query->where($model->getQualifiedKeyName(), $contextValue);
            }
        }

        $mode = (string) ($binding['mode'] ?? 'single');
        if ($mode === 'collection') {
            return $this->collection($query, $spec);
        }

        $recordId = $binding['recordId'] ?? null;
        if ($recordId !== null && $recordId !== '') {
            $query->whereKey($recordId);
        }

        $record = $query->first();
        return $record?->toArray();
    }

    private function applyRelations(Builder $query, array $spec): void
    {
        $relations = array_values(array_filter((array) ($spec['with'] ?? []), fn ($relation) => is_string($relation) && preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $relation)));
        if ($relations !== []) {
            $query->with(array_slice($relations, 0, 20));
        }
    }

    private function applyFilters(Builder $query, array $spec): void
    {
        $allowed = ['=', '!=', '<>', '>', '>=', '<', '<=', 'like', 'not like'];
        foreach (array_slice((array) ($spec['where'] ?? []), 0, 50) as $filter) {
            if (! is_array($filter)) continue;
            $column = (string) ($filter['column'] ?? '');
            $operator = strtolower((string) ($filter['operator'] ?? '='));
            if (! preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $column)) continue;
            if ($operator === 'in' || $operator === 'not in') {
                $values = is_array($filter['value'] ?? null) ? $filter['value'] : array_filter(array_map('trim', explode(',', (string) ($filter['value'] ?? ''))));
                $operator === 'in' ? $query->whereIn($column, $values) : $query->whereNotIn($column, $values);
                continue;
            }
            if ($operator === 'null') { $query->whereNull($column); continue; }
            if ($operator === 'not null') { $query->whereNotNull($column); continue; }
            if (in_array($operator, $allowed, true)) {
                $query->where($column, $operator, $filter['value'] ?? null);
            }
        }
    }

    private function applyOrdering(Builder $query, array $spec): void
    {
        foreach (array_slice((array) ($spec['orderBy'] ?? []), 0, 10) as $order) {
            if (! is_array($order)) continue;
            $column = (string) ($order['column'] ?? '');
            if (! preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $column)) continue;
            $query->orderBy($column, strtolower((string) ($order['direction'] ?? 'asc')) === 'desc' ? 'desc' : 'asc');
        }
    }

    private function collection(Builder $query, array $spec): array
    {
        $limit = max(1, min((int) ($spec['limit'] ?? 12), (int) config('page-builder.data.max_results', 100)));
        $perPage = max(1, min((int) ($spec['perPage'] ?? 0), (int) config('page-builder.data.max_results', 100)));

        if ($perPage > 0) {
            /** @var LengthAwarePaginator $paginator */
            $paginator = $query->paginate($perPage, ['*'], 'page', max(1, (int) ($spec['page'] ?? request()->integer('page', 1))));
            return [
                'items' => array_map(fn (Model $item) => $item->toArray(), $paginator->items()),
                'pagination' => [
                    'currentPage' => $paginator->currentPage(),
                    'perPage' => $paginator->perPage(),
                    'lastPage' => $paginator->lastPage(),
                    'total' => $paginator->total(),
                    'hasMorePages' => $paginator->hasMorePages(),
                ],
            ];
        }

        return [
            'items' => $query->limit($limit)->get()->map->toArray()->all(),
            'pagination' => null,
        ];
    }
}
