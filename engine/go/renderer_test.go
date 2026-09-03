package pagebuilder

import (
	"context"
	"encoding/json"
	"os"
	"reflect"
	"testing"
)

func TestCanonicalRuntimeConformance(t *testing.T) {
	bytes, err := os.ReadFile("../../specification/conformance/canonical-runtime.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixture struct {
		Registry map[string]map[string]any `json:"registry"`
		Page     map[string]any            `json:"page"`
		Context  map[string]any            `json:"context"`
		Expected RenderResult              `json:"expected"`
	}
	if err := json.Unmarshal(bytes, &fixture); err != nil {
		t.Fatal(err)
	}
	result, err := New().Render(context.Background(), RenderRequest{Page: fixture.Page, Registry: fixture.Registry, Context: fixture.Context})
	if err != nil {
		t.Fatal(err)
	}
	if result.HTML != fixture.Expected.HTML {
		t.Fatalf("html mismatch\nwant: %s\n got: %s", fixture.Expected.HTML, result.HTML)
	}
	if !reflect.DeepEqual(result.Assets, fixture.Expected.Assets) {
		t.Fatalf("assets mismatch: %#v != %#v", result.Assets, fixture.Expected.Assets)
	}
	if !reflect.DeepEqual(result.Diagnostics, fixture.Expected.Diagnostics) {
		t.Fatalf("diagnostics mismatch: %#v != %#v", result.Diagnostics, fixture.Expected.Diagnostics)
	}
}
