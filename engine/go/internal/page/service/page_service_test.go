package service_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/glebarez/sqlite"
	pagemodel "github.com/zaengit/page-builder/engine/go/internal/page/model"
	"github.com/zaengit/page-builder/engine/go/internal/page/repository"
	"github.com/zaengit/page-builder/engine/go/internal/page/service"
	"gorm.io/gorm"
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
	ctx := context.Background()
	raw := json.RawMessage(`{"version":1,"blocks":[]}`)

	p, err := s.Create(ctx, "Hello", "", raw)
	if err != nil {
		t.Fatal(err)
	}
	if p.Slug != "hello" {
		t.Fatalf("slug=%q", p.Slug)
	}

	if _, err := s.Create(ctx, "Duplicate", "hello", raw); err == nil {
		t.Fatal("expected duplicate slug validation error")
	} else {
		var validation service.ValidationError
		if !errors.As(err, &validation) {
			t.Fatalf("expected ValidationError, got %T", err)
		}
	}

	copyPage, err := s.Duplicate(ctx, p.ID)
	if err != nil {
		t.Fatal(err)
	}
	if copyPage.Status != "draft" || copyPage.Slug != "hello-copy" || copyPage.Revision != 1 {
		t.Fatalf("unexpected duplicate: %#v", copyPage)
	}

	secondCopy, err := s.Duplicate(ctx, p.ID)
	if err != nil {
		t.Fatal(err)
	}
	if secondCopy.Slug != "hello-copy-2" {
		t.Fatalf("second duplicate slug=%q", secondCopy.Slug)
	}

	p, err = s.Publish(ctx, p.ID, true)
	if err != nil || p.Status != "published" {
		t.Fatalf("publish: %v %#v", err, p)
	}

	items, total, err := s.List(ctx, service.ListOptions{
		Status:    "draft",
		Search:    "copy",
		OrderBy:   "slug",
		Direction: "asc",
		Limit:     10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if total != 2 || len(items) != 2 || items[0].Slug != "hello-copy" {
		t.Fatalf("unexpected filtered list: total=%d items=%#v", total, items)
	}

	published, err := s.PublishedBySlug(ctx, "Hello")
	if err != nil {
		t.Fatal(err)
	}
	if published == nil || published.ID != p.ID {
		t.Fatalf("published page not found: %#v", published)
	}
}
