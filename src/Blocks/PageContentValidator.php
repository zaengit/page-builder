<?php

namespace Zaengit\PageBuilder\Blocks;

use Illuminate\Validation\ValidationException;
use RuntimeException;

final class PageContentValidator
{
    private const STYLE_KEYS = [
        'className', 'background', 'color', 'padding', 'margin', 'gap', 'width', 'textAlign', 'fontSize', 'borderRadius', 'boxShadow', 'hidden', 'custom',
    ];

    private const COLOR_SCHEME_KEYS = [
        'background', 'foreground', 'primary', 'primaryForeground', 'secondary', 'secondaryForeground', 'accent', 'accentForeground', 'muted', 'mutedForeground', 'border',
    ];

    public function __construct(
        private readonly BlockRegistry $registry,
        private readonly BlockMigrationRegistry $migrations,
    ) {}

    public function validate(array $content): array
    {
        $blocks = $content['blocks'] ?? null;
        if (! is_array($blocks) || ! array_is_list($blocks)) $this->fail('blocks', 'The blocks field must be a list.');
        $seenIds = [];
        $count = 0;
        $validated = [];
        foreach ($blocks as $index => $block) $validated[] = $this->validateBlock($block, "blocks.{$index}", 0, $seenIds, $count);
        $result = ['blocks' => $validated, 'schemaVersion' => max(1, (int) ($content['schemaVersion'] ?? 1))];
        if (array_key_exists('settings', $content)) $result['settings'] = $this->validateSettings($content['settings']);
        return $result;
    }

    private function validateBlock(mixed $block, string $path, int $depth, array &$seenIds, int &$count): array
    {
        if (! is_array($block)) $this->fail($path, 'Each block must be an object.');
        if ($depth > $this->limit('max_depth', 20)) $this->fail($path, 'Maximum block nesting depth exceeded.');
        if (++$count > $this->limit('max_blocks', 1000)) $this->fail('blocks', 'Maximum number of blocks exceeded.');
        $id = $block['id'] ?? null;
        if (! is_string($id) || $id === '' || mb_strlen($id) > 100) $this->fail("{$path}.id", 'Block id must be a non-empty string up to 100 characters.');
        if (isset($seenIds[$id])) $this->fail("{$path}.id", 'Block ids must be unique within a page.');
        $seenIds[$id] = true;
        $type = $block['type'] ?? null;
        if (! is_string($type) || $type === '' || mb_strlen($type) > 100) $this->fail("{$path}.type", 'Block type must be a non-empty string up to 100 characters.');
        $definition = $this->registry->get($type);
        if (! $definition) $this->fail("{$path}.type", "Unknown block type [{$type}].");
        try { $block = $this->migrations->migrate($block, (int) ($definition['version'] ?? 1)); }
        catch (RuntimeException $e) { $this->fail("{$path}.version", $e->getMessage()); }

        $attrs = $block['attrs'] ?? null;
        if (! is_array($attrs)) $this->fail("{$path}.attrs", 'Block attrs must be an object.');
        foreach ($attrs as $name => $value) {
            if (! is_string($name) || ! isset($definition['attributes'][$name])) $this->fail("{$path}.attrs.{$name}", 'Unknown block attribute.');
            $this->validateAttribute($value, $definition['attributes'][$name], "{$path}.attrs.{$name}");
        }

        $children = $block['children'] ?? [];
        if (! is_array($children) || ! array_is_list($children)) $this->fail("{$path}.children", 'Block children must be a list.');
        if ($children !== [] && ! ($definition['supports']['children'] ?? false)) $this->fail("{$path}.children", 'This block type does not support children.');
        $allowedChildren = $definition['supports']['allowedChildren'] ?? null;
        if ($children !== [] && is_array($allowedChildren) && $allowedChildren !== []) {
            foreach ($children as $index => $child) {
                $childType = is_array($child) ? ($child['type'] ?? null) : null;
                if (! is_string($childType) || ! in_array($childType, $allowedChildren, true)) $this->fail("{$path}.children.{$index}.type", 'This child block type is not allowed inside the parent block.');
            }
        }

        $slotDefinitions = is_array($definition['supports']['slots'] ?? null) ? $definition['supports']['slots'] : [];
        $slots = [];
        foreach ($slotDefinitions as $slotDefinition) if (is_array($slotDefinition) && is_string($slotDefinition['name'] ?? null)) $slots[$slotDefinition['name']] = $slotDefinition;
        $validatedChildren = [];
        foreach ($children as $index => $child) {
            if (is_array($child) && isset($child['slot'])) {
                $slot = is_string($child['slot']) ? ($slots[$child['slot']] ?? null) : null;
                if (! $slot) $this->fail("{$path}.children.{$index}.slot", 'Unknown parent slot.');
                if (($slot['allowedChildren'] ?? []) !== [] && ! in_array($child['type'] ?? null, $slot['allowedChildren'], true)) $this->fail("{$path}.children.{$index}.type", 'This block type is not allowed in the selected slot.');
            }
            $validatedChildren[] = $this->validateBlock($child, "{$path}.children.{$index}", $depth + 1, $seenIds, $count);
        }

        $validated = ['id' => $id, 'type' => $type, 'version' => $block['version'], 'attrs' => $attrs];
        if (array_key_exists('children', $block) || ($definition['supports']['children'] ?? false)) $validated['children'] = $validatedChildren;
        if (isset($block['slot']) && is_string($block['slot'])) $validated['slot'] = mb_substr($block['slot'], 0, 100);
        if (isset($block['colorSchemeId'])) {
            if (! is_string($block['colorSchemeId']) || $block['colorSchemeId'] === '' || mb_strlen($block['colorSchemeId']) > 100) $this->fail("{$path}.colorSchemeId", 'Color scheme id must be a non-empty string up to 100 characters.');
            $validated['colorSchemeId'] = $block['colorSchemeId'];
        }
        if (isset($block['styles'])) $validated['styles'] = $this->validateStyles($block['styles'], "{$path}.styles");
        if (isset($block['layout'])) $validated['layout'] = LayoutSchemaValidator::section($block['layout'], "{$path}.layout");
        if (isset($block['layoutItem'])) $validated['layoutItem'] = LayoutSchemaValidator::item($block['layoutItem'], "{$path}.layoutItem");
        if (isset($block['bindings'])) $validated['bindings'] = $this->validateBindings($block['bindings'], $definition, "{$path}.bindings");
        if (isset($block['lock'])) $validated['lock'] = $this->validateLock($block['lock'], "{$path}.lock");
        return $validated;
    }

    private function validateAttribute(mixed $value, array $schema, string $path): void
    {
        if (($schema['responsive'] ?? false) === true) {
            if (! is_array($value)) $this->fail($path, 'Responsive attributes must be an object.');
            foreach ($value as $breakpoint => $item) {
                if (! in_array($breakpoint, ['desktop', 'tablet', 'mobile'], true)) $this->fail($path, 'Unknown responsive breakpoint.');
                $next = $schema; $next['responsive'] = false; $this->validateAttribute($item, $next, $path.'.'.$breakpoint);
            }
            return;
        }
        $type = $schema['type'] ?? 'string';
        $valid = match ($type) {
            'string', 'textarea', 'url', 'image', 'color', 'date', 'code' => is_string($value),
            'number', 'range' => is_int($value) || is_float($value),
            'boolean' => is_bool($value),
            'select' => in_array($value, $schema['options'] ?? [], true),
            'repeater' => $this->validRepeater($value, $schema, $path),
            default => false,
        };
        if (! $valid) $this->fail($path, "Invalid value for attribute type [{$type}].");
        if (is_string($value) && mb_strlen($value) > $this->limit('max_string_length', 100000)) $this->fail($path, 'String attribute exceeds the configured maximum length.');
        if (($type === 'number' || $type === 'range') && is_numeric($value)) {
            if (isset($schema['min']) && $value < $schema['min']) $this->fail($path, "Value must be at least {$schema['min']}.");
            if (isset($schema['max']) && $value > $schema['max']) $this->fail($path, "Value may not be greater than {$schema['max']}.");
        }
    }

    private function validRepeater(mixed $value, array $schema, string $path): bool
    {
        if (! is_array($value) || ! array_is_list($value)) return false;
        if (count($value) > $this->limit('max_repeater_items', 500)) $this->fail($path, 'Repeater exceeds the configured maximum number of items.');
        $fields = $schema['fields'] ?? [];
        foreach ($value as $index => $item) {
            if (! is_array($item)) $this->fail("{$path}.{$index}", 'Repeater items must be objects.');
            foreach ($item as $name => $fieldValue) {
                if (! is_string($name) || ! isset($fields[$name])) $this->fail("{$path}.{$index}.{$name}", 'Unknown repeater field.');
                $this->validateAttribute($fieldValue, $fields[$name], "{$path}.{$index}.{$name}");
            }
        }
        return true;
    }

    private function validateStyles(mixed $styles, string $path): array
    {
        if (! is_array($styles)) $this->fail($path, 'Styles must be an object.');
        foreach ($styles as $key => $value) {
            if (! in_array($key, self::STYLE_KEYS, true)) $this->fail($path.'.'.$key, 'Unknown style property.');
            $this->assertBoundedValue($value, $path.'.'.$key);
        }
        return $styles;
    }

    private function validateBindings(mixed $bindings, array $definition, string $path): array
    {
        if (! is_array($bindings)) $this->fail($path, 'Bindings must be an object.');
        foreach ($bindings as $attr => $binding) {
            if (! isset($definition['attributes'][$attr]) || ! is_array($binding) || ! is_string($binding['source'] ?? null)) $this->fail($path.'.'.$attr, 'Invalid dynamic binding.');
            if (mb_strlen($binding['source']) > 100) $this->fail($path.'.'.$attr.'.source', 'Binding source is too long.');
            if (isset($binding['path']) && ! is_string($binding['path'])) $this->fail($path.'.'.$attr.'.path', 'Binding path must be a string.');
            if (isset($binding['path']) && mb_strlen($binding['path']) > 500) $this->fail($path.'.'.$attr.'.path', 'Binding path is too long.');
            if (array_key_exists('fallback', $binding)) $this->assertBoundedValue($binding['fallback'], $path.'.'.$attr.'.fallback');
        }
        return $bindings;
    }

    private function validateLock(mixed $lock, string $path): array
    {
        if (! is_array($lock)) $this->fail($path, 'Lock must be an object.');
        $result = [];
        foreach (['move', 'remove', 'edit'] as $key) {
            if (! array_key_exists($key, $lock)) continue;
            if (! is_bool($lock[$key])) $this->fail($path.'.'.$key, 'Lock values must be boolean.');
            $result[$key] = $lock[$key];
        }
        return $result;
    }

    private function validateSettings(mixed $settings): array
    {
        if (! is_array($settings)) $this->fail('settings', 'Page settings must be an object.');
        $allowed = ['contentWidth', 'background', 'customClass', 'customCss', 'tokens', 'typography', 'colorSchemes', 'defaultColorSchemeId'];
        foreach (array_keys($settings) as $key) if (! in_array($key, $allowed, true)) $this->fail('settings.'.$key, 'Unknown page setting.');
        if (isset($settings['customCss'])) {
            if (! is_string($settings['customCss'])) $this->fail('settings.customCss', 'Custom CSS must be a string.');
            if (mb_strlen($settings['customCss']) > $this->limit('max_custom_css_length', 200000)) $this->fail('settings.customCss', 'Custom CSS exceeds the configured maximum length.');
        }
        if (isset($settings['tokens'])) {
            if (! is_array($settings['tokens'])) $this->fail('settings.tokens', 'Tokens must be an object.');
            if (count($settings['tokens']) > $this->limit('max_tokens', 500)) $this->fail('settings.tokens', 'Token count exceeds the configured maximum.');
            foreach ($settings['tokens'] as $key => $value) {
                if (! is_string($key) || mb_strlen($key) > 100 || ! is_scalar($value)) $this->fail('settings.tokens', 'Tokens must use short string keys and scalar values.');
                $this->assertBoundedValue($value, 'settings.tokens.'.$key);
            }
        }
        if (isset($settings['colorSchemes'])) $settings['colorSchemes'] = $this->validateColorSchemes($settings['colorSchemes']);
        if (isset($settings['defaultColorSchemeId'])) {
            if (! is_string($settings['defaultColorSchemeId']) || $settings['defaultColorSchemeId'] === '' || mb_strlen($settings['defaultColorSchemeId']) > 100) $this->fail('settings.defaultColorSchemeId', 'Default color scheme id must be a non-empty string up to 100 characters.');
        }
        foreach (['contentWidth', 'background', 'customClass'] as $key) if (isset($settings[$key])) $this->assertBoundedValue($settings[$key], 'settings.'.$key);
        if (isset($settings['typography'])) $this->assertBoundedValue($settings['typography'], 'settings.typography');
        return $settings;
    }

    private function validateColorSchemes(mixed $schemes): array
    {
        if (! is_array($schemes) || ! array_is_list($schemes)) $this->fail('settings.colorSchemes', 'Color schemes must be a list.');
        if (count($schemes) > 50) $this->fail('settings.colorSchemes', 'A page may contain at most 50 color schemes.');
        $ids = []; $validated = [];
        foreach ($schemes as $index => $scheme) {
            $path = 'settings.colorSchemes.'.$index;
            if (! is_array($scheme)) $this->fail($path, 'Each color scheme must be an object.');
            $id = $scheme['id'] ?? null; $name = $scheme['name'] ?? null; $colors = $scheme['colors'] ?? null;
            if (! is_string($id) || $id === '' || mb_strlen($id) > 100 || ! preg_match('/^[a-zA-Z0-9_-]+$/', $id)) $this->fail($path.'.id', 'Color scheme id must contain only letters, numbers, dashes, or underscores.');
            if (isset($ids[$id])) $this->fail($path.'.id', 'Color scheme ids must be unique.');
            $ids[$id] = true;
            if (! is_string($name) || trim($name) === '' || mb_strlen($name) > 100) $this->fail($path.'.name', 'Color scheme name must be a non-empty string up to 100 characters.');
            if (! is_array($colors)) $this->fail($path.'.colors', 'Color scheme colors must be an object.');
            foreach (array_keys($colors) as $key) if (! in_array($key, self::COLOR_SCHEME_KEYS, true)) $this->fail($path.'.colors.'.$key, 'Unknown color scheme token.');
            $normalizedColors = [];
            foreach (self::COLOR_SCHEME_KEYS as $key) {
                $value = $colors[$key] ?? null;
                if (! is_string($value) || $value === '' || mb_strlen($value) > 100) $this->fail($path.'.colors.'.$key, 'Each color token must be a non-empty string up to 100 characters.');
                $normalizedColors[$key] = $value;
            }
            $validated[] = ['id' => $id, 'name' => trim($name), 'colors' => $normalizedColors];
        }
        return $validated;
    }

    private function assertBoundedValue(mixed $value, string $path): void
    {
        if (is_string($value) && mb_strlen($value) > $this->limit('max_string_length', 100000)) $this->fail($path, 'Value exceeds the configured maximum string length.');
        if (is_array($value)) foreach ($value as $key => $item) $this->assertBoundedValue($item, $path.'.'.$key);
    }

    private function limit(string $key, int $default): int { return max(1, (int) config('page-builder.limits.'.$key, $default)); }
    private function fail(string $path, string $message): never { throw ValidationException::withMessages([$path => [$message]]); }
}
