<?php

namespace Zaengit\PageBuilder\Engine\Laravel;

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
            return $this->error('renderer_process_error', '$', 'Renderer process command is not configured.');
        }
        if (($page['version'] ?? null) !== EngineVersion::PAGE || ! is_array($page['blocks'] ?? null)) {
            return $this->error('protocol_invalid_request', '$.page', 'Page must conform to canonical version 1.');
        }
        if (trim($this->blockRoot) === '') {
            return $this->error('protocol_invalid_request', '$.blockRoot', 'blockRoot is required.');
        }

        $request = [
            'version' => EngineVersion::RENDERER_PROTOCOL,
            'page' => $page,
            'context' => $this->runtimeContext(),
            'blockRoot' => $this->blockRoot,
        ];

        $pipes = [];
        $process = proc_open(
            $this->command,
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            null,
            ['PAGE_BUILDER_RENDER_TIMEOUT_MS' => (string) $this->timeoutMs],
            ['bypass_shell' => true],
        );

        if (! is_resource($process)) {
            return $this->error('renderer_process_error', '$', 'Unable to start renderer process.');
        }

        try {
            try {
                fwrite($pipes[0], json_encode($request, JSON_THROW_ON_ERROR));
            } catch (Throwable $exception) {
                return $this->error('protocol_invalid_request', '$', $exception->getMessage());
            }
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

                    return $this->error('render_timeout', '$', 'Renderer process exceeded the configured timeout.');
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
                return $this->error('renderer_process_error', '$', trim($stderr) ?: 'Renderer process exited unsuccessfully.');
            }

            try {
                $decoded = json_decode($stdout, true, flags: JSON_THROW_ON_ERROR);
            } catch (Throwable) {
                return $this->error('renderer_process_error', '$', 'Renderer process returned invalid JSON.');
            }

            if (! is_array($decoded) || ! is_string($decoded['html'] ?? null) || ! is_array($decoded['assets'] ?? null) || ! is_array($decoded['diagnostics'] ?? null)) {
                return $this->error('renderer_process_error', '$', 'Renderer result does not match protocol v1.');
            }

            $assets = $decoded['assets'];
            if (! is_array($assets['css'] ?? null) || ! is_array($assets['js'] ?? null)) {
                return $this->error('renderer_process_error', '$.assets', 'Renderer assets do not match protocol v1.');
            }
            $css = array_values(array_unique(array_filter($assets['css'], 'is_string')));
            $js = array_values(array_unique(array_filter($assets['js'], 'is_string')));
            $diagnostics = [];

            foreach ($decoded['diagnostics'] as $index => $diagnostic) {
                if (! is_array($diagnostic)
                    || ! is_string($diagnostic['code'] ?? null)
                    || ! in_array($diagnostic['severity'] ?? null, ['info', 'warning', 'error'], true)
                    || ! array_key_exists('path', $diagnostic)
                    || ! array_key_exists('message', $diagnostic)
                    || (! is_null($diagnostic['path']) && ! is_string($diagnostic['path']))
                    || (! is_null($diagnostic['message']) && ! is_string($diagnostic['message']))) {
                    return $this->error('renderer_process_error', '$.diagnostics['.$index.']', 'Invalid renderer diagnostic.');
                }
                $diagnostics[] = [
                    'code' => $diagnostic['code'],
                    'severity' => $diagnostic['severity'],
                    'path' => $diagnostic['path'],
                    'message' => $diagnostic['message'],
                ];
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

    private function error(string $code, ?string $path, ?string $message): RenderResult
    {
        return new RenderResult('', ['css' => [], 'js' => []], [[
            'code' => $code,
            'severity' => 'error',
            'path' => $path,
            'message' => $message,
        ]]);
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
