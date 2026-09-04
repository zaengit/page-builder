package repository

import (
	"context"
	"errors"

	datasourcemodel "github.com/zaengit/page-builder/engine/go/internal/datasource/model"
	"gorm.io/gorm"
)

type Repository struct{ db *gorm.DB }

func New(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) List(ctx context.Context) ([]datasourcemodel.Datasource, error) {
	var items []datasourcemodel.Datasource
	return items, r.db.WithContext(ctx).Order("name asc").Find(&items).Error
}

func (r *Repository) ByResource(ctx context.Context, resource string) (*datasourcemodel.Datasource, error) {
	var item datasourcemodel.Datasource
	err := r.db.WithContext(ctx).Where("resource = ?", resource).First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &item, err
}

func (r *Repository) Upsert(ctx context.Context, item *datasourcemodel.Datasource) error {
	var current datasourcemodel.Datasource
	err := r.db.WithContext(ctx).Where("name = ?", item.Name).First(&current).Error
	if err == nil {
		item.ID = current.ID
		return r.db.WithContext(ctx).Save(item).Error
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *Repository) DB() *gorm.DB { return r.db }
