package repository

import pagebuilder "github.com/zaengit/page-builder/engine/go"

type RegistryRepository struct{}

func NewRegistryRepository() RegistryRepository {
	return RegistryRepository{}
}

func (RegistryRepository) Resolve(blockRoot string, inline map[string]map[string]any) (map[string]map[string]any, error) {
	registry := inline
	if registry == nil {
		loaded, err := pagebuilder.LoadRegistry(blockRoot)
		if err != nil {
			return nil, err
		}
		registry = loaded
	}
	if err := pagebuilder.ValidateRegistry(registry); err != nil {
		return nil, err
	}
	return registry, nil
}
