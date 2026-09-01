<?php

namespace Zaengit\PageBuilder\Blocks;

use RuntimeException;

final class BlockManifestValidator
{
    public function validate(array $manifest, string $manifestPath): void
    {
        $name = $manifest['name'] ?? null;
        if (!BlockName::isValid($name)) throw new RuntimeException("Invalid block name in {$manifestPath}");

        if (!is_int($manifest['version'] ?? null) || $manifest['version'] < 1) {
            throw new RuntimeException("Invalid version for {$name} in {$manifestPath}");
        }

        foreach (['title', 'category'] as $field) {
            if (!isset($manifest[$field]) || !is_string($manifest[$field]) || trim($manifest[$field]) === '') {
                throw new RuntimeException("Invalid {$field} for {$name} in {$manifestPath}");
            }
        }

        $attributes = $manifest['attributes'] ?? null;
        if (!is_array($attributes)) throw new RuntimeException("Invalid attributes for {$name} in {$manifestPath}");
        foreach ($attributes as $attribute => $schema) $this->validateAttributeSchema($schema, (string) $attribute, $name);

        $this->validateSupports($manifest['supports'] ?? [], $name);
        $this->validateAssets($manifest['assets'] ?? [], $name);
        $this->validateVariations($manifest['variations'] ?? [], $attributes, $name);
    }

    private function validateAttributeSchema(mixed $schema, string $attribute, string $name): void
    {
        if ($attribute === '' || !is_array($schema) || !is_string($schema['type'] ?? null) || $schema['type'] === '') {
            throw new RuntimeException("Invalid attribute schema for {$name}");
        }

        if ($schema['type'] === 'select' && (!is_array($schema['options'] ?? null) || !array_is_list($schema['options']))) {
            throw new RuntimeException("Invalid select options for {$name}.{$attribute}");
        }

        if ($schema['type'] !== 'repeater') return;
        $fields = $schema['fields'] ?? null;
        if (!is_array($fields)) throw new RuntimeException("Invalid repeater fields for {$name}.{$attribute}");
        foreach ($fields as $field => $fieldSchema) $this->validateAttributeSchema($fieldSchema, $attribute.'.'.$field, $name);
    }

    private function validateSupports(mixed $supports, string $name): void
    {
        if (!is_array($supports)) throw new RuntimeException("Invalid supports for {$name}");
        if (array_key_exists('children', $supports) && !is_bool($supports['children'])) throw new RuntimeException("Invalid children support for {$name}");
        if (!array_key_exists('allowedChildren', $supports)) return;
        if (!($supports['children'] ?? false)) throw new RuntimeException("allowedChildren requires children support for {$name}");
        if (!is_array($supports['allowedChildren']) || !array_is_list($supports['allowedChildren'])) throw new RuntimeException("Invalid allowedChildren for {$name}");
        foreach ($supports['allowedChildren'] as $childType) {
            if (!BlockName::isValid($childType)) throw new RuntimeException("Invalid allowed child type for {$name}");
        }
    }

    private function validateAssets(mixed $assets, string $name): void
    {
        if (!is_array($assets)) throw new RuntimeException("Invalid assets for {$name}");
        foreach (['css', 'js'] as $group) {
            if (isset($assets[$group]) && (!is_array($assets[$group]) || !array_is_list($assets[$group]))) {
                throw new RuntimeException("Invalid {$group} assets for {$name}");
            }
        }
    }

    private function validateVariations(mixed $variations, array $attributes, string $name): void
    {
        if (!is_array($variations) || !array_is_list($variations)) throw new RuntimeException("Invalid variations for {$name}");
        foreach ($variations as $variation) {
            if (!is_array($variation)
                || !is_string($variation['name'] ?? null)
                || preg_match('/^[a-z0-9-]+$/', $variation['name']) !== 1
                || !is_string($variation['title'] ?? null)
                || trim($variation['title']) === '') {
                throw new RuntimeException("Invalid variation for {$name}");
            }

            $variationAttrs = $variation['attrs'] ?? [];
            if (!is_array($variationAttrs)) throw new RuntimeException("Invalid variation attributes for {$name}.{$variation['name']}");
            foreach (array_keys($variationAttrs) as $attribute) {
                if (!array_key_exists($attribute, $attributes)) throw new RuntimeException("Unknown variation attribute {$attribute} for {$name}");
            }
        }
    }
}
