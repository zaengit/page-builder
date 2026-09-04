package model

type RenderRequest struct {
	Version              int                       `json:"version"`
	Page                 map[string]any            `json:"page"`
	Context              map[string]any            `json:"context"`
	BlockRoot            string                    `json:"blockRoot"`
	Registry             map[string]map[string]any `json:"registry"`
	RequiredCapabilities []string                  `json:"requiredCapabilities"`
}
