<?php

namespace App\DataProviders;

use App\Blocks\BlockRenderContext;
use App\Models\Product;

final class ProductDataProvider implements BlockDataProvider
{
    public function resolve(array $attrs, BlockRenderContext $context): mixed
    {
        $limit = max(1, min((int) ($attrs['limit'] ?? 8), 24));
        $category = trim((string) ($attrs['category'] ?? ''));

        return Product::query()
            ->when($category !== '', fn ($query) => $query->where('category', $category))
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }
}
