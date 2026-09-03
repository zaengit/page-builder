<?php

namespace Zaengit\PageBuilder\Engine\Laravel\Runtime;

final readonly class RuntimeRenderResult
{
    /** @param array{css:list<string>,js:list<string>} $assets @param list<array{code:string,severity:string,path:?string,message:?string}> $diagnostics */
    public function __construct(
        public string $html,
        public array $assets = ['css' => [], 'js' => []],
        public array $diagnostics = [],
    ) {}
}
