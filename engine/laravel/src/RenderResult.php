<?php

namespace Zaengit\PageBuilder\Engine\Laravel;

final readonly class RenderResult
{
    /**
     * @param  array{css:list<string>,js:list<string>}  $assets
     * @param  list<array{code:string,severity:string,path:?string,message:?string}>  $diagnostics
     */
    public function __construct(
        public string $html,
        public array $assets = ['css' => [], 'js' => []],
        public array $diagnostics = [],
    ) {}

    /** @return array{html:string,assets:array{css:list<string>,js:list<string>},diagnostics:list<array{code:string,severity:string,path:?string,message:?string}>} */
    public function toArray(): array
    {
        return [
            'html' => $this->html,
            'assets' => $this->assets,
            'diagnostics' => $this->diagnostics,
        ];
    }
}
