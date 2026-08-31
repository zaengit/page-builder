<?php

namespace App\DataProviders;

use App\Blocks\BlockRenderContext;

interface BlockDataProvider
{
    public function resolve(array $attrs, BlockRenderContext $context): mixed;
}
