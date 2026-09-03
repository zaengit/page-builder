from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol


@dataclass(slots=True)
class RenderRequest:
    page: Mapping[str, Any]
    registry: Mapping[str, Mapping[str, Any]]
    context: Mapping[str, Any]


@dataclass(slots=True)
class RenderResult:
    html: str
    css: list[str] = field(default_factory=list)
    js: list[str] = field(default_factory=list)
    diagnostics: list[str] = field(default_factory=list)


class DataProvider(Protocol):
    def resolve(self, request: Mapping[str, Any], context: Mapping[str, Any]) -> Any: ...


class Renderer(Protocol):
    def render(self, request: RenderRequest) -> RenderResult: ...
