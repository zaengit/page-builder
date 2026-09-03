<?php

namespace Zaengit\PageBuilder\Rendering;

final readonly class RenderResult
{
    /**
     * @param  array{css:list<string>,js:list<string>}  $assets
     * @param  list<string>  $diagnostics
     */
    public function __construct(
        public string $html,
        public array $assets = ['css' => [], 'js' => []],
        public array $diagnostics = [],
    ) {}

    /** @return array{html:string,assets:array{css:list<string>,js:list<string>},diagnostics:list<string>} */
    public function toArray(): array
    {
        return [
            'html' => $this->html,
            'assets' => $this->assets,
            'diagnostics' => $this->diagnostics,
        ];
    }
}
