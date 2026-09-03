<?php

namespace Zaengit\PageBuilder\Blocks;

use Illuminate\Validation\ValidationException;

final class LayoutSchemaValidator
{
    private const BREAKPOINTS = ['desktop', 'tablet', 'mobile'];
    private const SECTION_KEYS = ['mode', 'gap', 'rowGap', 'columnGap', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent', 'gridColumns', 'gridRows', 'gridAutoFlow'];
    private const ITEM_KEYS = ['flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'order', 'columnSpan', 'rowSpan', 'columnStart', 'rowStart'];

    public static function section(mixed $layout, string $path): array
    {
        if (! is_array($layout)) self::fail($path, 'Layout must be an object.');
        self::knownKeys($layout, self::SECTION_KEYS, $path);
        $result = [];
        foreach ($layout as $key => $value) {
            $result[$key] = self::responsive($value, $path.'.'.$key, fn (mixed $item, string $itemPath) => self::sectionValue($key, $item, $itemPath));
        }
        return $result;
    }

    public static function item(mixed $item, string $path): array
    {
        if (! is_array($item)) self::fail($path, 'Layout item must be an object.');
        self::knownKeys($item, self::ITEM_KEYS, $path);
        $result = [];
        foreach ($item as $key => $value) {
            $result[$key] = self::responsive($value, $path.'.'.$key, fn (mixed $entry, string $itemPath) => self::itemValue($key, $entry, $itemPath));
        }
        return $result;
    }

    private static function responsive(mixed $value, string $path, callable $validate): array
    {
        if (! is_array($value)) self::fail($path, 'Responsive layout values must be objects.');
        $result = [];
        foreach ($value as $breakpoint => $entry) {
            if (! in_array($breakpoint, self::BREAKPOINTS, true)) self::fail($path, 'Unknown responsive breakpoint.');
            $result[$breakpoint] = $validate($entry, $path.'.'.$breakpoint);
        }
        return $result;
    }

    private static function sectionValue(string $key, mixed $value, string $path): mixed
    {
        return match ($key) {
            'mode' => self::enum($value, ['block', 'flex', 'grid'], $path),
            'flexDirection' => self::enum($value, ['row', 'column', 'row-reverse', 'column-reverse'], $path),
            'flexWrap' => self::enum($value, ['nowrap', 'wrap', 'wrap-reverse'], $path),
            'justifyContent' => self::enum($value, ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'], $path),
            'alignItems' => self::enum($value, ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'], $path),
            'alignContent' => self::enum($value, ['stretch', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'], $path),
            'gridAutoFlow' => self::enum($value, ['row', 'column', 'row dense', 'column dense'], $path),
            'gridColumns' => self::integer($value, 1, 24, $path),
            'gridRows' => $value === 'auto' ? 'auto' : self::integer($value, 1, 100, $path),
            'gap', 'rowGap', 'columnGap' => self::shortString($value, $path),
            default => $value,
        };
    }

    private static function itemValue(string $key, mixed $value, string $path): mixed
    {
        return match ($key) {
            'flexGrow', 'flexShrink' => self::number($value, 0, 100, $path),
            'order' => self::integer($value, -999, 999, $path),
            'columnSpan', 'rowSpan' => self::integer($value, 1, 24, $path),
            'columnStart', 'rowStart' => $value === 'auto' ? 'auto' : self::integer($value, 1, 100, $path),
            'alignSelf' => self::enum($value, ['auto', 'stretch', 'flex-start', 'center', 'flex-end', 'baseline'], $path),
            'flexBasis' => self::shortString($value, $path),
            default => $value,
        };
    }

    private static function knownKeys(array $value, array $allowed, string $path): void
    {
        foreach (array_keys($value) as $key) {
            if (! is_string($key) || ! in_array($key, $allowed, true)) self::fail($path.'.'.$key, 'Unknown layout property.');
        }
    }

    private static function enum(mixed $value, array $allowed, string $path): string
    {
        if (! is_string($value) || ! in_array($value, $allowed, true)) self::fail($path, 'Invalid layout option.');
        return $value;
    }

    private static function integer(mixed $value, int $min, int $max, string $path): int
    {
        if (! is_int($value) || $value < $min || $value > $max) self::fail($path, "Value must be an integer between {$min} and {$max}.");
        return $value;
    }

    private static function number(mixed $value, float $min, float $max, string $path): int|float
    {
        if ((! is_int($value) && ! is_float($value)) || $value < $min || $value > $max) self::fail($path, "Value must be between {$min} and {$max}.");
        return $value;
    }

    private static function shortString(mixed $value, string $path): string
    {
        if (! is_string($value) || mb_strlen($value) > 100) self::fail($path, 'Layout CSS value must be a string up to 100 characters.');
        return $value;
    }

    private static function fail(string $path, string $message): never
    {
        throw ValidationException::withMessages([$path => [$message]]);
    }
}
