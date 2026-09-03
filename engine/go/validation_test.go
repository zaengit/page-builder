package pagebuilder

import "testing"

func TestValidatePage(t *testing.T) {
	valid := map[string]any{
		"version": float64(1),
		"blocks": []any{
			map[string]any{"id": "one", "type": "test/text", "version": float64(1), "attrs": map[string]any{}, "children": []any{}},
		},
	}
	if err := ValidatePage(valid); err != nil {
		t.Fatalf("valid page rejected: %v", err)
	}
	duplicate := map[string]any{
		"version": float64(1),
		"blocks": []any{
			map[string]any{"id": "one", "type": "test/text"},
			map[string]any{"id": "one", "type": "test/text"},
		},
	}
	if err := ValidatePage(duplicate); err == nil {
		t.Fatal("duplicate block id was accepted")
	}
}

func TestValidateRegistryAndTemplate(t *testing.T) {
	registry := map[string]map[string]any{
		"test/text": {
			"name":       "test/text",
			"version":    float64(1),
			"template":   "{% if attrs.show %}<p>{{ attrs.text }}</p>{% endif %}",
			"attributes": map[string]any{},
		},
	}
	if err := ValidateRegistry(registry); err != nil {
		t.Fatalf("valid registry rejected: %v", err)
	}
	for _, invalid := range []string{
		"{{ attrs.text ",
		"{% if attrs.show %}x",
		"{% nope attrs.show %}x{% endif %}",
		"{{{ attrs.html }}}",
	} {
		if err := ValidateTemplate(invalid); err == nil {
			t.Fatalf("invalid template accepted: %s", invalid)
		}
	}
}
