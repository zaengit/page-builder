use std::collections::BTreeMap;

use serde_json::Value;

pub type JsonMap = BTreeMap<String, Value>;

pub struct RenderRequest {
    pub page: JsonMap,
    pub registry: BTreeMap<String, JsonMap>,
    pub context: JsonMap,
}

pub struct Assets {
    pub css: Vec<String>,
    pub js: Vec<String>,
}

pub struct RenderResult {
    pub html: String,
    pub assets: Assets,
    pub diagnostics: Vec<String>,
}

pub trait DataProvider {
    fn resolve(&self, request: &JsonMap, context: &JsonMap) -> Result<Value, String>;
}

pub trait Renderer {
    fn render(&self, request: RenderRequest) -> Result<RenderResult, String>;
}
