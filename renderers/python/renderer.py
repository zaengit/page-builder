from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Protocol

RAW = re.compile(r"\{\{\{\s*([A-Za-z0-9_.]+)\s*\}\}\}")
INTERPOLATION = re.compile(r"\{\{\s*([A-Za-z0-9_.]+)(?:\s*\?\?\s*[\"']([^\"']*)[\"'])?\s*\}\}")
CONDITION = re.compile(r"\{%\s*if\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endif\s*%\}", re.S)
LOOP = re.compile(r"\{%\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endfor\s*%\}", re.S)
BLOCK_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9-]*$")
TEMPLATE_FILE = re.compile(r"^[A-Za-z0-9._-]+\.html$")

def resolve(context: Mapping[str, Any], path: str) -> Any:
    if not path: return context
    value: Any = context
    for part in path.split('.'):
        if not isinstance(value, Mapping) or part not in value: return None
        value = value[part]
    return value

def render_template(template: str, context: Mapping[str, Any]) -> str:
    output = template
    while LOOP.search(output):
        def loop_replace(match: re.Match[str]) -> str:
            items = resolve(context, match.group(2))
            if not isinstance(items, list): return ''
            return ''.join(render_template(match.group(3), {**context, match.group(1): item, 'loop': {'index': i, 'number': i + 1, 'first': i == 0, 'last': i == len(items) - 1, 'count': len(items)}}) for i, item in enumerate(items))
        output = LOOP.sub(loop_replace, output)
    while CONDITION.search(output):
        output = CONDITION.sub(lambda m: render_template(m.group(2), context) if bool(resolve(context, m.group(1))) else '', output)
    output = RAW.sub(lambda m: '' if resolve(context, m.group(1)) is None else str(resolve(context, m.group(1))), output)
    return INTERPOLATION.sub(lambda m: html.escape(str(resolve(context, m.group(1)) if resolve(context, m.group(1)) is not None else (m.group(2) or '')), quote=True), output)

def load_registry(root: str | Path) -> dict[str, dict[str, Any]]:
    registry: dict[str, dict[str, Any]] = {}
    root_path = Path(root).resolve()
    if not root_path.is_dir(): return registry
    for directory in sorted(path for path in root_path.iterdir() if path.is_dir()):
        manifest_path = directory / 'block.json'
        if not manifest_path.is_file(): continue
        manifest = json.loads(manifest_path.read_text()); manifest.setdefault('version', 1)
        name = str(manifest.get('name', ''))
        if not BLOCK_NAME.fullmatch(name): raise ValueError(f'Invalid block name in {manifest_path}')
        if name in registry: raise ValueError(f'Duplicate block {name}')
        template_file = str(manifest.get('template', 'template.html'))
        if not TEMPLATE_FILE.fullmatch(template_file): raise ValueError(f'Invalid portable template for {name}')
        template_path = (directory / template_file).resolve()
        if directory.resolve() not in template_path.parents or not template_path.is_file(): raise ValueError(f'Missing portable template for {name}')
        registry[name] = {**manifest, 'template': template_path.read_text(), '_directory': str(directory.resolve())}
    return registry

def resolve_context_bindings(attrs: Mapping[str, Any], bindings: Any, context: Mapping[str, Any]) -> dict[str, Any]:
    result = dict(attrs)
    if not isinstance(bindings, Mapping): return result
    for attribute, binding in bindings.items():
        if not isinstance(attribute, str) or not isinstance(binding, Mapping) or binding.get('source') != 'context': continue
        value = resolve(context, str(binding.get('path', '')))
        if value is None and 'fallback' in binding: value = binding['fallback']
        if value is not None: result[attribute] = value
    return result

def wrap_block(block: Mapping[str, Any], rendered: str) -> str:
    block_id = html.escape(str(block.get('id', '')), quote=True)
    compiled = block.get('_render')
    if not isinstance(compiled, Mapping): return f'<div data-pb-id="{block_id}">{rendered}</div>'
    slot = '' if compiled.get('slot') is None else f' data-pb-slot="{html.escape(str(compiled.get("slot")), quote=True)}"'
    scheme_id = str(compiled.get('colorSchemeId') or '')
    scheme = '' if not scheme_id else f' class="pb-color-scheme--{html.escape(scheme_id, quote=True)}" data-pb-color-scheme="{html.escape(scheme_id, quote=True)}"'
    style = html.escape(str(compiled.get('style') or ''), quote=True)
    css = str(compiled.get('css') or '').replace('</style', '')
    responsive = '' if not css else f'<style data-pb-responsive="{block_id}">{css}</style>'
    return f'<div data-pb-style-id="{block_id}" data-pb-id="{block_id}"{scheme}{slot} style="{style}">{rendered}</div>{responsive}'

def wrap_page(page: Mapping[str, Any], body: str) -> str:
    compiled = page.get('_pageRender')
    if not isinstance(compiled, Mapping): return f'<div class="pb-page">{body}</div>'
    class_name = html.escape(str(compiled.get('class') or 'pb-page'), quote=True)
    style = html.escape(str(compiled.get('style') or ''), quote=True)
    scheme_css = str(compiled.get('colorSchemeCss') or '').replace('</style', '')
    typography_css = str(compiled.get('typographyCss') or '').replace('</style', '')
    custom_css = str(compiled.get('customCss') or '').replace('</style', '').replace('<script', '')
    return (
        f'<div class="{class_name}" style="{style}">{body}</div>'
        + (f'<style data-pb-color-schemes>{scheme_css}</style>' if scheme_css else '')
        + (f'<style data-pb-typography>{typography_css}</style>' if typography_css else '')
        + (f'<style data-pb-page-css>{custom_css}</style>' if custom_css else '')
    )

@dataclass(slots=True)
class RenderRequest:
    page: Mapping[str, Any]
    registry: Mapping[str, Mapping[str, Any]]
    context: Mapping[str, Any]

@dataclass(slots=True)
class RenderResult:
    html: str
    assets: dict[str, list[str]] = field(default_factory=lambda: {'css': [], 'js': []})
    diagnostics: list[str] = field(default_factory=list)

class DataProvider(Protocol):
    def resolve(self, request: Mapping[str, Any], context: Mapping[str, Any]) -> Any: ...
class Renderer(Protocol):
    def render(self, request: RenderRequest) -> RenderResult: ...

class UniversalRenderer:
    def render(self, request: RenderRequest) -> RenderResult:
        assets = {'css': [], 'js': []}; seen = {'css': set(), 'js': set()}; diagnostics: list[str] = []
        def render_block(block: Mapping[str, Any]) -> str:
            block_type = str(block.get('type', '')); definition = request.registry.get(block_type)
            if definition is None: diagnostics.append(f'unknown_block:{block_type}'); return ''
            for kind in ('css', 'js'):
                for asset in definition.get('assets', {}).get(kind, []):
                    if asset not in seen[kind]: seen[kind].add(asset); assets[kind].append(asset)
            attrs: dict[str, Any] = {}
            for key, schema in definition.get('attributes', {}).items():
                if isinstance(schema, Mapping) and 'default' in schema: attrs[key] = schema['default']
            attrs.update(block.get('attrs', {})); attrs = resolve_context_bindings(attrs, block.get('bindings'), request.context)
            children = ''.join(render_block(child) for child in block.get('children', []))
            rendered = render_template(str(definition.get('template', '')), {'attrs': attrs, 'context': request.context, 'children': children, 'blockId': block.get('id', ''), 'slot': block.get('slot'), 'preview': False})
            return wrap_block(block, rendered)
        body = ''.join(render_block(block) for block in request.page.get('blocks', []))
        return RenderResult(html=wrap_page(request.page, body), assets=assets, diagnostics=diagnostics)
