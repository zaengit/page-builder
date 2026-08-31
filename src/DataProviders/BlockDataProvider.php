<?php

namespace Zaengit\PageBuilder\DataProviders;

use Zaengit\PageBuilder\Blocks\BlockRenderContext;

interface BlockDataProvider
{
    public function resolve(array $attrs, BlockRenderContext $context): mixed;
}
