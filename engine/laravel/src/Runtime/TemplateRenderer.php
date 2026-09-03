<?php

namespace Zaengit\PageBuilder\Engine\Laravel\Runtime;

final class TemplateRenderer
{
    public function renderFile(string $path, array $context): string
    {
        $template = file_get_contents($path);

        return $template === false ? '' : $this->render($template, $context);
    }

    public function validate(string $template): ?string
    {
        $withoutChildren = str_replace('{{{ children }}}', '', $template);
        if (str_contains($withoutChildren, '{{{') || str_contains($withoutChildren, '}}}')) {
            return 'invalid raw interpolation; only {{{ children }}} is supported';
        }

        $stripped = preg_replace('/{{\s*[A-Za-z0-9_.]+(?:\s*\?\?\s*(?:"[^"]*"|\'[^\']*\'))?\s*}}/s', '', $withoutChildren) ?? $withoutChildren;
        if (str_contains($stripped, '{{') || str_contains($stripped, '}}')) {
            return 'invalid interpolation syntax';
        }

        preg_match_all('/{%\s*(.*?)\s*%}/s', $stripped, $matches, PREG_OFFSET_CAPTURE);
        $stack = [];
        $cursor = 0;
        foreach ($matches[0] ?? [] as $index => $whole) {
            [$token, $offset] = $whole;
            $between = substr($stripped, $cursor, $offset - $cursor);
            if (str_contains($between, '{%') || str_contains($between, '%}')) {
                return 'invalid control tag syntax';
            }
            $content = trim((string) ($matches[1][$index][0] ?? ''));
            if (preg_match('/^if\s+[A-Za-z0-9_.]+$/', $content) === 1) {
                $stack[] = 'if';
            } elseif ($content === 'endif') {
                if (array_pop($stack) !== 'if') {
                    return 'unexpected endif';
                }
            } elseif (preg_match('/^for\s+[A-Za-z_][A-Za-z0-9_]*\s+in\s+[A-Za-z0-9_.]+$/', $content) === 1) {
                $stack[] = 'for';
            } elseif ($content === 'endfor') {
                if (array_pop($stack) !== 'for') {
                    return 'unexpected endfor';
                }
            } else {
                return 'unsupported control tag "'.$content.'"';
            }
            $cursor = $offset + strlen($token);
        }

        $tail = substr($stripped, $cursor);
        if (str_contains($tail, '{%') || str_contains($tail, '%}')) {
            return 'invalid control tag syntax';
        }
        if ($stack !== []) {
            return 'unclosed '.end($stack).' block';
        }

        return null;
    }

    public function render(string $template, array $context): string
    {
        $template = $this->renderLoops($template, $context);
        $template = $this->renderConditions($template, $context);
        $template = str_replace('{{{ children }}}', (string) ($context['children'] ?? ''), $template);

        return preg_replace_callback('/{{\s*([A-Za-z0-9_.]+)(?:\s*\?\?\s*(["\'])(.*?)\2)?\s*}}/s', function (array $match) use ($context): string {
            $value = $this->get($context, $match[1]);
            if ($value === null && array_key_exists(3, $match)) {
                $value = $match[3];
            }
            if ($value === null) {
                return '';
            }
            if (is_bool($value)) {
                return $value ? '1' : '';
            }
            if (! is_scalar($value) && ! $value instanceof \Stringable) {
                return '';
            }

            return str_replace('&#039;', '&#39;', htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        }, $template) ?? $template;
    }

    private function renderConditions(string $template, array $context): string
    {
        $pattern = '/{%\s*if\s+([A-Za-z0-9_.]+)\s*%}(.*?){%\s*endif\s*%}/s';
        while (preg_match($pattern, $template) === 1) {
            $template = preg_replace_callback($pattern, fn (array $match): string => $this->truthy($this->get($context, $match[1])) ? $this->render($match[2], $context) : '', $template) ?? $template;
        }

        return $template;
    }

    private function renderLoops(string $template, array $context): string
    {
        $pattern = '/{%\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([A-Za-z0-9_.]+)\s*%}(.*?){%\s*endfor\s*%}/s';
        while (preg_match($pattern, $template) === 1) {
            $template = preg_replace_callback($pattern, function (array $match) use ($context): string {
                $items = $this->get($context, $match[2]) ?? [];
                if ($items instanceof \Traversable) {
                    $items = iterator_to_array($items, false);
                }
                if (! is_array($items) || ! array_is_list($items)) {
                    return '';
                }
                $output = '';
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

    private function get(array $context, string $path): mixed
    {
        $value = $context;
        foreach (explode('.', $path) as $segment) {
            if (is_array($value) && array_key_exists($segment, $value)) {
                $value = $value[$segment];
            } elseif (is_object($value) && property_exists($value, $segment)) {
                $value = $value->{$segment};
            } else {
                return null;
            }
        }

        return $value;
    }

    private function truthy(mixed $value): bool
    {
        if ($value === null || $value === false) {
            return false;
        }
        if (is_int($value) || is_float($value)) {
            return $value != 0;
        }
        if (is_string($value)) {
            return $value !== '';
        }
        if (is_array($value)) {
            return $value !== [];
        }

        return true;
    }
}
