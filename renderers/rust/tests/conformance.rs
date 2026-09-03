use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

use page_builder_renderer_rust::{JsonMap, RenderRequest, Renderer, UniversalRenderer};
use serde_json::Value;

#[test]
fn portable_runtime_conformance() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../specification/conformance/portable-runtime.json");
    let fixture: Value = serde_json::from_str(&fs::read_to_string(path).unwrap()).unwrap();
    let page: JsonMap = serde_json::from_value(fixture["page"].clone()).unwrap();
    let registry: BTreeMap<String, JsonMap> = serde_json::from_value(fixture["registry"].clone()).unwrap();
    let context: JsonMap = serde_json::from_value(fixture["context"].clone()).unwrap();
    let result = UniversalRenderer::new().render(RenderRequest { page, registry, context }).unwrap();

    assert_eq!(result.html, fixture["expected"]["html"].as_str().unwrap());
    assert_eq!(result.assets.css, serde_json::from_value::<Vec<String>>(fixture["expected"]["assets"]["css"].clone()).unwrap());
    assert_eq!(result.assets.js, serde_json::from_value::<Vec<String>>(fixture["expected"]["assets"]["js"].clone()).unwrap());
    assert!(result.diagnostics.is_empty());
}
