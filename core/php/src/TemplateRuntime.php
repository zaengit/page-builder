<?php

namespace Zaengit\PageBuilder\Core;

final class TemplateRuntime
{
    public function renderFile(string $path, array $context): string
    {
        $template = file_get_contents($path);
        return $template === false ? '' : $this->render($template, $context);
    }

    public function render(string $template, array $context): string
    {
        $template = $this->renderLoops($template, $context);
        $template = $this->renderConditions($template, $context);
        $template = preg_replace_callback('/\{\{\{\s*([A-Za-z0-9_.]+)\s*\}\}\}/', function (array $match) use ($context): string {
            $value = ArrayPath::get($context, $match[1]);
            return $this->stringify($value, false);
        }, $template) ?? $template;

        return preg_replace_callback('/\{\{\s*([A-Za-z0-9_.]+)(?:\s*\?\?\s*(["\'])(.*?)\2)?\s*\}\}/s', function (array $match) use ($context): string {
            $value = ArrayPath::get($context, $match[1]);
            if ($value === null && array_key_exists(3, $match)) {
                $value = $match[3];
            }
            return $this->stringify($value, true);
        }, $template) ?? $template;
    }

    private function renderConditions(string $template, array $context): string
    {
        $pattern = '/\{%\s*if\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endif\s*%\}/s';
        while (preg_match($pattern, $template) === 1) {
            $template = preg_replace_callback($pattern, fn (array $match): string => $this->truthy(ArrayPath::get($context, $match[1])) ? $this->render($match[2], $context) : '', $template) ?? $template;
        }
        return $template;
    }

    private function renderLoops(string $template, array $context): string
    {
        $pattern = '/\{%\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endfor\s*%\}/s';
        while (preg_match($pattern, $template) === 1) {
            $template = preg_replace_callback($pattern, function (array $match) use ($context): string {
                $items = ArrayPath::get($context, $match[2]);
                if ($items instanceof \Traversable) {
                    $items = iterator_to_array($items, false);
                }
                if (! is_array($items)) {
                    return '';
                }
                $output = '';
                $items = array_values($items);
                $count = count($items);
                foreach ($items as $index => $item) {
                    $local = $context;
                    $local[$match[1]] = $item;
                    $local['loop'] = ['index' => $index, 'number' => $index + 1, 'first' => $index === 0, 'last' => $index === $count - 1, 'count' => $count];
                    $output .= $this->render($match[3], $local);
                }
                return $output;
            }, $template) ?? $template;
        }
        return $template;
    }

    private function truthy(mixed $value): bool
    {
        if ($value === null || $value === false || $value === '' || $value === 0 || $value === 0.0) {
            return false;
        }
        return ! is_array($value) || $value !== [];
    }

    private function stringify(mixed $value, bool $escape): string
    {
        if ($value === null) {
            return '';
        }
        if (is_bool($value)) {
            $value = $value ? '1' : '';
        } elseif (! is_scalar($value) && ! $value instanceof \Stringable) {
            return '';
        }
        $value = (string) $value;
        return $escape ? htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8', true) : $value;
    }
}
