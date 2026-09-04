package repository

import renderengine "github.com/zaengit/page-builder/engine/go/internal/render/engine"

type Repository struct{ root string }

func New(root string) *Repository { return &Repository{root: root} }
func (r *Repository) Load() (map[string]map[string]any, error) {
	return renderengine.LoadRegistry(r.root)
}
