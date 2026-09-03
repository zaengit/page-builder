<?php

namespace Zaengit\PageBuilder\Engine\Laravel;

use Zaengit\PageBuilder\Blocks\PageRenderer;
use Zaengit\PageBuilder\Rendering\RenderResult;
use Zaengit\PageBuilder\Rendering\RenderingEngine;

final class LaravelRenderingEngine implements RenderingEngine
{
    public function __construct(private readonly PageRenderer $renderer) {}

    /** @param array<string, mixed> $page */
    public function render(array $page): RenderResult
    {
        return new RenderResult(
            $this->renderer->render($page, false),
            $this->renderer->assets(),
            [],
        );
    }
}
