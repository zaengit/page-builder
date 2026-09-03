use std::collections::BTreeMap;
use std::io::{self, Read};
use std::process::ExitCode;

use page_builder_renderer_rust::{
    JsonMap, RenderRequest, Renderer, UniversalRenderer, load_registry,
};
use serde_json::{Value, json};

fn main() -> ExitCode {
    match run() {
        Ok(result) => {
            println!("{}", result);
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<Value, String> {
    let mut input = String::new();
    io::stdin()
        .read_to_string(&mut input)
        .map_err(|error| error.to_string())?;
    let request: Value = serde_json::from_str(&input).map_err(|error| error.to_string())?;
    if request.get("version").and_then(Value::as_u64) != Some(1) {
        return Err("unsupported renderer protocol version".into());
    }

    let page: JsonMap = serde_json::from_value(request.get("page").cloned().unwrap_or_else(|| json!({})))
        .map_err(|error| error.to_string())?;
    let context: JsonMap = serde_json::from_value(request.get("context").cloned().unwrap_or_else(|| json!({})))
        .map_err(|error| error.to_string())?;
    let registry: BTreeMap<String, JsonMap> = if let Some(value) = request.get("registry") {
        serde_json::from_value(value.clone()).map_err(|error| error.to_string())?
    } else {
        let root = request
            .get("blockRoot")
            .and_then(Value::as_str)
            .ok_or_else(|| "blockRoot or registry is required".to_string())?;
        load_registry(root)?
    };

    let result = UniversalRenderer::new().render(RenderRequest {
        page,
        registry,
        context,
    })?;

    Ok(json!({
        "html": result.html,
        "assets": {
            "css": result.assets.css,
            "js": result.assets.js
        },
        "diagnostics": result.diagnostics
    }))
}
