package database

import (
	"context"
	"fmt"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/zaengit/page-builder/engine/go/internal/config"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(cfg config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector
	switch cfg.DatabaseDriver {
	case "sqlite":
		dialector = sqlite.Open(cfg.DatabaseDSN)
	case "postgres":
		dialector = postgres.Open(cfg.DatabaseDSN)
	case "mysql":
		dialector = mysql.Open(cfg.DatabaseDSN)
	case "sqlserver":
		dialector = sqlserver.Open(cfg.DatabaseDSN)
	default:
		return nil, fmt.Errorf("unsupported database driver %q", cfg.DatabaseDriver)
	}

	level := logger.Warn
	if cfg.Environment == "development" {
		level = logger.Info
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger:      logger.Default.LogMode(level),
		PrepareStmt: true,
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxIdleConns(cfg.DatabaseMaxIdle)
	sqlDB.SetMaxOpenConns(cfg.DatabaseMaxOpen)
	sqlDB.SetConnMaxLifetime(cfg.DatabaseConnMaxLife)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return db, nil
}

func Close(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func Ready(ctx context.Context, db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}

func Transaction(ctx context.Context, db *gorm.DB, fn func(*gorm.DB) error) error {
	return db.WithContext(ctx).Transaction(fn)
}
