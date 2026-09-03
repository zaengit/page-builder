<?php

namespace Zaengit\PageBuilder\Engine\Laravel;

interface RenderingEngine
{
    /** @param array<string, mixed> $page */
    public function render(array $page): RenderResult;
}
