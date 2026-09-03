use std::collections::{BTreeMap, BTreeSet};
use regex::{Captures, Regex};
use serde_json::{Map, Value};

pub type JsonMap = Map<String, Value>;
pub struct RenderRequest { pub page: JsonMap, pub registry: BTreeMap<String, JsonMap>, pub context: JsonMap }
#[derive(Debug, Default, PartialEq, Eq)] pub struct Assets { pub css: Vec<String>, pub js: Vec<String> }
#[derive(Debug, Default, PartialEq, Eq)] pub struct RenderResult { pub html: String, pub assets: Assets, pub diagnostics: Vec<String> }
pub trait DataProvider { fn resolve(&self, request: &JsonMap, context: &JsonMap) -> Result<Value, String>; }
pub trait Renderer { fn render(&self, request: RenderRequest) -> Result<RenderResult, String>; }
pub struct UniversalRenderer;

impl UniversalRenderer {
    pub fn new() -> Self { Self }
    fn render_block(&self, block: &JsonMap, request: &RenderRequest, result: &mut RenderResult, css_seen: &mut BTreeSet<String>, js_seen: &mut BTreeSet<String>) -> String {
        let block_type = block.get("type").and_then(Value::as_str).unwrap_or("");
        let Some(definition) = request.registry.get(block_type) else { result.diagnostics.push(format!("unknown_block:{block_type}")); return String::new(); };
        collect_assets(definition, result, css_seen, js_seen);
        let mut attrs = JsonMap::new();
        if let Some(attributes) = definition.get("attributes").and_then(Value::as_object) { for (key, schema) in attributes { if let Some(default) = schema.as_object().and_then(|value| value.get("default")) { attrs.insert(key.clone(), default.clone()); } } }
        if let Some(block_attrs) = block.get("attrs").and_then(Value::as_object) { for (key, value) in block_attrs { attrs.insert(key.clone(), value.clone()); } }
        resolve_context_bindings(&mut attrs, block.get("bindings"), &request.context);
        let children = block.get("children").and_then(Value::as_array).map(|items| items.iter().filter_map(Value::as_object).map(|child| self.render_block(child, request, result, css_seen, js_seen)).collect::<String>()).unwrap_or_default();
        let mut context = JsonMap::new();
        context.insert("attrs".into(), Value::Object(attrs));
        context.insert("context".into(), Value::Object(request.context.clone()));
        context.insert("children".into(), Value::String(children));
        context.insert("blockId".into(), block.get("id").cloned().unwrap_or(Value::String(String::new())));
        context.insert("slot".into(), block.get("slot").cloned().unwrap_or(Value::Null));
        context.insert("preview".into(), Value::Bool(false));
        let template = definition.get("template").and_then(Value::as_str).unwrap_or("");
        wrap_block(block, &render_template(template, &context))
    }
}
impl Default for UniversalRenderer { fn default() -> Self { Self::new() } }
impl Renderer for UniversalRenderer {
    fn render(&self, request: RenderRequest) -> Result<RenderResult, String> {
        let mut result = RenderResult::default(); let mut css_seen = BTreeSet::new(); let mut js_seen = BTreeSet::new();
        let body = request.page.get("blocks").and_then(Value::as_array).map(|blocks| blocks.iter().filter_map(Value::as_object).map(|block| self.render_block(block, &request, &mut result, &mut css_seen, &mut js_seen)).collect::<String>()).unwrap_or_default();
        result.html = wrap_page(&request.page, &body); Ok(result)
    }
}

fn wrap_block(block: &JsonMap, rendered: &str) -> String {
    let id = escape_html(block.get("id").and_then(Value::as_str).unwrap_or(""));
    let Some(compiled) = block.get("_render").and_then(Value::as_object) else { return format!("<div data-pb-id=\"{id}\">{rendered}</div>"); };
    let slot = compiled.get("slot").filter(|v| !v.is_null()).map(|v| format!(" data-pb-slot=\"{}\"", escape_html(v.as_str().unwrap_or(&v.to_string())))).unwrap_or_default();
    let scheme = compiled.get("colorSchemeId").and_then(Value::as_str).filter(|v| !v.is_empty()).map(|v| { let safe = escape_html(v); format!(" class=\"pb-color-scheme--{safe}\" data-pb-color-scheme=\"{safe}\"") }).unwrap_or_default();
    let style = escape_html(compiled.get("style").and_then(Value::as_str).unwrap_or(""));
    let responsive = compiled.get("css").and_then(Value::as_str).filter(|v| !v.is_empty()).map(|css| format!("<style data-pb-responsive=\"{id}\">{}</style>", css.replace("</style", ""))).unwrap_or_default();
    format!("<div data-pb-style-id=\"{id}\" data-pb-id=\"{id}\"{scheme}{slot} style=\"{style}\">{rendered}</div>{responsive}")
}

fn wrap_page(page: &JsonMap, body: &str) -> String {
    let Some(compiled) = page.get("_pageRender").and_then(Value::as_object) else { return format!("<div class=\"pb-page\">{body}</div>"); };
    let class_name = escape_html(compiled.get("class").and_then(Value::as_str).filter(|v| !v.is_empty()).unwrap_or("pb-page"));
    let style = escape_html(compiled.get("style").and_then(Value::as_str).unwrap_or(""));
    let mut output = format!("<div class=\"{class_name}\" style=\"{style}\">{body}</div>");
    for (key, attr) in [("colorSchemeCss", "data-pb-color-schemes"), ("typographyCss", "data-pb-typography"), ("customCss", "data-pb-page-css")] {
        if let Some(css) = compiled.get(key).and_then(Value::as_str).filter(|v| !v.is_empty()) {
            let mut safe = css.replace("</style", "");
            if key == "customCss" { safe = safe.replace("<script", ""); }
            output.push_str(&format!("<style {attr}>{safe}</style>"));
        }
    }
    output
}

fn resolve_context_bindings(attrs: &mut JsonMap, bindings: Option<&Value>, runtime: &JsonMap) {
    let Some(bindings) = bindings.and_then(Value::as_object) else { return; };
    for (attribute, raw) in bindings { let Some(binding) = raw.as_object() else { continue; }; if binding.get("source").and_then(Value::as_str) != Some("context") { continue; }
        let path = binding.get("path").and_then(Value::as_str).unwrap_or(""); let value = resolve(runtime, path).cloned().or_else(|| binding.get("fallback").cloned()); if let Some(value) = value { if !value.is_null() { attrs.insert(attribute.clone(), value); } }
    }
}
fn collect_assets(definition: &JsonMap, result: &mut RenderResult, css_seen: &mut BTreeSet<String>, js_seen: &mut BTreeSet<String>) {
    let Some(assets) = definition.get("assets").and_then(Value::as_object) else { return; };
    if let Some(items) = assets.get("css").and_then(Value::as_array) { for item in items.iter().filter_map(Value::as_str) { if css_seen.insert(item.to_string()) { result.assets.css.push(item.to_string()); } } }
    if let Some(items) = assets.get("js").and_then(Value::as_array) { for item in items.iter().filter_map(Value::as_str) { if js_seen.insert(item.to_string()) { result.assets.js.push(item.to_string()); } } }
}

pub fn render_template(template: &str, context: &JsonMap) -> String {
    let loop_re = Regex::new(r"(?s)\{%\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endfor\s*%\}").unwrap();
    let condition_re = Regex::new(r"(?s)\{%\s*if\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endif\s*%\}").unwrap();
    let raw_re = Regex::new(r"\{\{\{\s*([A-Za-z0-9_.]+)\s*\}\}\}").unwrap();
    let interpolation_re = Regex::new(r#"\{\{\s*([A-Za-z0-9_.]+)(?:\s*\?\?\s*["']([^"']*)["'])?\s*\}\}"#).unwrap();
    let mut output = template.to_string();
    while loop_re.is_match(&output) { output = loop_re.replace_all(&output, |caps: &Captures| { let Some(items) = resolve(context,&caps[2]).and_then(Value::as_array) else { return String::new(); }; items.iter().enumerate().map(|(index,item)| { let mut local=context.clone(); local.insert(caps[1].to_string(),item.clone()); local.insert("loop".into(),serde_json::json!({"index":index,"number":index+1,"first":index==0,"last":index+1==items.len(),"count":items.len()})); render_template(&caps[3],&local) }).collect::<String>() }).to_string(); }
    while condition_re.is_match(&output) { output = condition_re.replace_all(&output, |caps:&Captures| if truthy(resolve(context,&caps[1])) {render_template(&caps[2],context)} else {String::new()}).to_string(); }
    output = raw_re.replace_all(&output, |caps:&Captures| scalar(resolve(context,&caps[1])).unwrap_or_default()).to_string();
    interpolation_re.replace_all(&output, |caps:&Captures| { let value=scalar(resolve(context,&caps[1])).or_else(||caps.get(2).map(|m|m.as_str().to_string())).unwrap_or_default(); escape_html(&value)}).to_string()
}
fn resolve<'a>(context:&'a JsonMap,path:&str)->Option<&'a Value>{ if path.is_empty(){return None;} let mut parts=path.split('.'); let first=parts.next()?; let mut value=context.get(first)?; for part in parts{value=value.as_object()?.get(part)?;} Some(value)}
fn scalar(value:Option<&Value>)->Option<String>{match value?{Value::Null=>None,Value::String(v)=>Some(v.clone()),Value::Bool(v)=>Some(if *v{"1"}else{""}.into()),Value::Number(v)=>Some(v.to_string()),_=>None}}
fn truthy(value:Option<&Value>)->bool{match value{None|Some(Value::Null)=>false,Some(Value::Bool(v))=>*v,Some(Value::String(v))=>!v.is_empty(),Some(Value::Array(v))=>!v.is_empty(),Some(Value::Number(v))=>v.as_f64().unwrap_or(0.0)!=0.0,Some(Value::Object(v))=>!v.is_empty()}}
fn escape_html(value:&str)->String{value.replace('&',"&amp;").replace('<',"&lt;").replace('>',"&gt;").replace('"',"&quot;").replace('\'',"&#039;")}
