<?php

namespace App\Blocks;

final readonly class BlockRenderContext
{
    public function __construct(
        public string $blockId,
        public string $blockType,
        public array $attrs,
        public mixed $data,
        public bool $preview,
    ) {}
}
