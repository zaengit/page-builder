package model

type BlockPreviewRequest struct {
	Block   map[string]any `json:"block"`
	Context map[string]any `json:"context"`
}
