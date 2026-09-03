<?php

namespace Tests\Feature;

use Tests\TestCase;
use Zaengit\PageBuilder\Rendering\PortableRuntimeRenderer;

final class PortableRuntimeRendererTest extends TestCase
{
    public function test_php_runtime_matches_portable_conformance_fixture(): void
    {
        $fixture = json_decode(
            file_get_contents(base_path('specification/conformance/portable-runtime.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        $result = app(PortableRuntimeRenderer::class)->render(
            $fixture['page'],
            $fixture['registry'],
            $fixture['context'],
        );

        $this->assertSame($fixture['expected'], $result);
    }
}
