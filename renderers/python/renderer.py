from __future__ import annotations

import html
import re
from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol

RAW = re.compile(r"\{\{\{\s*([A-Za-z0-9_.]+)\s*\}\}\}")
INTERPOLATION = re.compile(r"\{\{\s*([A-Za-z0-9_.]+)(?:\s*\?\?\s*[\"']([^\"']*)[\"'])?\s*\}\}")
CONDITION = re.compile(r"\{%\s*if\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endif\s*%\}", re.S)
LOOP = re.compile(r"\{%\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([A-Za-z0-9_.]+)\s*%\}(.*?)\{%\s*endfor\s*%\}", re.S)


def resolve(context: Mapping[str, Any], path: str) -> Any:
    value: Any = context
    for part in path.split('.'):
        if not isinstance(value, Mapping) or part not in value:
            return None
        value = value[part]
    return value


def render_template(template: str, context: Mapping[str, Any]) -> str:
    output = template
    while LOOP.search(output):
        def loop_replace(match: re.Match[str]) -> str:
            items = resolve(context, match.group(2))
            if not isinstance(items, list):
                return ''
            rendered: list[str] = []
            for index, item in enumerate(items):
                local = dict(context)
                local[match.group(1)] = item
                local['loop'] = {'index': index, 'number': index + 1, 'first': index == 0, 'last': index == len(items) - 1, 'count': len(items)}
                rendered.append(render_template(match.group(3), local))
            return ''.join(rendered)
        output = LOOP.sub(loop_replace, output)
    while CONDITION.search(output):
        output = CONDITION.sub(lambda m: render_template(m.group(2), context) if bool(resolve(context, m.group(1))) else '', output)
    output = RAW.sub(lambda m: '' if resolve(context, m.group(1)) is None else str(resolve(context, m.group(1))), output)
    return INTERPOLATION.sub(lambda m: html.escape(str(resolve(context, m.group(1)) if resolve(context, m.group(1)) is not None else (m.group(2) or '')), quote=True), output)


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
        assets = {'css': [], 'js': []}
        seen = {'css': set(), 'js': set()}
        diagnostics: list[str] = []

        def render_block(block: Mapping[str, Any]) -> str:
            block_type = str(block.get('type', ''))
            definition = request.registry.get(block_type)
            if definition is None:
                diagnostics.append(f'unknown_block:{block_type}')
                return ''
            for kind in ('css', 'js'):
                for asset in definition.get('assets', {}).get(kind, []):
                    if asset not in seen[kind]:
                        seen[kind].add(asset)
                        assets[kind].append(asset)
            attrs: dict[str, Any] = {}
            for key, schema in definition.get('attributes', {}).items():
                if isinstance(schema, Mapping) and 'default' in schema:
                    attrs[key] = schema['default']
            attrs.update(block.get('attrs', {}))
            children = ''.join(render_block(child) for child in block.get('children', []))
            rendered = render_template(str(definition.get('template', '')), {
                'attrs': attrs,
                'context': request.context,
                'children': children,
                'blockId': block.get('id', ''),
                'slot': block.get('slot'),
                'preview': False,
            })
            block_id = html.escape(str(block.get('id', '')), quote=True)
            return f'<div data-pb-id="{block_id}">{rendered}</div>'

        body = ''.join(render_block(block) for block in request.page.get('blocks', []))
        return RenderResult(html=f'<div class="pb-page">{body}</div>', assets=assets, diagnostics=diagnostics)
