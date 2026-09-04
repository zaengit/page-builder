package repository

import pagebuilder "github.com/zaengit/page-builder/engine/go"

type Repository struct{ root string }
func New(root string)*Repository{return &Repository{root:root}}
func(r *Repository)Load()(map[string]map[string]any,error){return pagebuilder.LoadRegistry(r.root)}
