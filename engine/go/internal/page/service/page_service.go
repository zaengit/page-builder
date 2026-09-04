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

type ValidationError struct{ Err error }

func (e ValidationError) Error() string { return e.Err.Error() }
func (e ValidationError) Unwrap() error { return e.Err }

type ListOptions struct {
	Limit     int
	Offset    int
	Status    string
	Search    string
	OrderBy   string
	Direction string
}

type Service struct{ repo *pagerepo.Repository }

func New(repo *pagerepo.Repository) *Service { return &Service{repo: repo} }

func normalizeSlug(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	v = slugRE.ReplaceAllString(v, "-")
	return strings.Trim(v, "-")
}

func validation(err error) error { return ValidationError{Err: err} }

func validateContent(raw json.RawMessage) error {
	var doc map[string]any
	if err := json.Unmarshal(raw, &doc); err != nil {
		return validation(fmt.Errorf("invalid page JSON: %w", err))
	}
	if err := pagebuilder.ValidatePage(doc); err != nil {
		return validation(fmt.Errorf("invalid page content: %w", err))
	}
	return nil
}

func (s *Service) Create(ctx context.Context, title, slug string, content json.RawMessage) (*pagemodel.Page, error) {
	if err := validateContent(content); err != nil {
		return nil, err
	}
	title = strings.TrimSpace(title)
	if title == "" {
		return nil, validation(errors.New("title is required"))
	}
	slug = normalizeSlug(slug)
	if slug == "" {
		slug = normalizeSlug(title)
	}
	if slug == "" {
		return nil, validation(errors.New("slug is required"))
	}
	if existing, err := s.repo.BySlug(ctx, slug); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, validation(errors.New("slug already exists"))
	}

	p := &pagemodel.Page{
		Title:    title,
		Slug:     slug,
		Status:   "draft",
		Content:  content,
		Revision: 1,
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Service) Get(ctx context.Context, id uint) (*pagemodel.Page, error) {
	return s.repo.Get(ctx, id)
}

func (s *Service) List(ctx context.Context, options ListOptions) ([]pagemodel.Page, int64, error) {
	if options.Limit <= 0 || options.Limit > 100 {
		options.Limit = 20
	}
	if options.Offset < 0 {
		options.Offset = 0
	}
	options.Status = strings.TrimSpace(options.Status)
	if options.Status != "" && options.Status != "draft" && options.Status != "published" {
		return nil, 0, validation(errors.New("status must be draft or published"))
	}
	options.Search = strings.TrimSpace(options.Search)
	return s.repo.List(ctx, pagerepo.ListOptions{
		Limit:     options.Limit,
		Offset:    options.Offset,
		Status:    options.Status,
		Search:    options.Search,
		OrderBy:   strings.TrimSpace(options.OrderBy),
		Direction: strings.TrimSpace(options.Direction),
	})
}

func (s *Service) Update(ctx context.Context, id uint, title, slug *string, content *json.RawMessage) (*pagemodel.Page, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil || p == nil {
		return p, err
	}
	if title != nil {
		p.Title = strings.TrimSpace(*title)
		if p.Title == "" {
			return nil, validation(errors.New("title is required"))
		}
	}
	if slug != nil {
		candidate := normalizeSlug(*slug)
		if candidate == "" {
			return nil, validation(errors.New("slug is required"))
		}
		if candidate != p.Slug {
			existing, err := s.repo.BySlug(ctx, candidate)
			if err != nil {
				return nil, err
			}
			if existing != nil && existing.ID != p.ID {
				return nil, validation(errors.New("slug already exists"))
			}
		}
		p.Slug = candidate
	}
	if content != nil {
		if err := validateContent(*content); err != nil {
			return nil, err
		}
		p.Content = *content
	}
	p.Revision++
	if err := s.repo.Save(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Service) Duplicate(ctx context.Context, id uint) (*pagemodel.Page, error) {
	source, err := s.repo.Get(ctx, id)
	if err != nil || source == nil {
		return source, err
	}
	baseSlug := normalizeSlug(source.Slug + "-copy")
	candidate := baseSlug
	for suffix := 2; ; suffix++ {
		existing, err := s.repo.BySlug(ctx, candidate)
		if err != nil {
			return nil, err
		}
		if existing == nil {
			break
		}
		candidate = fmt.Sprintf("%s-%d", baseSlug, suffix)
	}
	copyPage := &pagemodel.Page{
		Title:    source.Title + " Copy",
		Slug:     candidate,
		Status:   "draft",
		Content:  append(json.RawMessage(nil), source.Content...),
		Revision: 1,
	}
	if err := s.repo.Create(ctx, copyPage); err != nil {
		return nil, err
	}
	return copyPage, nil
}

func (s *Service) Publish(ctx context.Context, id uint, published bool) (*pagemodel.Page, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil || p == nil {
		return p, err
	}
	if published {
		if err := validateContent(p.Content); err != nil {
			return nil, err
		}
		now := time.Now().UTC()
		p.Status = "published"
		p.PublishedAt = &now
	} else {
		p.Status = "draft"
		p.PublishedAt = nil
	}
	p.Revision++
	if err := s.repo.Save(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Service) Delete(ctx context.Context, id uint) error { return s.repo.Delete(ctx, id) }

func (s *Service) PublishedBySlug(ctx context.Context, slug string) (*pagemodel.Page, error) {
	p, err := s.repo.BySlug(ctx, normalizeSlug(slug))
	if err != nil || p == nil {
		return p, err
	}
	if p.Status != "published" {
		return nil, nil
	}
	return p, nil
}
