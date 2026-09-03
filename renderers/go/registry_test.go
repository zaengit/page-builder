package pagebuilder

import (
	"context"
	"strings"
	"testing"
)

func TestLoadsAndRendersBuiltinPortableBlocks(t *testing.T) {
	registry, err := LoadRegistry("../../blocks")
	if err != nil { t.Fatal(err) }
	for _, name := range []string{"core/heading", "core/image", "core/container", "core/columns", "core/carousel"} {
		if _, ok := registry[name]; !ok { t.Fatalf("%s should load", name) }
	}
	page := map[string]any{
		"version": float64(1),
		"blocks": []any{map[string]any{"id": "h1", "type": "core/heading", "attrs": map[string]any{"text": "Portable <Heading>", "level": float64(2)}, "children": []any{}}},
	}
	result, err := New().Render(context.Background(), RenderRequest{Page: page, Registry: registry, Context: map[string]any{}})
	if err != nil { t.Fatal(err) }
	if !strings.Contains(result.HTML, "Portable &lt;Heading&gt;") { t.Fatalf("unexpected html: %s", result.HTML) }
	if len(result.Diagnostics) != 0 { t.Fatalf("unexpected diagnostics: %#v", result.Diagnostics) }
}
