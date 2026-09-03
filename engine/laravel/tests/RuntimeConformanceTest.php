<?php

namespace Tests\Engine\Laravel;

use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\RuntimeRenderer;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\TemplateRenderer;

final class RuntimeConformanceTest extends TestCase
{
    private function conformanceRoot(): string
    {
        $configured = getenv('PAGE_BUILDER_CONFORMANCE_ROOT');
        $root = is_string($configured) && $configured !== ''
            ? $configured
            : dirname(__DIR__, 3).'/specification/conformance';

        if (! is_dir($root)) {
            $this->markTestSkipped('Shared conformance corpus is not bundled with the extracted Laravel package.');
        }

        return $root;
    }

    public function test_laravel_runtime_matches_all_shared_renderer_fixtures(): void
    {
        $paths = glob($this->conformanceRoot().'/*.json') ?: [];
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
        $fixture = json_decode(
            (string) file_get_contents($this->conformanceRoot().'/template-language.json'),
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
