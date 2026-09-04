package pagebuilder

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func sharedConformanceRoot(t *testing.T) string {
	t.Helper()
	root := os.Getenv("PAGE_BUILDER_CONFORMANCE_ROOT")
	if root == "" {
		root = "../../specification/conformance"
	}
	if info, err := os.Stat(root); err != nil || !info.IsDir() {
		t.Skip("shared conformance corpus is not bundled with the extracted Go module")
	}
	return root
}

func TestSharedRuntimeConformance(t *testing.T) {
	paths, err := filepath.Glob(filepath.Join(sharedConformanceRoot(t), "*.json"))
	if err != nil {
		t.Fatal(err)
	}
	if len(paths) == 0 {
		t.Fatal("no shared conformance fixtures found")
	}

	for _, path := range paths {
		path := path
		bytes, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		var raw map[string]json.RawMessage
		if err := json.Unmarshal(bytes, &raw); err != nil {
			t.Fatal(err)
		}
		if raw["page"] == nil || raw["expected"] == nil {
			continue
		}

		t.Run(filepath.Base(path), func(t *testing.T) {
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
		})
	}
}

func TestSharedTemplateLanguageConformance(t *testing.T) {
	bytes, err := os.ReadFile(filepath.Join(sharedConformanceRoot(t), "template-language.json"))
	if err != nil {
		t.Fatal(err)
	}
	var fixture struct {
		TemplateCases []struct {
			Name     string         `json:"name"`
			Template string         `json:"template"`
			Context  map[string]any `json:"context"`
			Expected string         `json:"expected"`
		} `json:"templateCases"`
	}
	if err := json.Unmarshal(bytes, &fixture); err != nil {
		t.Fatal(err)
	}

	for _, testCase := range fixture.TemplateCases {
		testCase := testCase
		t.Run(testCase.Name, func(t *testing.T) {
			actual := RenderTemplate(testCase.Template, testCase.Context)
			if actual != testCase.Expected {
				t.Fatalf("template mismatch\nwant: %s\n got: %s", testCase.Expected, actual)
			}
		})
	}
}
