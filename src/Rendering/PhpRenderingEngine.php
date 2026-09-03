<?php

namespace Zaengit\PageBuilder\Rendering;

use Zaengit\PageBuilder\Blocks\PageRenderer;

final class PhpRenderingEngine implements RenderingEngine
{
    public function __construct(private readonly PageRenderer $renderer) {}

    public function render(array $page): RenderResult
    {
        return new RenderResult(
            $this->renderer->render($page, false),
            $this->renderer->assets(),
            [],
        );
    }
}
