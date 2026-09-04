package database

import (
	"fmt"
	"time"

	datasourcemodel "github.com/zaengit/page-builder/engine/go/internal/datasource/model"
	mediamodel "github.com/zaengit/page-builder/engine/go/internal/media/model"
	pagemodel "github.com/zaengit/page-builder/engine/go/internal/page/model"
	settingmodel "github.com/zaengit/page-builder/engine/go/internal/setting/model"
	"gorm.io/gorm"
)

type SchemaMigration struct {
	Version   uint      `gorm:"primaryKey"`
	AppliedAt time.Time `gorm:"not null"`
}

func (SchemaMigration) TableName() string { return "schema_migrations" }

type migration struct {
	version uint
	run     func(*gorm.DB) error
}

var migrations = []migration{{version: 1, run: func(db *gorm.DB) error {
	return db.AutoMigrate(&pagemodel.Page{}, &mediamodel.Media{}, &settingmodel.Setting{}, &datasourcemodel.Datasource{})
}}}

func Migrate(db *gorm.DB) error {
	if err := db.AutoMigrate(&SchemaMigration{}); err != nil {
		return fmt.Errorf("create migration table: %w", err)
	}
	for _, m := range migrations {
		var count int64
		if err := db.Model(&SchemaMigration{}).Where("version = ?", m.version).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}
		if err := db.Transaction(func(tx *gorm.DB) error {
			if err := m.run(tx); err != nil {
				return err
			}
			return tx.Create(&SchemaMigration{Version: m.version, AppliedAt: time.Now().UTC()}).Error
		}); err != nil {
			return fmt.Errorf("migration %d: %w", m.version, err)
		}
	}
	return nil
}
