package pagebuilder

import (
	"context"
	"reflect"
	"testing"
)

type recordingDatasourceAdapter struct {
	request DatasourceRequest
	runtime map[string]any
	result  any
}

func (a *recordingDatasourceAdapter) Resolve(_ context.Context, request DatasourceRequest, runtime map[string]any) (any, error) {
	a.request = request
	a.runtime = runtime
	return a.result, nil
}

func TestDatasourceProviderMapsCanonicalBindingToTypedRequest(t *testing.T) {
	adapter := &recordingDatasourceAdapter{result: map[string]any{"name": "Phone"}}
	provider := DatasourceProvider{Adapter: adapter}
	runtime := map[string]any{"currentProduct": map[string]any{"id": float64(7)}}

	result, err := provider.Resolve(context.Background(), map[string]any{
		"source":     "database",
		"resource":   "products",
		"mode":       "collection",
		"recordId":   float64(9),
		"contextKey": "currentProduct.id",
		"query": map[string]any{
			"where": []any{
				map[string]any{"column": "status", "operator": "=", "value": "published"},
			},
			"orderBy": []any{
				map[string]any{"column": "created_at", "direction": "desc"},
			},
			"with":    []any{"category", "author.profile"},
			"limit":   float64(12),
			"offset":  float64(3),
			"perPage": float64(5),
			"page":    float64(2),
		},
	}, nil, runtime)
	if err != nil {
		t.Fatal(err)
	}

	if !reflect.DeepEqual(result, map[string]any{"name": "Phone"}) {
		t.Fatalf("unexpected result: %#v", result)
	}
	if adapter.request.Provider != "database" || adapter.request.Resource != "products" || adapter.request.Mode != "collection" {
		t.Fatalf("unexpected request identity: %#v", adapter.request)
	}
	if adapter.request.ContextKey != "currentProduct.id" || adapter.request.RecordID != float64(9) {
		t.Fatalf("unexpected request selectors: %#v", adapter.request)
	}
	if adapter.request.Query.Limit != 12 || adapter.request.Query.Offset != 3 || adapter.request.Query.PerPage != 5 || adapter.request.Query.Page != 2 {
		t.Fatalf("unexpected query pagination: %#v", adapter.request.Query)
	}
	if len(adapter.request.Query.Where) != 1 || adapter.request.Query.Where[0].Column != "status" || adapter.request.Query.Where[0].Operator != "=" {
		t.Fatalf("unexpected filters: %#v", adapter.request.Query.Where)
	}
	if len(adapter.request.Query.OrderBy) != 1 || adapter.request.Query.OrderBy[0].Column != "created_at" || adapter.request.Query.OrderBy[0].Direction != "desc" {
		t.Fatalf("unexpected ordering: %#v", adapter.request.Query.OrderBy)
	}
	if !reflect.DeepEqual(adapter.request.Query.With, []string{"category", "author.profile"}) {
		t.Fatalf("unexpected relations: %#v", adapter.request.Query.With)
	}
	if !reflect.DeepEqual(adapter.runtime, runtime) {
		t.Fatalf("runtime context was not forwarded: %#v", adapter.runtime)
	}
}

func TestDatasourceProviderDefaultsSingleModeAndAscendingOrder(t *testing.T) {
	adapter := &recordingDatasourceAdapter{}
	provider := DatasourceProvider{Adapter: adapter}

	_, err := provider.Resolve(context.Background(), map[string]any{
		"source":   "database",
		"resource": "products",
		"query": map[string]any{
			"orderBy": []any{map[string]any{"column": "name"}},
		},
	}, nil, nil)
	if err != nil {
		t.Fatal(err)
	}

	if adapter.request.Mode != "single" {
		t.Fatalf("expected single mode, got %q", adapter.request.Mode)
	}
	if len(adapter.request.Query.OrderBy) != 1 || adapter.request.Query.OrderBy[0].Direction != "asc" {
		t.Fatalf("expected ascending order default: %#v", adapter.request.Query.OrderBy)
	}
}
