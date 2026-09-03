<?php

namespace Zaengit\PageBuilder\Rendering;

use RuntimeException;
use Throwable;

final class ProcessRenderingEngine implements RenderingEngine
{
    /** @param list<string> $command */
    public function __construct(
        private readonly array $command,
        private readonly string $blockRoot,
        private readonly int $timeoutMs = 5000,
    ) {}

    public function render(array $page): RenderResult
    {
        if ($this->command === []) {
            throw new RuntimeException('Renderer process command is not configured.');
        }

        $pipes = [];
        $process = proc_open(
            $this->command,
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            null,
            null,
            ['bypass_shell' => true],
        );
        if (! is_resource($process)) {
            throw new RuntimeException('Unable to start renderer process.');
        }

        try {
            fwrite($pipes[0], json_encode([
                'version' => 1,
                'page' => $page,
                'context' => $this->runtimeContext(),
                'blockRoot' => $this->blockRoot,
            ], JSON_THROW_ON_ERROR));
            fclose($pipes[0]);
            stream_set_blocking($pipes[1], false);
            stream_set_blocking($pipes[2], false);
            $stdout = '';
            $stderr = '';
            $started = hrtime(true);
            $exitCode = -1;

            while (true) {
                $stdout .= stream_get_contents($pipes[1]) ?: '';
                $stderr .= stream_get_contents($pipes[2]) ?: '';
                $status = proc_get_status($process);
                if (! $status['running']) {
                    $exitCode = $status['exitcode'];
                    break;
                }
                if (((hrtime(true) - $started) / 1_000_000) > $this->timeoutMs) {
                    proc_terminate($process, 9);
                    throw new RuntimeException('renderer_timeout');
                }
                usleep(1000);
            }

            $stdout .= stream_get_contents($pipes[1]) ?: '';
            $stderr .= stream_get_contents($pipes[2]) ?: '';
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($process);
            $process = null;

            if ($exitCode !== 0) {
                throw new RuntimeException('renderer_process_failed:'.trim($stderr));
            }

            try {
                $decoded = json_decode($stdout, true, flags: JSON_THROW_ON_ERROR);
            } catch (Throwable $exception) {
                throw new RuntimeException('renderer_invalid_json', previous: $exception);
            }
            if (! is_array($decoded) || ! is_string($decoded['html'] ?? null)) {
                throw new RuntimeException('renderer_invalid_result');
            }

            $assets = is_array($decoded['assets'] ?? null) ? $decoded['assets'] : [];
            $css = array_values(array_filter((array) ($assets['css'] ?? []), 'is_string'));
            $js = array_values(array_filter((array) ($assets['js'] ?? []), 'is_string'));
            $diagnostics = [];
            foreach ((array) ($decoded['diagnostics'] ?? []) as $diagnostic) {
                if (is_string($diagnostic)) {
                    $diagnostics[] = ['code' => $diagnostic, 'severity' => 'warning', 'path' => null, 'message' => null];
                    continue;
                }
                if (is_array($diagnostic) && is_string($diagnostic['code'] ?? null) && is_string($diagnostic['severity'] ?? null)) {
                    $diagnostics[] = [
                        'code' => $diagnostic['code'],
                        'severity' => $diagnostic['severity'],
                        'path' => is_string($diagnostic['path'] ?? null) ? $diagnostic['path'] : null,
                        'message' => is_string($diagnostic['message'] ?? null) ? $diagnostic['message'] : null,
                    ];
                }
            }

            return new RenderResult($decoded['html'], ['css' => $css, 'js' => $js], $diagnostics);
        } finally {
            foreach ($pipes as $pipe) {
                if (is_resource($pipe)) {
                    fclose($pipe);
                }
            }
            if (is_resource($process)) {
                proc_terminate($process, 9);
                proc_close($process);
            }
        }
    }

    /** @return array<string, mixed> */
    private function runtimeContext(): array
    {
        if (! app()->bound('request')) {
            return [];
        }
        $request = request();
        $explicit = $request->attributes->get('page_builder_context', []);
        $route = $request->route();
        $routeParameters = is_object($route) && method_exists($route, 'parameters')
            ? $route->parameters()
            : [];

        return array_replace_recursive(
            is_array($routeParameters) ? $routeParameters : [],
            is_array($explicit) ? $explicit : [],
        );
    }
}
