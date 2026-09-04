package service_test

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	pagebuilder "github.com/zaengit/page-builder/engine/go"
	datasourcemodel "github.com/zaengit/page-builder/engine/go/internal/datasource/model"
	"github.com/zaengit/page-builder/engine/go/internal/datasource/repository"
	"github.com/zaengit/page-builder/engine/go/internal/datasource/service"
	"gorm.io/gorm"
)

func newService(t *testing.T) *service.Service {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&datasourcemodel.Datasource{}); err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL)`).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`INSERT INTO products (id, name, price) VALUES (1, 'Alpha', 100), (2, 'Beta', 200), (3, 'Gamma', 300)`).Error; err != nil {
		t.Fatal(err)
	}

	svc := service.New(repository.New(db))
	_, err = svc.Register(context.Background(), "catalog", service.DefinitionInput{
		Resource: "products",
		Config: service.ResourceConfig{
			Table:      "products",
			PrimaryKey: "id",
			Columns:    []string{"id", "name", "price"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	return svc
}

func TestRegisterAndQueryDatasource(t *testing.T) {
	svc := newService(t)
	ctx := context.Background()

	result, err := svc.Query(ctx, service.Query{
		Resource: "products",
		Filters:  []service.Filter{{Field: "price", Op: "gte", Value: 150}},
		OrderBy:  "price",
		Limit:    10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 2 || len(result.Items) != 2 {
		t.Fatalf("unexpected result: %#v", result)
	}

	if _, err := svc.Register(ctx, "unsafe", service.DefinitionInput{
		Resource: "unsafe",
		Config:   service.ResourceConfig{Table: "products; DROP TABLE products", Columns: []string{"id"}},
	}); err == nil {
		t.Fatal("expected unsafe table name to be rejected")
	}
}

func TestResolveSingleByRuntimeContext(t *testing.T) {
	svc := newService(t)
	value, err := svc.Resolve(context.Background(), pagebuilder.DatasourceRequest{
		Provider:   "database",
		Resource:   "products",
		Mode:       "single",
		ContextKey: "current.productId",
	}, map[string]any{"current": map[string]any{"productId": 2}})
	if err != nil {
		t.Fatal(err)
	}
	row, ok := value.(map[string]any)
	if !ok || row["name"] != "Beta" {
		t.Fatalf("unexpected row: %#v", value)
	}
}

func TestResolveCollectionWithFiltersAndPagination(t *testing.T) {
	svc := newService(t)
	value, err := svc.Resolve(context.Background(), pagebuilder.DatasourceRequest{
		Provider: "database",
		Resource: "products",
		Mode:     "collection",
		Query: pagebuilder.DatasourceQuery{
			Where:   []pagebuilder.DatasourceFilter{{Column: "price", Operator: ">=", Value: 200}},
			OrderBy: []pagebuilder.DatasourceOrder{{Column: "price", Direction: "desc"}},
			PerPage: 1,
			Page:    1,
		},
	}, nil)
	if err != nil {
		t.Fatal(err)
	}
	result, ok := value.(pagebuilder.DatasourceCollectionResult)
	if !ok {
		t.Fatalf("unexpected result type: %T", value)
	}
	if len(result.Items) != 1 || result.Items[0]["name"] != "Gamma" {
		t.Fatalf("unexpected items: %#v", result.Items)
	}
	if result.Pagination == nil || result.Pagination.Total != 2 || result.Pagination.LastPage != 2 || !result.Pagination.HasMorePages {
		t.Fatalf("unexpected pagination: %#v", result.Pagination)
	}
}

func TestResolveRejectsUnexposedColumn(t *testing.T) {
	svc := newService(t)
	_, err := svc.Resolve(context.Background(), pagebuilder.DatasourceRequest{
		Provider: "database",
		Resource: "products",
		Mode:     "collection",
		Query: pagebuilder.DatasourceQuery{
			Where: []pagebuilder.DatasourceFilter{{Column: "secret", Operator: "=", Value: "x"}},
		},
	}, nil)
	if err == nil {
		t.Fatal("expected allow-list validation error")
	}
}
