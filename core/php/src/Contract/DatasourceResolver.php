<?php

namespace Zaengit\PageBuilder\Core\Contract;

interface DatasourceResolver
{
    /** @param array<string,mixed> $binding @param array<string,mixed> $attrs @param array<string,mixed> $context */
    public function resolve(array $binding, array $attrs, array $context): mixed;
}
