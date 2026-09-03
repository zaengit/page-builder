package pagebuilder

import (
	"fmt"
	"regexp"
)

var portableName = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._/-]*$`)

// ValidatePage performs engine-neutral structural validation before rendering.
// Hosts should also validate serialized input against specification/page.schema.json.
func ValidatePage(page map[string]any) error {
	version, ok := page["version"]
	if !ok || toInt(version) != PageVersion {
		return fmt.Errorf("unsupported page version")
	}
	blocks, ok := page["blocks"].([]any)
	if !ok {
		return fmt.Errorf("blocks must be an array")
	}
	seen := map[string]bool{}
	for i, raw := range blocks {
		block, ok := raw.(map[string]any)
		if !ok {
			return fmt.Errorf("blocks[%d] must be an object", i)
		}
		if err := validatePageBlock(block, fmt.Sprintf("blocks[%d]", i), seen); err != nil {
			return err
		}
	}
	if settings, exists := page["settings"]; exists {
		if _, ok := settings.(map[string]any); !ok {
			return fmt.Errorf("settings must be an object")
		}
	}
	return nil
}

func validatePageBlock(block map[string]any, path string, seen map[string]bool) error {
	id, ok := block["id"].(string)
	if !ok || id == "" {
		return fmt.Errorf("%s.id must be a non-empty string", path)
	}
	if seen[id] {
		return fmt.Errorf("duplicate block id %q", id)
	}
	seen[id] = true
	typeName, ok := block["type"].(string)
	if !ok || !portableName.MatchString(typeName) {
		return fmt.Errorf("%s.type is invalid", path)
	}
	if version, exists := block["version"]; exists && toInt(version) < 1 {
		return fmt.Errorf("%s.version must be >= 1", path)
	}
	for _, objectKey := range []string{"attrs", "bindings", "styles", "layout", "layoutItem", "lock"} {
		if value, exists := block[objectKey]; exists && value != nil {
			if _, ok := value.(map[string]any); !ok {
				return fmt.Errorf("%s.%s must be an object", path, objectKey)
			}
		}
	}
	if slot, exists := block["slot"]; exists && slot != nil {
		if _, ok := slot.(string); !ok {
			return fmt.Errorf("%s.slot must be a string", path)
		}
	}
	if scheme, exists := block["colorSchemeId"]; exists && scheme != nil {
		if _, ok := scheme.(string); !ok {
			return fmt.Errorf("%s.colorSchemeId must be a string", path)
		}
	}
	if rawChildren, exists := block["children"]; exists {
		children, ok := rawChildren.([]any)
		if !ok {
			return fmt.Errorf("%s.children must be an array", path)
		}
		for i, raw := range children {
			child, ok := raw.(map[string]any)
			if !ok {
				return fmt.Errorf("%s.children[%d] must be an object", path, i)
			}
			if err := validatePageBlock(child, fmt.Sprintf("%s.children[%d]", path, i), seen); err != nil {
				return err
			}
		}
	}
	return nil
}

// ValidateRegistry validates portable manifest fields required by the Go renderer.
func ValidateRegistry(registry map[string]map[string]any) error {
	for key, definition := range registry {
		name, _ := definition["name"].(string)
		if name == "" {
			name = key
		}
		if name != key || !portableName.MatchString(name) {
			return fmt.Errorf("invalid block name %q", key)
		}
		if version, exists := definition["version"]; exists && toInt(version) < 1 {
			return fmt.Errorf("%s.version must be >= 1", key)
		}
		if attrs, exists := definition["attributes"]; exists {
			if _, ok := attrs.(map[string]any); !ok {
				return fmt.Errorf("%s.attributes must be an object", key)
			}
		}
		if template, ok := definition["template"].(string); !ok || template == "" {
			return fmt.Errorf("%s.template is required", key)
		}
		if err := ValidateTemplate(definition["template"].(string)); err != nil {
			return fmt.Errorf("%s: %w", key, err)
		}
	}
	return nil
}
