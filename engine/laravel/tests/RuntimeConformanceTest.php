<?php

namespace Tests\Engine\Laravel;

use Generator;
use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\RuntimeRenderer;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\TemplateRenderer;

final class RuntimeConformanceTest extends TestCase
{
    /** @dataProvider sharedRendererFixtures */
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

    /** @dataProvider sharedTemplateCases */
    public function test_laravel_template_runtime_matches_shared_language_case(string $name, string $template, array $context, string $expected): void
    {
        $actual = app(TemplateRenderer::class)->render($template, $context);

        $this->assertSame($expected, $actual, $name);
    }

    public static function sharedRendererFixtures(): Generator
    {
        $root = dirname(__DIR__, 3);
        $paths = glob($root.'/specification/conformance/*.json') ?: [];
        sort($paths);

        foreach ($paths as $path) {
            $fixture = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
            if (! isset($fixture['page'], $fixture['expected'])) {
                continue;
            }

            yield basename($path) => [$path];
        }
    }

    public static function sharedTemplateCases(): Generator
    {
        $root = dirname(__DIR__, 3);
        $fixture = json_decode(
            (string) file_get_contents($root.'/specification/conformance/template-language.json'),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        foreach ($fixture['templateCases'] ?? [] as $case) {
            yield (string) $case['name'] => [
                (string) $case['name'],
                (string) $case['template'],
                is_array($case['context'] ?? null) ? $case['context'] : [],
                (string) $case['expected'],
            ];
        }
    }
}
