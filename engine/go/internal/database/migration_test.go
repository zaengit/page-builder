package database_test

import (
	"path/filepath"
	"testing"

	"github.com/zaengit/page-builder/engine/go/internal/config"
	"github.com/zaengit/page-builder/engine/go/internal/database"
)

func TestMigrateSQLiteIsIdempotent(t *testing.T) {
	cfg := config.Config{
		Environment:    "test",
		DatabaseDriver: "sqlite",
		DatabaseDSN:    filepath.Join(t.TempDir(), "cms.db"),
	}
	db, err := database.Open(cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = database.Close(db) }()

	if err := database.Migrate(db); err != nil {
		t.Fatal(err)
	}
	if err := database.Migrate(db); err != nil {
		t.Fatal(err)
	}

	for _, table := range []string{"schema_migrations", "pages", "media", "datasources", "settings"} {
		if !db.Migrator().HasTable(table) {
			t.Fatalf("expected table %q", table)
		}
	}

	var count int64
	if err := db.Table("schema_migrations").Where("version = ?", 1).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("migration version 1 count = %d", count)
	}
}
