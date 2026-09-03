use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use regex::Regex;
use serde_json::Value;

use crate::JsonMap;

pub fn load_registry(root: impl AsRef<Path>) -> Result<BTreeMap<String, JsonMap>, String> {
    let root = root.as_ref();
    let mut registry = BTreeMap::new();
    if !root.is_dir() {
        return Ok(registry);
    }

    let block_name = Regex::new(r"^[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9-]*$").unwrap();
    let template_file = Regex::new(r"^[A-Za-z0-9._-]+\.html$").unwrap();
    let mut directories = fs::read_dir(root)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_dir())
        .collect::<Vec<_>>();
    directories.sort_by_key(|entry| entry.file_name());

    for entry in directories {
        let directory = entry.path();
        let manifest_path = directory.join("block.json");
        if !manifest_path.is_file() {
            continue;
        }
        let contents = fs::read_to_string(&manifest_path).map_err(|error| error.to_string())?;
        let mut manifest: JsonMap = serde_json::from_str(&contents).map_err(|error| error.to_string())?;
        manifest.entry("version").or_insert(Value::from(1));
        let name = manifest.get("name").and_then(Value::as_str).unwrap_or("").to_string();
        if !block_name.is_match(&name) {
            return Err(format!("invalid block name in {}", manifest_path.display()));
        }
        if registry.contains_key(&name) {
            return Err(format!("duplicate block {name}"));
        }
        let template_name = manifest
            .get("template")
            .and_then(Value::as_str)
            .unwrap_or("template.html")
            .to_string();
        if !template_file.is_match(&template_name) {
            return Err(format!("invalid portable template for {name}"));
        }
        let template_path = directory.join(template_name);
        let template = fs::read_to_string(&template_path)
            .map_err(|_| format!("missing portable template for {name}"))?;
        manifest.insert("template".into(), Value::String(template));
        manifest.insert(
            "_directory".into(),
            Value::String(
                directory
                    .canonicalize()
                    .map_err(|error| error.to_string())?
                    .display()
                    .to_string(),
            ),
        );
        registry.insert(name, manifest);
    }

    Ok(registry)
}
