<?php

namespace Zaengit\PageBuilder\DataProviders;

interface DataProvider
{
    public function resolve(array $binding, array $attrs = [], array $context = []): mixed;
}
