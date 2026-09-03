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
var portableTemplateFile = regexp.MustCompile(`^[A-Za-z0-9._-]+\.html$`)

func LoadRegistry(root string) (map[string]map[string]any, error) {
	registry := map[string]map[string]any{}
	entries, err := os.ReadDir(root)
	if err != nil {
		if os.IsNotExist(err) { return registry, nil }
		return nil, err
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })

	for _, entry := range entries {
		if !entry.IsDir() { continue }
		directory := filepath.Join(root, entry.Name())
		manifestPath := filepath.Join(directory, "block.json")
		bytes, err := os.ReadFile(manifestPath)
		if err != nil {
			if os.IsNotExist(err) { continue }
			return nil, err
		}
		manifest := map[string]any{}
		if err := json.Unmarshal(bytes, &manifest); err != nil { return nil, fmt.Errorf("%s: %w", manifestPath, err) }
		if _, ok := manifest["version"]; !ok { manifest["version"] = float64(1) }
		name, _ := manifest["name"].(string)
		if !portableBlockName.MatchString(name) { return nil, fmt.Errorf("invalid block name in %s", manifestPath) }
		if _, exists := registry[name]; exists { return nil, fmt.Errorf("duplicate block %s", name) }
		templateFile := "template.html"
		if configured, ok := manifest["template"].(string); ok && configured != "" { templateFile = configured }
		if !portableTemplateFile.MatchString(templateFile) { return nil, fmt.Errorf("invalid portable template for %s", name) }
		templatePath := filepath.Join(directory, templateFile)
		template, err := os.ReadFile(templatePath)
		if err != nil { return nil, fmt.Errorf("missing portable template for %s: %w", name, err) }
		absoluteDirectory, err := filepath.Abs(directory)
		if err != nil { return nil, err }
		manifest["template"] = string(template)
		manifest["_directory"] = absoluteDirectory
		registry[name] = manifest
	}
	return registry, nil
}
