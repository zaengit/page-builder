<?php

namespace Zaengit\PageBuilder\Blocks;

use Illuminate\Validation\ValidationException;
use RuntimeException;

final class PageContentValidator
{
    private const MAX_DEPTH = 20;
    private const MAX_BLOCKS = 1000;
    private const STYLE_KEYS = ['className','background','color','padding','margin','gap','width','textAlign','fontSize','borderRadius','boxShadow','hidden','custom'];

    public function __construct(private readonly BlockRegistry $registry, private readonly BlockMigrationRegistry $migrations) {}

    public function validate(array $content): array
    {
        $blocks = $content['blocks'] ?? null;
        if (! is_array($blocks) || ! array_is_list($blocks)) $this->fail('blocks', 'The blocks field must be a list.');
        $seenIds = []; $count = 0; $validated = [];
        foreach ($blocks as $index => $block) $validated[] = $this->validateBlock($block, "blocks.{$index}", 0, $seenIds, $count);
        $result = ['blocks' => $validated, 'schemaVersion' => max(1, (int) ($content['schemaVersion'] ?? 1))];
        if (array_key_exists('settings', $content)) $result['settings'] = $this->validateSettings($content['settings']);
        return $result;
    }

    private function validateBlock(mixed $block, string $path, int $depth, array &$seenIds, int &$count): array
    {
        if (! is_array($block)) $this->fail($path, 'Each block must be an object.');
        if ($depth > self::MAX_DEPTH) $this->fail($path, 'Maximum block nesting depth exceeded.');
        if (++$count > self::MAX_BLOCKS) $this->fail('blocks', 'Maximum number of blocks exceeded.');
        $id = $block['id'] ?? null; if (! is_string($id) || $id === '' || mb_strlen($id) > 100) $this->fail("{$path}.id", 'Block id must be a non-empty string up to 100 characters.');
        if (isset($seenIds[$id])) $this->fail("{$path}.id", 'Block ids must be unique within a page.'); $seenIds[$id] = true;
        $type = $block['type'] ?? null; if (! is_string($type) || $type === '' || mb_strlen($type) > 100) $this->fail("{$path}.type", 'Block type must be a non-empty string up to 100 characters.');
        $definition = $this->registry->get($type); if (! $definition) $this->fail("{$path}.type", "Unknown block type [{$type}].");
        try { $block = $this->migrations->migrate($block, (int) ($definition['version'] ?? 1)); } catch (RuntimeException $e) { $this->fail("{$path}.version", $e->getMessage()); }

        $attrs = $block['attrs'] ?? null; if (! is_array($attrs)) $this->fail("{$path}.attrs", 'Block attrs must be an object.');
        foreach ($attrs as $name => $value) { if (! is_string($name) || ! isset($definition['attributes'][$name])) $this->fail("{$path}.attrs.{$name}", 'Unknown block attribute.'); $this->validateAttribute($value, $definition['attributes'][$name], "{$path}.attrs.{$name}"); }

        $children = $block['children'] ?? []; if (! is_array($children) || ! array_is_list($children)) $this->fail("{$path}.children", 'Block children must be a list.');
        if ($children !== [] && ! ($definition['supports']['children'] ?? false)) $this->fail("{$path}.children", 'This block type does not support children.');
        $allowedChildren = $definition['supports']['allowedChildren'] ?? null;
        if ($children !== [] && is_array($allowedChildren) && $allowedChildren !== []) foreach ($children as $index => $child) { $childType = is_array($child) ? ($child['type'] ?? null) : null; if (! is_string($childType) || ! in_array($childType, $allowedChildren, true)) $this->fail("{$path}.children.{$index}.type", 'This child block type is not allowed inside the parent block.'); }
        $slots = collect($definition['supports']['slots'] ?? [])->keyBy('name');
        $validatedChildren = [];
        foreach ($children as $index => $child) {
            if (is_array($child) && isset($child['slot'])) {
                $slot = $slots->get($child['slot']); if (! $slot) $this->fail("{$path}.children.{$index}.slot", 'Unknown parent slot.');
                if (($slot['allowedChildren'] ?? []) !== [] && ! in_array($child['type'] ?? null, $slot['allowedChildren'], true)) $this->fail("{$path}.children.{$index}.type", 'This block type is not allowed in the selected slot.');
            }
            $validatedChildren[] = $this->validateBlock($child, "{$path}.children.{$index}", $depth + 1, $seenIds, $count);
        }

        $validated = ['id' => $id, 'type' => $type, 'version' => $block['version'], 'attrs' => $attrs];
        if (array_key_exists('children', $block) || ($definition['supports']['children'] ?? false)) $validated['children'] = $validatedChildren;
        if (isset($block['slot']) && is_string($block['slot'])) $validated['slot'] = mb_substr($block['slot'], 0, 100);
        if (isset($block['styles'])) $validated['styles'] = $this->validateStyles($block['styles'], "{$path}.styles");
        if (isset($block['bindings'])) $validated['bindings'] = $this->validateBindings($block['bindings'], $definition, "{$path}.bindings");
        if (isset($block['lock'])) $validated['lock'] = $this->validateLock($block['lock'], "{$path}.lock");
        return $validated;
    }

    private function validateAttribute(mixed $value, array $schema, string $path): void
    {
        if (($schema['responsive'] ?? false) === true) { if (! is_array($value)) $this->fail($path, 'Responsive attributes must be an object.'); foreach ($value as $breakpoint => $item) { if (! in_array($breakpoint, ['desktop','tablet','mobile'], true)) $this->fail($path, 'Unknown responsive breakpoint.'); $next = $schema; $next['responsive'] = false; $this->validateAttribute($item, $next, $path.'.'.$breakpoint); } return; }
        $type = $schema['type'] ?? 'string';
        $valid = match ($type) { 'string','textarea','url','image','color','date','code' => is_string($value), 'number','range' => is_int($value) || is_float($value), 'boolean' => is_bool($value), 'select' => in_array($value, $schema['options'] ?? [], true), 'repeater' => $this->validRepeater($value, $schema, $path), default => false };
        if (! $valid) $this->fail($path, "Invalid value for attribute type [{$type}].");
        if (($type === 'number' || $type === 'range') && is_numeric($value)) { if (isset($schema['min']) && $value < $schema['min']) $this->fail($path, "Value must be at least {$schema['min']}."); if (isset($schema['max']) && $value > $schema['max']) $this->fail($path, "Value may not be greater than {$schema['max']}."); }
    }

    private function validRepeater(mixed $value, array $schema, string $path): bool
    {
        if (! is_array($value) || ! array_is_list($value)) return false; $fields = $schema['fields'] ?? [];
        foreach ($value as $index => $item) { if (! is_array($item)) $this->fail("{$path}.{$index}", 'Repeater items must be objects.'); foreach ($item as $name => $fieldValue) { if (! is_string($name) || ! isset($fields[$name])) $this->fail("{$path}.{$index}.{$name}", 'Unknown repeater field.'); $this->validateAttribute($fieldValue, $fields[$name], "{$path}.{$index}.{$name}"); } }
        return true;
    }

    private function validateStyles(mixed $styles, string $path): array
    {
        if (! is_array($styles)) $this->fail($path, 'Styles must be an object.');
        foreach (array_keys($styles) as $key) if (! in_array($key, self::STYLE_KEYS, true)) $this->fail($path.'.'.$key, 'Unknown style property.');
        return $styles;
    }

    private function validateBindings(mixed $bindings, array $definition, string $path): array
    {
        if (! is_array($bindings)) $this->fail($path, 'Bindings must be an object.');
        foreach ($bindings as $attr => $binding) { if (! isset($definition['attributes'][$attr]) || ! is_array($binding) || ! is_string($binding['source'] ?? null)) $this->fail($path.'.'.$attr, 'Invalid dynamic binding.'); if (isset($binding['path']) && ! is_string($binding['path'])) $this->fail($path.'.'.$attr.'.path', 'Binding path must be a string.'); }
        return $bindings;
    }

    private function validateLock(mixed $lock, string $path): array
    {
        if (! is_array($lock)) $this->fail($path, 'Lock must be an object.'); $result = [];
        foreach (['move','remove','edit'] as $key) if (array_key_exists($key, $lock)) { if (! is_bool($lock[$key])) $this->fail($path.'.'.$key, 'Lock values must be boolean.'); $result[$key] = $lock[$key]; }
        return $result;
    }

    private function validateSettings(mixed $settings): array
    {
        if (! is_array($settings)) $this->fail('settings', 'Page settings must be an object.');
        $allowed = ['contentWidth','background','customClass','customCss','tokens','typography']; foreach (array_keys($settings) as $key) if (! in_array($key, $allowed, true)) $this->fail('settings.'.$key, 'Unknown page setting.');
        return $settings;
    }

    private function fail(string $path, string $message): never { throw ValidationException::withMessages([$path => [$message]]); }
}
