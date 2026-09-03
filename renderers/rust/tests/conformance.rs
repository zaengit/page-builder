use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

use page_builder_renderer_rust::{
    JsonMap, RenderRequest, Renderer, UniversalRenderer, load_registry,
};
use serde_json::{Value, json};

#[test]
fn portable_runtime_conformance() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../specification/conformance/portable-runtime.json");
    let fixture: Value = serde_json::from_str(&fs::read_to_string(path).unwrap()).unwrap();
    let page: JsonMap = serde_json::from_value(fixture["page"].clone()).unwrap();
    let registry: BTreeMap<String, JsonMap> =
        serde_json::from_value(fixture["registry"].clone()).unwrap();
    let context: JsonMap = serde_json::from_value(fixture["context"].clone()).unwrap();
    let result = UniversalRenderer::new()
        .render(RenderRequest { page, registry, context })
        .unwrap();

    assert_eq!(result.html, fixture["expected"]["html"].as_str().unwrap());
    assert_eq!(
        result.assets.css,
        serde_json::from_value::<Vec<String>>(fixture["expected"]["assets"]["css"].clone())
            .unwrap()
    );
    assert_eq!(
        result.assets.js,
        serde_json::from_value::<Vec<String>>(fixture["expected"]["assets"]["js"].clone())
            .unwrap()
    );
    assert!(result.diagnostics.is_empty());
}

#[test]
fn loads_and_renders_builtin_portable_blocks() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../blocks");
    let registry = load_registry(&root).unwrap();
    for name in [
        "core/heading",
        "core/image",
        "core/container",
        "core/columns",
        "core/carousel",
    ] {
        assert!(registry.contains_key(name), "{name} should load");
    }

    let page: JsonMap = serde_json::from_value(json!({
        "version": 1,
        "blocks": [
            {
                "id": "h1",
                "type": "core/heading",
                "attrs": {"text": "Portable <Heading>", "level": 2},
                "children": []
            }
        ]
    }))
    .unwrap();
    let result = UniversalRenderer::new()
        .render(RenderRequest {
            page,
            registry,
            context: JsonMap::new(),
        })
        .unwrap();

    assert!(result.html.contains("Portable &lt;Heading&gt;"));
    assert!(result.diagnostics.is_empty());
}
