package repository

import (
	"context"
	mediamodel "github.com/zaengit/page-builder/engine/go/internal/media/model"
	"gorm.io/gorm"
)

type Repository struct{ db *gorm.DB }

func New(db *gorm.DB) *Repository { return &Repository{db: db} }
func (r *Repository) Create(ctx context.Context, m *mediamodel.Media) error {
	return r.db.WithContext(ctx).Create(m).Error
}
func (r *Repository) List(ctx context.Context) ([]mediamodel.Media, error) {
	var v []mediamodel.Media
	err := r.db.WithContext(ctx).Order("created_at desc").Find(&v).Error
	return v, err
}
func (r *Repository) Get(ctx context.Context, id uint) (*mediamodel.Media, error) {
	var m mediamodel.Media
	if err := r.db.WithContext(ctx).First(&m, id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}
func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&mediamodel.Media{}, id).Error
}
