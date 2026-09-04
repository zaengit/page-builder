package service

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	blockrepo "github.com/zaengit/page-builder/engine/go/internal/block/repository"
)

type Service struct{ repo *blockrepo.Repository }

type Asset struct {
	Path        string
	ContentType string
}

var assetName = regexp.MustCompile(`^[A-Za-z0-9._-]+$`)

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

func (s *Service) Asset(ctx context.Context, blockType, name string) (Asset, error) {
	if !assetName.MatchString(name) {
		return Asset{}, fmt.Errorf("invalid asset name")
	}

	registry, err := s.Registry(ctx)
	if err != nil {
		return Asset{}, err
	}
	definition, ok := registry[blockType]
	if !ok {
		return Asset{}, fmt.Errorf("block %q not found", blockType)
	}

	extension := strings.TrimPrefix(filepath.Ext(name), ".")
	assets, _ := definition["assets"].(map[string]any)
	declared, _ := assets[extension].([]any)
	allowed := false
	for _, raw := range declared {
		if raw == name {
			allowed = true
			break
		}
	}
	if !allowed || (extension != "css" && extension != "js") {
		return Asset{}, fmt.Errorf("asset %q is not declared by block %q", name, blockType)
	}

	directory, ok := definition["_directory"].(string)
	if !ok || directory == "" {
		return Asset{}, fmt.Errorf("block %q has no asset directory", blockType)
	}
	path := filepath.Join(directory, name)
	info, err := os.Stat(path)
	if err != nil {
		return Asset{}, err
	}
	if !info.Mode().IsRegular() {
		return Asset{}, fmt.Errorf("asset %q is not a regular file", name)
	}

	contentType := map[string]string{
		"css": "text/css; charset=utf-8",
		"js":  "text/javascript; charset=utf-8",
	}[extension]
	return Asset{Path: path, ContentType: contentType}, nil
}
