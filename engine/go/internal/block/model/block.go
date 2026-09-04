package model

type Definition struct {
	Type     string         `json:"type"`
	Manifest map[string]any `json:"manifest"`
}
