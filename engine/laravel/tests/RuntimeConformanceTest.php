<?php

namespace Tests\Engine\Laravel;

use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\RuntimeRenderer;

final class RuntimeConformanceTest extends TestCase
{
    public function test_laravel_runtime_matches_canonical_conformance_fixture(): void
    {
        $fixture = json_decode(
            file_get_contents(base_path('specification/conformance/canonical-runtime.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        $result = app(RuntimeRenderer::class)->render(
            $fixture['page'],
            [],
            $fixture['context'],
            $fixture['registry'],
        );

        $this->assertSame($fixture['expected'], $result->toArray());
    }
}
