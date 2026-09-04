package repository

import (
	"context"
	pagemodel "github.com/zaengit/page-builder/engine/go/internal/page/model"
	pagerepo "github.com/zaengit/page-builder/engine/go/internal/page/repository"
)

type PageRepository struct{ pages *pagerepo.Repository }

func NewPageRepository(p *pagerepo.Repository) *PageRepository { return &PageRepository{pages: p} }
func (r *PageRepository) BySlug(ctx context.Context, slug string) (*pagemodel.Page, error) {
	return r.pages.BySlug(ctx, slug)
}
