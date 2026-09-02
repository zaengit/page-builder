<?php

namespace Zaengit\PageBuilder\Blocks;

use RuntimeException;

final class BlockManifestValidator
{
    private const TYPES = ['string','textarea','url','image','number','range','boolean','select','repeater','color','date','code'];

    public function validate(array $manifest, string $manifestPath): void
    {
        $name = $manifest['name'] ?? null;
        if (! BlockName::isValid($name)) throw new RuntimeException("Invalid block name in {$manifestPath}");
        if (! is_int($manifest['version'] ?? null) || $manifest['version'] < 1) throw new RuntimeException("Invalid version for {$name} in {$manifestPath}");
        foreach (['title', 'category'] as $field) if (! isset($manifest[$field]) || ! is_string($manifest[$field]) || trim($manifest[$field]) === '') throw new RuntimeException("Invalid {$field} for {$name} in {$manifestPath}");

        $attributes = $manifest['attributes'] ?? null;
        if (! is_array($attributes)) throw new RuntimeException("Invalid attributes for {$name} in {$manifestPath}");
        foreach ($attributes as $attribute => $schema) $this->validateAttributeSchema($schema, (string) $attribute, $name, $attributes);
        $this->validateSupports($manifest['supports'] ?? [], $name);
        $this->validateAssets($manifest['assets'] ?? [], $name);
        $this->validateVariations($manifest['variations'] ?? [], $attributes, $name);
    }

    private function validateAttributeSchema(mixed $schema, string $attribute, string $name, array $rootAttributes): void
    {
        if ($attribute === '' || ! is_array($schema) || ! is_string($schema['type'] ?? null) || ! in_array($schema['type'], self::TYPES, true)) throw new RuntimeException("Invalid attribute schema for {$name}.{$attribute}");
        if (array_key_exists('control', $schema) && (! is_string($schema['control']) || trim($schema['control']) === '')) throw new RuntimeException("Invalid control for {$name}.{$attribute}");
        if (array_key_exists('responsive', $schema) && ! is_bool($schema['responsive'])) throw new RuntimeException("Invalid responsive flag for {$name}.{$attribute}");
        if (array_key_exists('group', $schema) && ! is_string($schema['group'])) throw new RuntimeException("Invalid group for {$name}.{$attribute}");
        if (array_key_exists('visibleWhen', $schema)) $this->validateVisibility($schema['visibleWhen'], $name, $attribute, $rootAttributes);
        if ($schema['type'] === 'select' && (! is_array($schema['options'] ?? null) || ! array_is_list($schema['options']))) throw new RuntimeException("Invalid select options for {$name}.{$attribute}");
        if ($schema['type'] !== 'repeater') return;
        $fields = $schema['fields'] ?? null; if (! is_array($fields)) throw new RuntimeException("Invalid repeater fields for {$name}.{$attribute}");
        foreach ($fields as $field => $fieldSchema) $this->validateAttributeSchema($fieldSchema, $attribute.'.'.$field, $name, $fields);
    }

    private function validateVisibility(mixed $value, string $name, string $attribute, array $attributes): void
    {
        $rules = is_array($value) && array_is_list($value) ? $value : [$value];
        foreach ($rules as $rule) {
            if (! is_array($rule) || ! is_string($rule['attribute'] ?? null) || ! array_key_exists($rule['attribute'], $attributes)) throw new RuntimeException("Invalid visibleWhen rule for {$name}.{$attribute}");
            if (isset($rule['truthy']) && ! is_bool($rule['truthy'])) throw new RuntimeException("Invalid visibleWhen truthy flag for {$name}.{$attribute}");
        }
    }

    private function validateSupports(mixed $supports, string $name): void
    {
        if (! is_array($supports)) throw new RuntimeException("Invalid supports for {$name}");
        foreach (['children','reusable','lock','styles'] as $flag) if (array_key_exists($flag, $supports) && ! is_bool($supports[$flag])) throw new RuntimeException("Invalid {$flag} support for {$name}");
        if (array_key_exists('allowedChildren', $supports)) {
            if (! ($supports['children'] ?? false)) throw new RuntimeException("allowedChildren requires children support for {$name}");
            if (! is_array($supports['allowedChildren']) || ! array_is_list($supports['allowedChildren'])) throw new RuntimeException("Invalid allowedChildren for {$name}");
            foreach ($supports['allowedChildren'] as $childType) if (! BlockName::isValid($childType)) throw new RuntimeException("Invalid allowed child type for {$name}");
        }
        if (array_key_exists('inline', $supports)) {
            if (! is_array($supports['inline']) || ! array_is_list($supports['inline'])) throw new RuntimeException("Invalid inline support for {$name}");
            foreach ($supports['inline'] as $attribute) if (! is_string($attribute) || $attribute === '') throw new RuntimeException("Invalid inline attribute for {$name}");
        }
        if (array_key_exists('slots', $supports)) {
            if (! ($supports['children'] ?? false) || ! is_array($supports['slots']) || ! array_is_list($supports['slots'])) throw new RuntimeException("Invalid slots for {$name}");
            foreach ($supports['slots'] as $slot) {
                if (! is_array($slot) || ! is_string($slot['name'] ?? null) || preg_match('/^[a-zA-Z0-9_-]+$/', $slot['name']) !== 1) throw new RuntimeException("Invalid slot for {$name}");
                if (isset($slot['allowedChildren']) && (! is_array($slot['allowedChildren']) || ! array_is_list($slot['allowedChildren']))) throw new RuntimeException("Invalid slot children for {$name}.{$slot['name']}");
            }
        }
    }

    private function validateAssets(mixed $assets, string $name): void
    {
        if (! is_array($assets)) throw new RuntimeException("Invalid assets for {$name}");
        foreach (['css', 'js'] as $group) if (isset($assets[$group]) && (! is_array($assets[$group]) || ! array_is_list($assets[$group]))) throw new RuntimeException("Invalid {$group} assets for {$name}");
    }

    private function validateVariations(mixed $variations, array $attributes, string $name): void
    {
        if (! is_array($variations) || ! array_is_list($variations)) throw new RuntimeException("Invalid variations for {$name}");
        foreach ($variations as $variation) {
            if (! is_array($variation) || ! is_string($variation['name'] ?? null) || preg_match('/^[a-z0-9-]+$/', $variation['name']) !== 1 || ! is_string($variation['title'] ?? null) || trim($variation['title']) === '') throw new RuntimeException("Invalid variation for {$name}");
            $variationAttrs = $variation['attrs'] ?? []; if (! is_array($variationAttrs)) throw new RuntimeException("Invalid variation attributes for {$name}.{$variation['name']}");
            foreach (array_keys($variationAttrs) as $attribute) if (! array_key_exists($attribute, $attributes)) throw new RuntimeException("Unknown variation attribute {$attribute} for {$name}");
        }
    }
}
