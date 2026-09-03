<?php

namespace Tests\Engine\Laravel;

use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\RuntimeRenderer;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\TemplateRenderer;

final class RuntimeConformanceTest extends TestCase
{
    public function test_laravel_runtime_matches_all_shared_renderer_fixtures(): void
    {
        $root = dirname(__DIR__, 3);
        $paths = glob($root.'/specification/conformance/*.json') ?: [];
        sort($paths);
        $executed = 0;

        foreach ($paths as $path) {
            $fixture = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
            if (! isset($fixture['page'], $fixture['expected'])) {
                continue;
            }

            $result = app(RuntimeRenderer::class)->render(
                $fixture['page'],
                [],
                $fixture['context'] ?? [],
                $fixture['registry'] ?? [],
            );

            $this->assertSame($fixture['expected'], $result->toArray(), basename($path));
            $executed++;
        }

        $this->assertGreaterThan(0, $executed, 'No shared renderer conformance fixtures executed.');
    }

    public function test_laravel_template_runtime_matches_all_shared_language_cases(): void
    {
        $root = dirname(__DIR__, 3);
        $fixture = json_decode(
            (string) file_get_contents($root.'/specification/conformance/template-language.json'),
            true,
            flags: JSON_THROW_ON_ERROR,
        );
        $renderer = app(TemplateRenderer::class);
        $executed = 0;

        foreach ($fixture['templateCases'] ?? [] as $case) {
            $actual = $renderer->render(
                (string) $case['template'],
                is_array($case['context'] ?? null) ? $case['context'] : [],
            );

            $this->assertSame((string) $case['expected'], $actual, (string) $case['name']);
            $executed++;
        }

        $this->assertGreaterThan(0, $executed, 'No shared template language cases executed.');
    }
}
