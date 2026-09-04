package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Environment         string
	HTTPAddress         string
	DatabaseDriver      string
	DatabaseDSN         string
	DatabaseMaxOpen     int
	DatabaseMaxIdle     int
	DatabaseConnMaxLife time.Duration
	StoragePath         string
	PublicStoragePath   string
	BlockRoot           string
	MaxUploadBytes      int64
	RenderTimeout       time.Duration
	RequestTimeout      time.Duration
	ReadTimeout         time.Duration
	WriteTimeout        time.Duration
	IdleTimeout         time.Duration
	ShutdownTimeout     time.Duration
	CORSOrigins         []string
	MigrateOnStart      bool
	Capabilities        map[string]bool
}

func Load() (Config, error) {
	cfg := Config{
		Environment:         env("APP_ENV", "production"),
		HTTPAddress:         env("HTTP_ADDR", ":8080"),
		DatabaseDriver:      strings.ToLower(env("DB_DRIVER", "sqlite")),
		DatabaseDSN:         env("DB_DSN", "page-builder.db"),
		DatabaseMaxOpen:     envInt("DB_MAX_OPEN_CONNS", 50),
		DatabaseMaxIdle:     envInt("DB_MAX_IDLE_CONNS", 10),
		DatabaseConnMaxLife: envDurationMS("DB_CONN_MAX_LIFETIME_MS", 3600000),
		StoragePath:         env("STORAGE_PATH", "storage"),
		PublicStoragePath:   env("PUBLIC_STORAGE_PATH", "/media"),
		BlockRoot:           env("BLOCK_ROOT", "../../blocks"),
		MaxUploadBytes:      envInt64("MAX_UPLOAD_BYTES", 20<<20),
		RenderTimeout:       envDurationMS("RENDER_TIMEOUT_MS", 5000),
		RequestTimeout:      envDurationMS("HTTP_REQUEST_TIMEOUT_MS", 30000),
		ReadTimeout:         envDurationMS("HTTP_READ_TIMEOUT_MS", 15000),
		WriteTimeout:        envDurationMS("HTTP_WRITE_TIMEOUT_MS", 30000),
		IdleTimeout:         envDurationMS("HTTP_IDLE_TIMEOUT_MS", 60000),
		ShutdownTimeout:     envDurationMS("SHUTDOWN_TIMEOUT_MS", 10000),
		CORSOrigins:         splitCSV(env("CORS_ORIGINS", "")),
		MigrateOnStart:      envBool("DB_MIGRATE_ON_START", true),
		Capabilities:        map[string]bool{"portable-blocks": true, "template-v1": true, "responsive-layout": true, "design-tokens": true, "structured-errors": true, "datasource-adapter": true},
	}
	if cfg.HTTPAddress == "" {
		return Config{}, fmt.Errorf("HTTP_ADDR cannot be empty")
	}
	if cfg.DatabaseDSN == "" {
		return Config{}, fmt.Errorf("DB_DSN cannot be empty")
	}
	switch cfg.DatabaseDriver {
	case "sqlite", "postgres", "mysql", "sqlserver":
	default:
		return Config{}, fmt.Errorf("unsupported DB_DRIVER %q", cfg.DatabaseDriver)
	}
	if cfg.DatabaseMaxOpen <= 0 || cfg.DatabaseMaxIdle < 0 || cfg.DatabaseMaxIdle > cfg.DatabaseMaxOpen || cfg.DatabaseConnMaxLife <= 0 {
		return Config{}, fmt.Errorf("invalid database pool configuration")
	}
	if cfg.MaxUploadBytes <= 0 {
		return Config{}, fmt.Errorf("MAX_UPLOAD_BYTES must be positive")
	}
	if cfg.RenderTimeout <= 0 || cfg.RequestTimeout <= 0 || cfg.ReadTimeout <= 0 || cfg.WriteTimeout <= 0 || cfg.IdleTimeout <= 0 || cfg.ShutdownTimeout <= 0 {
		return Config{}, fmt.Errorf("timeout values must be positive")
	}
	if !strings.HasPrefix(cfg.PublicStoragePath, "/") {
		return Config{}, fmt.Errorf("PUBLIC_STORAGE_PATH must begin with /")
	}
	return cfg, nil
}

func env(k, d string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return d
}

func envBool(k string, d bool) bool {
	v := strings.TrimSpace(os.Getenv(k))
	if v == "" {
		return d
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return d
	}
	return b
}

func envInt(k string, d int) int {
	v := strings.TrimSpace(os.Getenv(k))
	if v == "" {
		return d
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return d
	}
	return n
}

func envInt64(k string, d int64) int64 {
	v := strings.TrimSpace(os.Getenv(k))
	if v == "" {
		return d
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return d
	}
	return n
}

func envDurationMS(k string, d int64) time.Duration {
	return time.Duration(envInt64(k, d)) * time.Millisecond
}

func splitCSV(v string) []string {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
