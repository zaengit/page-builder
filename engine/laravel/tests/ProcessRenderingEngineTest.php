<?php

namespace Tests\Engine\Laravel;

use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\ProcessRenderingEngine;

final class ProcessRenderingEngineTest extends TestCase
{
    public function test_invalid_page_is_rejected_before_process_start(): void
    {
        $engine = new ProcessRenderingEngine([PHP_BINARY, '-r', 'echo "should-not-run";'], sys_get_temp_dir());
        $result = $engine->render(['version' => 2, 'blocks' => []]);

        $this->assertSame('', $result->html);
        $this->assertSame('protocol_invalid_request', $result->diagnostics[0]['code']);
        $this->assertSame('$.page', $result->diagnostics[0]['path']);
    }

    public function test_malformed_process_output_maps_to_stable_diagnostic(): void
    {
        $engine = new ProcessRenderingEngine([PHP_BINARY, '-r', 'echo "not-json";'], sys_get_temp_dir());
        $result = $engine->render(['version' => 1, 'blocks' => []]);

        $this->assertSame('', $result->html);
        $this->assertSame('renderer_process_error', $result->diagnostics[0]['code']);
    }

    public function test_valid_protocol_result_is_validated_and_returned(): void
    {
        $payload = json_encode([
            'html' => '<main>ok</main>',
            'assets' => ['css' => ['a.css', 'a.css'], 'js' => ['a.js']],
            'diagnostics' => [[
                'code' => 'example',
                'severity' => 'info',
                'path' => null,
                'message' => 'ok',
            ]],
        ], JSON_THROW_ON_ERROR);
        $script = 'stream_get_contents(STDIN); echo '.var_export($payload, true).';';
        $engine = new ProcessRenderingEngine([PHP_BINARY, '-r', $script], sys_get_temp_dir());
        $result = $engine->render(['version' => 1, 'blocks' => []]);

        $this->assertSame('<main>ok</main>', $result->html);
        $this->assertSame(['css' => ['a.css'], 'js' => ['a.js']], $result->assets);
        $this->assertSame('example', $result->diagnostics[0]['code']);
    }
}
