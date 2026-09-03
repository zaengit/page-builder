<?php

namespace Tests\Feature;

use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\ProcessRenderingEngine;

final class ProcessRenderingEngineTest extends TestCase
{
    public function test_it_renders_through_the_universal_process_protocol(): void
    {
        $engine = new ProcessRenderingEngine(
            [PHP_BINARY, $this->enginePath('tests/Fixtures/process-renderer.php')],
            $this->blocksPath(),
            5000,
        );

        $result = $engine->render(['title' => 'Hello <Universal>']);

        $this->assertSame('<main data-engine="fixture">Hello &lt;Universal&gt;</main>', $result->html);
        $this->assertSame(['css' => ['fixture.css'], 'js' => ['fixture.js']], $result->assets);
        $this->assertSame([
            ['code' => 'fixture:ok', 'severity' => 'warning', 'path' => null, 'message' => null],
        ], $result->diagnostics);
    }
}
