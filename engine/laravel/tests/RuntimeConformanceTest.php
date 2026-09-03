<?php

namespace Tests\Engine\Laravel;

use Generator;
use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\RuntimeRenderer;

final class RuntimeConformanceTest extends TestCase
{
    /** @dataProvider sharedConformanceFixtures */
    public function test_laravel_runtime_matches_shared_conformance_fixture(string $path): void
    {
        $fixture = json_decode(
            (string) file_get_contents($path),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        $result = app(RuntimeRenderer::class)->render(
            $fixture['page'],
            [],
            $fixture['context'] ?? [],
            $fixture['registry'] ?? [],
        );

        $this->assertSame($fixture['expected'], $result->toArray(), basename($path));
    }

    public static function sharedConformanceFixtures(): Generator
    {
        $root = dirname(__DIR__, 3);
        $paths = glob($root.'/specification/conformance/*.json') ?: [];
        sort($paths);

        foreach ($paths as $path) {
            yield basename($path) => [$path];
        }
    }
}
