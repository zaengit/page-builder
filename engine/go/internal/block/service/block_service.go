package service

import (
	"context"
	"fmt"
	"sort"

	blockrepo "github.com/zaengit/page-builder/engine/go/internal/block/repository"
)

type Service struct{ repo *blockrepo.Repository }

func New(root string) *Service { return &Service{repo: blockrepo.New(root)} }

func (s *Service) Registry(ctx context.Context) (map[string]map[string]any, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}
	return s.repo.Load()
}

func (s *Service) List(ctx context.Context) ([]map[string]any, error) {
	registry, err := s.Registry(ctx)
	if err != nil {
		return nil, err
	}
	keys := make([]string, 0, len(registry))
	for key := range registry {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	out := make([]map[string]any, 0, len(keys))
	for _, key := range keys {
		definition := registry[key]
		item := map[string]any{"type": key}
		for name, value := range definition {
			item[name] = value
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *Service) Get(ctx context.Context, blockType string) (map[string]any, error) {
	registry, err := s.Registry(ctx)
	if err != nil {
		return nil, err
	}
	definition, ok := registry[blockType]
	if !ok {
		return nil, fmt.Errorf("block %q not found", blockType)
	}
	return definition, nil
}
