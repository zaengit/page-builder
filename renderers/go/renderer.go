package pagebuilder

import "context"

type RenderRequest struct {
	Page     map[string]any
	Registry map[string]map[string]any
	Context  map[string]any
}

type Assets struct {
	CSS []string
	JS  []string
}

type RenderResult struct {
	HTML        string
	Assets      Assets
	Diagnostics []string
}

type DataProvider interface {
	Resolve(ctx context.Context, request map[string]any, runtime map[string]any) (any, error)
}

type Renderer interface {
	Render(ctx context.Context, request RenderRequest) (RenderResult, error)
}
