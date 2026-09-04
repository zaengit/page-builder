package service_test

import (
	"context"
	"encoding/json"
	pagemodel "github.com/zaengit/page-builder/engine/go/internal/page/model"
	"github.com/zaengit/page-builder/engine/go/internal/page/repository"
	"github.com/zaengit/page-builder/engine/go/internal/page/service"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"testing"
)

func TestPageLifecycle(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&pagemodel.Page{}); err != nil {
		t.Fatal(err)
	}
	s := service.New(repository.New(db))
	raw := json.RawMessage(`{"version":1,"blocks":[]}`)
	p, err := s.Create(context.Background(), "Hello", "", raw)
	if err != nil {
		t.Fatal(err)
	}
	if p.Slug != "hello" {
		t.Fatalf("slug=%q", p.Slug)
	}
	p, err = s.Publish(context.Background(), p.ID, true)
	if err != nil || p.Status != "published" {
		t.Fatalf("publish: %v %#v", err, p)
	}
}
