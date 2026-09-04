package model

import "encoding/json"

type PagePreviewRequest struct {
	Page    json.RawMessage `json:"page"`
	Context map[string]any  `json:"context"`
}
type BlockPreviewRequest struct {
	Block   map[string]any `json:"block"`
	Context map[string]any `json:"context"`
}
