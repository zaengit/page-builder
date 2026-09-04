package pagebuilder

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
)

var portableBlockName = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9-]*$`)
var portableAssetFile = regexp.MustCompile(`^[A-Za-z0-9._-]+$`)

func LoadRegistry(root string) (map[string]map[string]any, error) {
	registry := map[string]map[string]any{}
	entries, err := os.ReadDir(root)
	if err != nil {
		if os.IsNotExist(err) {
			return registry, nil
		}
		return nil, err
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		directory := filepath.Join(root, entry.Name())
		manifestPath := filepath.Join(directory, "block.json")
		bytes, err := os.ReadFile(manifestPath)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, err
		}
		manifest := map[string]any{}
		if err := json.Unmarshal(bytes, &manifest); err != nil {
			return nil, fmt.Errorf("%s: %w", manifestPath, err)
		}
		if _, ok := manifest["version"]; !ok {
			manifest["version"] = float64(1)
		}
		name, _ := manifest["name"].(string)
		if !portableBlockName.MatchString(name) {
			return nil, fmt.Errorf("invalid block name in %s", manifestPath)
		}
		if _, exists := registry[name]; exists {
			return nil, fmt.Errorf("duplicate block %s", name)
		}
		templatePath := filepath.Join(directory, "template.html")
		template, err := os.ReadFile(templatePath)
		if err != nil {
			return nil, fmt.Errorf("missing portable template for %s: %w", name, err)
		}
		if err := ValidateTemplate(string(template)); err != nil {
			return nil, fmt.Errorf("invalid portable template for %s: %w", name, err)
		}
		absoluteDirectory, err := filepath.Abs(directory)
		if err != nil {
			return nil, err
		}
		manifest["template"] = string(template)
		manifest["_directory"] = absoluteDirectory
		if assets, ok := manifest["assets"].(map[string]any); ok {
			for _, ext := range []string{"css", "js"} {
				if items, ok := assets[ext].([]any); ok {
					for _, raw := range items {
						asset, ok := raw.(string)
						if !ok || !portableAssetFile.MatchString(asset) || filepath.Ext(asset) != "."+ext {
							return nil, fmt.Errorf("invalid %s asset for %s", ext, name)
						}
						path := filepath.Join(directory, asset)
						if _, err := os.Stat(path); err != nil {
							return nil, fmt.Errorf("missing asset %s for %s", asset, name)
						}
					}
				}
			}
		}
		registry[name] = manifest
	}
	return registry, nil
}
