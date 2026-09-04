package service

import (
	"context"

	pagebuilder "github.com/zaengit/page-builder/engine/go"
)

type RenderService struct {
	renderer pagebuilder.Renderer
}

func NewRenderService(renderer pagebuilder.Renderer) RenderService {
	return RenderService{renderer: renderer}
}

func (s RenderService) Render(ctx context.Context, page map[string]any, registry map[string]map[string]any, runtime map[string]any) (pagebuilder.RenderResult, error) {
	if err := pagebuilder.ValidatePage(page); err != nil {
		return pagebuilder.RenderResult{}, err
	}
	return s.renderer.Render(ctx, pagebuilder.RenderRequest{
		Page:     page,
		Registry: registry,
		Context:  runtime,
	})
}
