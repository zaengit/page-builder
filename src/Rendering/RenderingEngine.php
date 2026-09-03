<?php

namespace Zaengit\PageBuilder\Rendering;

interface RenderingEngine
{
    /** @param array<string, mixed> $page */
    public function render(array $page): RenderResult;
}
