package pagebuilder

import (
	"context"
	"fmt"
	"html"
	"regexp"
	"strings"
)

type RenderRequest struct {
	Page     map[string]any
	Registry map[string]map[string]any
	Context  map[string]any
}

type Assets struct {
	CSS []string `json:"css"`
	JS  []string `json:"js"`
}

type RenderResult struct {
	HTML        string   `json:"html"`
	Assets      Assets   `json:"assets"`
	Diagnostics []string `json:"diagnostics"`
}

type DataProvider interface {
	Resolve(ctx context.Context, request map[string]any, runtime map[string]any) (any, error)
}

type Renderer interface {
	Render(ctx context.Context, request RenderRequest) (RenderResult, error)
}

type UniversalRenderer struct{}

func New() *UniversalRenderer { return &UniversalRenderer{} }

func (r *UniversalRenderer) Render(_ context.Context, request RenderRequest) (RenderResult, error) {
	result := RenderResult{Assets: Assets{CSS: []string{}, JS: []string{}}, Diagnostics: []string{}}
	cssSeen, jsSeen := map[string]bool{}, map[string]bool{}
	blocks, _ := request.Page["blocks"].([]any)
	var body strings.Builder
	for _, raw := range blocks {
		block, _ := raw.(map[string]any)
		body.WriteString(r.renderBlock(block, request.Registry, request.Context, &result, cssSeen, jsSeen))
	}
	result.HTML = `<div class="pb-page">` + body.String() + `</div>`
	return result, nil
}

func (r *UniversalRenderer) renderBlock(block map[string]any, registry map[string]map[string]any, runtime map[string]any, result *RenderResult, cssSeen, jsSeen map[string]bool) string {
	typeName, _ := block["type"].(string)
	definition, ok := registry[typeName]
	if !ok {
		result.Diagnostics = append(result.Diagnostics, "unknown_block:"+typeName)
		return ""
	}
	collectAssets(definition, result, cssSeen, jsSeen)

	attrs := defaults(definition)
	if blockAttrs, ok := block["attrs"].(map[string]any); ok {
		for k, v := range blockAttrs { attrs[k] = v }
	}

	var children strings.Builder
	if rawChildren, ok := block["children"].([]any); ok {
		for _, raw := range rawChildren {
			child, _ := raw.(map[string]any)
			children.WriteString(r.renderBlock(child, registry, runtime, result, cssSeen, jsSeen))
		}
	}

	template, _ := definition["template"].(string)
	ctx := map[string]any{
		"attrs": attrs,
		"context": runtime,
		"children": children.String(),
		"blockId": block["id"],
		"slot": block["slot"],
		"preview": false,
	}
	htmlOut := RenderTemplate(template, ctx)
	id := html.EscapeString(fmt.Sprint(block["id"]))
	return `<div data-pb-id="` + id + `">` + htmlOut + `</div>`
}

func defaults(definition map[string]any) map[string]any {
	out := map[string]any{}
	attributes, _ := definition["attributes"].(map[string]any)
	for key, raw := range attributes {
		schema, _ := raw.(map[string]any)
		if value, ok := schema["default"]; ok { out[key] = value }
	}
	return out
}

func collectAssets(definition map[string]any, result *RenderResult, cssSeen, jsSeen map[string]bool) {
	assets, _ := definition["assets"].(map[string]any)
	for _, spec := range []struct{name string; target *[]string; seen map[string]bool}{{"css", &result.Assets.CSS, cssSeen}, {"js", &result.Assets.JS, jsSeen}} {
		items, _ := assets[spec.name].([]any)
		for _, raw := range items {
			item, ok := raw.(string); if !ok || spec.seen[item] { continue }
			spec.seen[item] = true; *spec.target = append(*spec.target, item)
		}
	}
}

var rawPattern = regexp.MustCompile(`\{\{\{\s*([A-Za-z0-9_.]+)\s*\}\}\}`)
var interpolationPattern = regexp.MustCompile(`\{\{\s*([A-Za-z0-9_.]+)(?:\s*\?\?\s*["']([^"']*)["'])?\s*\}\}`)
var conditionPattern = regexp.MustCompile(`(?s)\{%\s*if\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endif\s*%\}`)
var loopPattern = regexp.MustCompile(`(?s)\{%\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endfor\s*%\}`)

func RenderTemplate(template string, ctx map[string]any) string {
	for loopPattern.MatchString(template) {
		template = loopPattern.ReplaceAllStringFunc(template, func(fragment string) string {
			m := loopPattern.FindStringSubmatch(fragment); items, _ := resolve(ctx, m[2]).([]any)
			var out strings.Builder
			for i, item := range items {
				local := clone(ctx); local[m[1]] = item; local["loop"] = map[string]any{"index": i, "number": i+1, "first": i == 0, "last": i == len(items)-1, "count": len(items)}
				out.WriteString(RenderTemplate(m[3], local))
			}
			return out.String()
		})
	}
	for conditionPattern.MatchString(template) {
		template = conditionPattern.ReplaceAllStringFunc(template, func(fragment string) string {
			m := conditionPattern.FindStringSubmatch(fragment); if truthy(resolve(ctx, m[1])) { return RenderTemplate(m[2], ctx) }; return ""
		})
	}
	template = rawPattern.ReplaceAllStringFunc(template, func(fragment string) string {
		m := rawPattern.FindStringSubmatch(fragment); v := resolve(ctx, m[1]); if v == nil { return "" }; return fmt.Sprint(v)
	})
	return interpolationPattern.ReplaceAllStringFunc(template, func(fragment string) string {
		m := interpolationPattern.FindStringSubmatch(fragment); v := resolve(ctx, m[1]); if v == nil && len(m) > 2 { v = m[2] }; if v == nil { return "" }; return html.EscapeString(fmt.Sprint(v))
	})
}

func resolve(ctx map[string]any, path string) any {
	var current any = ctx
	for _, part := range strings.Split(path, ".") {
		m, ok := current.(map[string]any); if !ok { return nil }; current, ok = m[part]; if !ok { return nil }
	}
	return current
}
func clone(in map[string]any) map[string]any { out := make(map[string]any, len(in)); for k,v := range in { out[k]=v }; return out }
func truthy(v any) bool { switch x := v.(type) { case nil: return false; case bool: return x; case string: return x != ""; case []any: return len(x)>0; default: return true } }
