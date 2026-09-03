<?php

namespace Tests\Feature;

use Tests\TestCase;
use Zaengit\PageBuilder\Core\RuntimeRenderer;

final class UniversalCoreConformanceTest extends TestCase
{
    public function test_php_core_matches_canonical_runtime_fixture(): void
    {
        $fixture = json_decode(
            (string) file_get_contents(base_path('specification/conformance/canonical-runtime.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        $result = app(RuntimeRenderer::class)->render(
            $fixture['page'],
            [],
            $fixture['context'],
            $fixture['registry'],
        );

        self::assertSame($fixture['expected'], $result->toArray());
    }
}
