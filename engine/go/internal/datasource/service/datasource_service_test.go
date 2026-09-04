package service_test

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	datasourcemodel "github.com/zaengit/page-builder/engine/go/internal/datasource/model"
	"github.com/zaengit/page-builder/engine/go/internal/datasource/repository"
	"github.com/zaengit/page-builder/engine/go/internal/datasource/service"
	"gorm.io/gorm"
)

func TestRegisterAndQueryDatasource(t *testing.T) {
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
	if err := db.Exec(`INSERT INTO products (name, price) VALUES (?, ?), (?, ?)`, "A", 100, "B", 200).Error; err != nil {
		t.Fatal(err)
	}

	svc := service.New(repository.New(db))
	ctx := context.Background()
	_, err = svc.Register(ctx, "catalog", service.DefinitionInput{
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

	result, err := svc.Query(ctx, service.Query{
		Resource: "products",
		Filters:  []service.Filter{{Field: "price", Op: "gte", Value: 150}},
		OrderBy:  "price",
		Limit:    10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 1 || len(result.Items) != 1 {
		t.Fatalf("unexpected result: %#v", result)
	}

	if _, err := svc.Register(ctx, "unsafe", service.DefinitionInput{
		Resource: "unsafe",
		Config: service.ResourceConfig{Table: "products; DROP TABLE products", Columns: []string{"id"}},
	}); err == nil {
		t.Fatal("expected unsafe table name to be rejected")
	}
}
