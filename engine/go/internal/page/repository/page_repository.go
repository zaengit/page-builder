package repository

import (
	"context"
	"errors"
	"strings"

	pagemodel "github.com/zaengit/page-builder/engine/go/internal/page/model"
	"gorm.io/gorm"
)

type Repository struct{ db *gorm.DB }

type ListOptions struct {
	Limit     int
	Offset    int
	Status    string
	Search    string
	OrderBy   string
	Direction string
}

func New(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, p *pagemodel.Page) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *Repository) Get(ctx context.Context, id uint) (*pagemodel.Page, error) {
	var p pagemodel.Page
	err := r.db.WithContext(ctx).First(&p, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &p, err
}

func (r *Repository) BySlug(ctx context.Context, slug string) (*pagemodel.Page, error) {
	var p pagemodel.Page
	err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &p, err
}

func (r *Repository) List(ctx context.Context, options ListOptions) ([]pagemodel.Page, int64, error) {
	q := r.db.WithContext(ctx).Model(&pagemodel.Page{})
	if options.Status != "" {
		q = q.Where("status = ?", options.Status)
	}
	if options.Search != "" {
		term := "%" + options.Search + "%"
		q = q.Where("title LIKE ? OR slug LIKE ?", term, term)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	allowedOrder := map[string]string{
		"id":           "id",
		"title":        "title",
		"slug":         "slug",
		"status":       "status",
		"created_at":   "created_at",
		"updated_at":   "updated_at",
		"published_at": "published_at",
	}
	orderColumn := allowedOrder[options.OrderBy]
	if orderColumn == "" {
		orderColumn = "updated_at"
	}
	direction := strings.ToUpper(options.Direction)
	if direction != "ASC" {
		direction = "DESC"
	}

	var items []pagemodel.Page
	err := q.Order(orderColumn + " " + direction).Limit(options.Limit).Offset(options.Offset).Find(&items).Error
	return items, total, err
}

func (r *Repository) Save(ctx context.Context, p *pagemodel.Page) error {
	return r.db.WithContext(ctx).Save(p).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&pagemodel.Page{}, id).Error
}
