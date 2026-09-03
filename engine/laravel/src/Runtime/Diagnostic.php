<?php

namespace Zaengit\PageBuilder\Engine\Laravel\Runtime;

final readonly class Diagnostic
{
    public function __construct(
        public string $code,
        public string $severity = 'error',
        public ?string $path = null,
        public ?string $message = null,
    ) {}

    /** @return array{code:string,severity:string,path:?string,message:?string} */
    public function toArray(): array
    {
        return [
            'code' => $this->code,
            'severity' => $this->severity,
            'path' => $this->path,
            'message' => $this->message,
        ];
    }
}
