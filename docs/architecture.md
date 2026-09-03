# Architecture

The repository has four canonical concerns only:

- `editor/` — the React authoring application and its engine-neutral host adapter API.
- `specification/` — JSON Schemas, rendering semantics, version policy, protocol, and shared conformance fixtures.
- `blocks/` — portable block packages made of `block.json`, `template.html`, and optional CSS/JS assets.
- `engine/` — independent renderer implementations. Official engines are currently `engine/laravel/` and `engine/go/`.

There is intentionally no top-level runtime, core, or renderer implementation. Engines consume the specification; they do not own it. Page JSON and block packages must not contain Laravel classes, Go implementation details, or another framework-specific persisted field.

## Data flow

1. The editor loads portable block definitions through an `EditorHostAdapter`.
2. The editor persists canonical Page JSON version 1.
3. A host sends that JSON and runtime context to an engine.
4. The engine loads the same portable block packages, resolves optional datasources through a host adapter, and returns HTML, assets, and structured diagnostics.
5. Conformance fixtures in `specification/conformance/` are the semantic oracle shared by every engine.

A third engine is conformant when it accepts the canonical schemas, follows `rendering-spec.md`, and passes the shared corpus without requiring a Page JSON migration.
