<?php

namespace Zaengit\PageBuilder\Engine\Laravel\Runtime;

final class ArrayPath
{
    public static function get(mixed $value, string $path): mixed
    {
        if ($path === '') {
            return $value;
        }

        foreach (explode('.', $path) as $segment) {
            if (is_array($value) && array_key_exists($segment, $value)) {
                $value = $value[$segment];
                continue;
            }

            if (is_object($value) && isset($value->{$segment})) {
                $value = $value->{$segment};
                continue;
            }

            return null;
        }

        return $value;
    }
}
