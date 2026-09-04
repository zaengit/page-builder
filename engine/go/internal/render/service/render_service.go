package service

import (
	"context"
	"encoding/json"
	"errors"
	blocksvc "github.com/zaengit/page-builder/engine/go/internal/block/service"
	pagesvc "github.com/zaengit/page-builder/engine/go/internal/page/service"
	pagebuilder "github.com/zaengit/page-builder/engine/go/internal/render/engine"
	"net/url"
	"strings"
)

type Service struct {
	pages    *pagesvc.Service
	blocks   *blocksvc.Service
	renderer pagebuilder.Renderer
}

func New(p *pagesvc.Service, b *blocksvc.Service, r pagebuilder.Renderer) *Service {
	return &Service{pages: p, blocks: b, renderer: r}
}
func (s *Service) RenderDocument(ctx context.Context, raw json.RawMessage, runtime map[string]any) (pagebuilder.RenderResult, error) {
	var page map[string]any
	if err := json.Unmarshal(raw, &page); err != nil {
		return pagebuilder.RenderResult{}, err
	}
	if err := pagebuilder.ValidatePage(page); err != nil {
		return pagebuilder.RenderResult{}, err
	}
	reg, err := s.blocks.Registry(ctx)
	if err != nil {
		return pagebuilder.RenderResult{}, err
	}
	result, err := s.renderer.Render(ctx, pagebuilder.RenderRequest{Page: page, Registry: reg, Context: runtime})
	if err != nil {
		return pagebuilder.RenderResult{}, err
	}
	result.Assets = publicAssetURLs(page, reg, result.Assets)
	return result, nil
}
func (s *Service) Preview(ctx context.Context, raw json.RawMessage, runtime map[string]any) (pagebuilder.RenderResult, error) {
	return s.RenderDocument(ctx, raw, runtime)
}
func (s *Service) BlockPreview(ctx context.Context, block map[string]any, runtime map[string]any) (pagebuilder.RenderResult, error) {
	doc := map[string]any{"version": 1, "blocks": []any{block}}
	raw, err := json.Marshal(doc)
	if err != nil {
		return pagebuilder.RenderResult{}, err
	}
	return s.RenderDocument(ctx, raw, runtime)
}
func (s *Service) Published(ctx context.Context, slug string, runtime map[string]any) (pagebuilder.RenderResult, error) {
	p, err := s.pages.PublishedBySlug(ctx, slug)
	if err != nil {
		return pagebuilder.RenderResult{}, err
	}
	if p == nil {
		return pagebuilder.RenderResult{}, errors.New("page not found")
	}
	return s.RenderDocument(ctx, p.Content, runtime)
}

func publicAssetURLs(page map[string]any, registry map[string]map[string]any, assets pagebuilder.Assets) pagebuilder.Assets {
	owners := map[string]string{}
	if blocks, ok := page["blocks"].([]any); ok {
		collectAssetOwners(blocks, registry, owners)
	}
	return pagebuilder.Assets{
		CSS: mapAssetURLs(assets.CSS, "css", owners),
		JS:  mapAssetURLs(assets.JS, "js", owners),
	}
}

func collectAssetOwners(blocks []any, registry map[string]map[string]any, owners map[string]string) {
	for _, raw := range blocks {
		block, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		typeName, _ := block["type"].(string)
		definition, ok := registry[typeName]
		if ok {
			if declared, ok := definition["assets"].(map[string]any); ok {
				for _, extension := range []string{"css", "js"} {
					items, _ := declared[extension].([]any)
					for _, rawAsset := range items {
						if name, ok := rawAsset.(string); ok {
							key := extension + "\x00" + name
							if _, exists := owners[key]; !exists {
								owners[key] = typeName
							}
						}
					}
				}
			}
		}
		if children, ok := block["children"].([]any); ok {
			collectAssetOwners(children, registry, owners)
		}
	}
}

func mapAssetURLs(assets []string, extension string, owners map[string]string) []string {
	out := make([]string, len(assets))
	for i, name := range assets {
		owner := owners[extension+"\x00"+name]
		if owner == "" {
			out[i] = name
			continue
		}
		parts := strings.SplitN(owner, "/", 2)
		if len(parts) != 2 {
			out[i] = name
			continue
		}
		out[i] = "/block-assets/" + url.PathEscape(parts[0]) + "/" + url.PathEscape(parts[1]) + "/" + url.PathEscape(name)
	}
	return out
}
