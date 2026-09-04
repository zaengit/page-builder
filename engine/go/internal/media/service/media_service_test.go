package service_test

import (
	"bytes"
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	mediamodel "github.com/zaengit/page-builder/engine/go/internal/media/model"
	"github.com/zaengit/page-builder/engine/go/internal/media/repository"
	"github.com/zaengit/page-builder/engine/go/internal/media/service"
	"gorm.io/gorm"
)

func TestMediaUploadValidation(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&mediamodel.Media{}); err != nil {
		t.Fatal(err)
	}

	svc := service.New(repository.New(db), t.TempDir(), "/media", 1024*1024)
	png := append([]byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}, make([]byte, 520)...)
	item, err := svc.Save(context.Background(), "image.png", "application/octet-stream", bytes.NewReader(png), int64(len(png)))
	if err != nil {
		t.Fatal(err)
	}
	if item.MimeType != "image/png" {
		t.Fatalf("mime type = %q", item.MimeType)
	}

	if _, err := svc.Save(context.Background(), "payload.svg", "image/svg+xml", bytes.NewReader([]byte(`<svg/>`)), 6); err == nil {
		t.Fatal("expected SVG upload to be rejected")
	}
	if _, err := svc.Save(context.Background(), "fake.png", "image/png", bytes.NewReader([]byte("not an image")), 12); err == nil {
		t.Fatal("expected mismatched content to be rejected")
	}
}
