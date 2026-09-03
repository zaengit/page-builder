<?php

namespace Zaengit\PageBuilder\DataProviders;

use Zaengit\PageBuilder\Blocks\BlockRenderContext;

final class ContextDataProvider implements BlockDataProvider
{
    public function resolve(array $attrs, BlockRenderContext $context): mixed
    {
        return $context->runtimeContext;
    }

    public function resolveBinding(array $binding, array $attrs, BlockRenderContext $context): mixed
    {
        return $context->runtimeContext;
    }
}
