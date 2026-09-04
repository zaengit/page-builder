package config_test

import (
	"testing"
	"time"

	"github.com/zaengit/page-builder/engine/go/internal/config"
)

func TestLoadProductionDefaults(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("DB_DRIVER", "sqlite")
	t.Setenv("DB_DSN", "test.db")
	t.Setenv("DB_MAX_OPEN_CONNS", "50")
	t.Setenv("DB_MAX_IDLE_CONNS", "10")
	t.Setenv("DB_CONN_MAX_LIFETIME_MS", "3600000")
	t.Setenv("HTTP_REQUEST_TIMEOUT_MS", "30000")

	cfg, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DatabaseDriver != "sqlite" || cfg.DatabaseMaxOpen != 50 || cfg.DatabaseMaxIdle != 10 {
		t.Fatalf("unexpected database config: %#v", cfg)
	}
	if cfg.RequestTimeout != 30*time.Second || cfg.DatabaseConnMaxLife != time.Hour {
		t.Fatalf("unexpected timeout config: %#v", cfg)
	}
}

func TestLoadRejectsInvalidDatabasePool(t *testing.T) {
	t.Setenv("DB_DRIVER", "sqlite")
	t.Setenv("DB_DSN", "test.db")
	t.Setenv("DB_MAX_OPEN_CONNS", "2")
	t.Setenv("DB_MAX_IDLE_CONNS", "3")

	if _, err := config.Load(); err == nil {
		t.Fatal("expected database pool validation error")
	}
}

func TestLoadRejectsNonPositiveRequestTimeout(t *testing.T) {
	t.Setenv("DB_DRIVER", "sqlite")
	t.Setenv("DB_DSN", "test.db")
	t.Setenv("HTTP_REQUEST_TIMEOUT_MS", "0")

	if _, err := config.Load(); err == nil {
		t.Fatal("expected request timeout validation error")
	}
}
