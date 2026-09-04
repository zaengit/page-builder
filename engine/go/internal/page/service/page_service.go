package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
	pagemodel "github.com/zaengit/page-builder/engine/go/internal/page/model"
	pagerepo "github.com/zaengit/page-builder/engine/go/internal/page/repository"
)

var slugRE = regexp.MustCompile(`[^a-z0-9]+`)

type Service struct{ repo *pagerepo.Repository }

func New(repo *pagerepo.Repository) *Service { return &Service{repo: repo} }
func normalizeSlug(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	v = slugRE.ReplaceAllString(v, "-")
	return strings.Trim(v, "-")
}
func validateContent(raw json.RawMessage) error {
	var doc map[string]any
	if err := json.Unmarshal(raw, &doc); err != nil {
		return err
	}
	return pagebuilder.ValidatePage(doc)
}
func (s *Service) Create(ctx context.Context, title, slug string, content json.RawMessage) (*pagemodel.Page, error) {
	if err := validateContent(content); err != nil {
		return nil, fmt.Errorf("invalid page content: %w", err)
	}
	slug = normalizeSlug(slug)
	if slug == "" {
		slug = normalizeSlug(title)
	}
	if slug == "" {
		return nil, errors.New("slug is required")
	}
	p := &pagemodel.Page{Title: strings.TrimSpace(title), Slug: slug, Status: "draft", Content: content, Revision: 1}
	if p.Title == "" {
		return nil, errors.New("title is required")
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}
func (s *Service) Get(ctx context.Context, id uint) (*pagemodel.Page, error) {
	return s.repo.Get(ctx, id)
}
func (s *Service) List(ctx context.Context, limit, offset int, status string) ([]pagemodel.Page, int64, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.List(ctx, limit, offset, status)
}
func (s *Service) Update(ctx context.Context, id uint, title, slug *string, content *json.RawMessage) (*pagemodel.Page, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil || p == nil {
		return p, err
	}
	if title != nil {
		p.Title = strings.TrimSpace(*title)
		if p.Title == "" {
			return nil, errors.New("title is required")
		}
	}
	if slug != nil {
		p.Slug = normalizeSlug(*slug)
		if p.Slug == "" {
			return nil, errors.New("slug is required")
		}
	}
	if content != nil {
		if err := validateContent(*content); err != nil {
			return nil, err
		}
		p.Content = *content
	}
	p.Revision++
	return p, s.repo.Save(ctx, p)
}
func (s *Service) Publish(ctx context.Context, id uint, published bool) (*pagemodel.Page, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil || p == nil {
		return p, err
	}
	if published {
		now := time.Now().UTC()
		p.Status = "published"
		p.PublishedAt = &now
	} else {
		p.Status = "draft"
		p.PublishedAt = nil
	}
	p.Revision++
	return p, s.repo.Save(ctx, p)
}
func (s *Service) Delete(ctx context.Context, id uint) error { return s.repo.Delete(ctx, id) }
func (s *Service) PublishedBySlug(ctx context.Context, slug string) (*pagemodel.Page, error) {
	p, err := s.repo.BySlug(ctx, slug)
	if err != nil || p == nil {
		return p, err
	}
	if p.Status != "published" {
		return nil, nil
	}
	return p, nil
}
