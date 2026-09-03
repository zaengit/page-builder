# Universal Editor + Engine Distribution Plan

> Status: implemented for the current support matrix: Laravel + Go.
>
> Canonical architecture rule: `editor/`, `specification/`, `blocks/`, and `engine/` are separate top-level concerns. The universal contracts never belong to Laravel or Go. Official engine implementations live only under `engine/`.

## 1. Final Target Architecture

```text
editor/
  React visual editor

specification/
  page.schema.json
  block.schema.json
  datasource.schema.json
  renderer-protocol.schema.json
  rendering-spec.md
  conformance/

blocks/
  <block>/
    block.json
    template.html
    style.css        # optional
    frontend.js      # optional

engine/
  laravel/
    src/
      LaravelRenderingEngine.php
  go/
    go.mod
    registry.go
    renderer.go
    cmd/
      page-builder-render/
        main.go
```

The persisted page document, block manifest, portable template grammar, datasource contract, renderer protocol, conformance fixtures, CSS, and browser JavaScript MUST NOT depend on Laravel, Eloquent, Blade, Go, or another host framework.

## 2. Canonical Ownership Boundaries

- [x] `editor/` owns React authoring UX only.
- [x] `specification/` owns universal schemas, template semantics, renderer protocol, and conformance fixtures.
- [x] `blocks/` owns portable block packages.
- [x] `engine/laravel/` owns the Laravel rendering adapter.
- [x] `engine/go/` owns the standalone Go rendering engine.
- [x] `src/` contains Laravel package integration/shared host services but is not the universal specification owner.
- [x] `renderers/` is not a canonical engine distribution boundary.
- [x] Legacy/experimental renderer trees are excluded from Composer distribution.
- [x] There is only one canonical Go implementation: `engine/go`.
- [x] There is only one canonical Laravel engine class: `engine/laravel/src/LaravelRenderingEngine.php`.

## 3. Universal Block Contract

Canonical portable block package:

```text
blocks/hero/
  block.json
  template.html
  style.css
  frontend.js
```

Requirements:

- [x] `block.json` is the canonical block definition.
- [x] Block identity and version are JSON-defined.
- [x] Attributes are JSON-compatible.
- [x] Inspector controls are declarative.
- [x] Variations/presets are declarative.
- [x] Nested children are represented by Page JSON.
- [x] Named slots are represented by portable metadata.
- [x] Flex/grid metadata is framework neutral.
- [x] Responsive values are framework neutral.
- [x] Spacing, border, radius, effects, color scheme, and typography metadata are framework neutral.
- [x] `template.html` is the canonical template format.
- [x] Interpolation semantics are universal.
- [x] Escaping semantics are universal.
- [x] Fallback expressions are universal.
- [x] Conditions are universal.
- [x] Loops are universal.
- [x] Raw children insertion is universal.
- [x] CSS assets are portable.
- [x] Frontend JavaScript assets are portable.
- [x] Blade templates are Laravel compatibility templates only.
- [x] Ordinary portable blocks can be added without changing Laravel engine source.
- [x] Ordinary portable blocks can be added without recompiling Go only to register the block.
- [x] Both engines dynamically load the same portable block contract.

## 4. Universal Page Document

- [x] Page JSON has an explicit version.
- [x] Blocks are neutral JSON objects.
- [x] Block IDs/types/versions are neutral values.
- [x] Attributes are JSON-compatible.
- [x] Nested children are JSON-compatible.
- [x] Slots are JSON-compatible.
- [x] Bindings are JSON-compatible.
- [x] Layout metadata is JSON-compatible.
- [x] Responsive metadata is JSON-compatible.
- [x] Page tokens are JSON-compatible.
- [x] Color schemes are JSON-compatible.
- [x] Typography is JSON-compatible.
- [x] Custom CSS is JSON-compatible.
- [x] No Laravel service/container reference is persisted.
- [x] No Eloquent class name is required by the canonical document.
- [x] No Go-specific type is persisted.
- [x] Switching Laravel ↔ Go does not rewrite or migrate Page JSON.

## 5. Universal Datasource Contract

Canonical resources use stable names such as:

```text
products
posts
projects
categories
users
```

- [x] Resource identifiers are framework neutral.
- [x] Attribute bindings support nested paths such as `product.name`.
- [x] Fallback values are portable.
- [x] Collection/repeater values are portable.
- [x] Query metadata is neutral JSON.
- [x] Filter metadata is neutral JSON.
- [x] Ordering metadata is neutral JSON.
- [x] Limit metadata is neutral JSON.
- [x] Relation metadata is neutral JSON.
- [x] Pagination metadata is neutral JSON.
- [x] Current-record/runtime context is portable.
- [x] Laravel maps neutral resources to Eloquent only inside Laravel host integration.
- [x] Go can receive pre-resolved context or use a host-defined datasource adapter.
- [x] Database implementation details never change the universal Page JSON contract.

## 6. Renderer Protocol

Input:

```json
{
  "version": 1,
  "page": {},
  "context": {},
  "blockRoot": "/absolute/path/to/blocks"
}
```

Output:

```json
{
  "html": "<div class=\"pb-page\"></div>",
  "assets": {
    "css": [],
    "js": []
  },
  "diagnostics": []
}
```

- [x] Protocol version is explicit.
- [x] Request is JSON serializable.
- [x] Result is JSON serializable.
- [x] HTML and asset metadata are separate.
- [x] Diagnostics are portable.
- [x] Unknown protocol versions are rejected.
- [x] Laravel process execution bypasses shell interpolation.
- [x] External engine timeout is configurable.
- [x] Invalid process output is rejected.
- [x] stderr is captured for failures/diagnostics.
- [x] Go CLI implements the same protocol from `engine/go/cmd/page-builder-render`.

## 7. Laravel Engine

Canonical source:

```text
engine/laravel/src/LaravelRenderingEngine.php
```

- [x] Laravel is the default official engine.
- [x] Canonical engine name is `laravel`.
- [x] Legacy `php` selection remains a compatibility alias only.
- [x] Laravel engine implements the shared `RenderingEngine` result contract.
- [x] Laravel renders canonical Page JSON.
- [x] Laravel consumes portable blocks.
- [x] Laravel supports portable layout/style envelopes.
- [x] Laravel supports global tokens/color schemes/typography/custom CSS.
- [x] Laravel can resolve Eloquent-backed datasource bindings before external rendering.
- [x] Laravel can dispatch rendering to Go through the universal process protocol.
- [x] Blade remains a compatibility behavior rather than the portable specification.
- [x] The old `src/Rendering/PhpRenderingEngine.php` implementation is removed to avoid duplicate engine ownership.

## 8. Go Engine

Canonical source:

```text
engine/go/
```

- [x] Go engine is a standalone Go module.
- [x] Module path is `github.com/zaengit/page-builder/engine/go`.
- [x] Go engine dynamically loads portable block manifests.
- [x] Go engine loads `template.html` dynamically.
- [x] Go engine renders nested blocks.
- [x] Go engine supports interpolation.
- [x] Go engine HTML-escapes portable interpolations.
- [x] Go engine supports fallback values.
- [x] Go engine supports conditions.
- [x] Go engine supports loops.
- [x] Go engine supports portable context bindings.
- [x] Go engine collects CSS/JS assets.
- [x] Go engine de-duplicates assets.
- [x] Go engine consumes transient layout/style envelopes.
- [x] Go engine consumes page-level style metadata.
- [x] Go engine participates in shared conformance tests.
- [x] Go engine has registry/block-loading tests.
- [x] Go engine compiles as a standalone binary.
- [x] Legacy `renderers/go` source is removed so there is no duplicate supported Go implementation.

## 9. React Editor

- [x] Editor remains in `editor/`.
- [x] Editor is independent from Laravel rendering internals.
- [x] Editor persists canonical Page JSON.
- [x] Editor consumes block/schema metadata.
- [x] Editor can preview through Laravel.
- [x] Editor can preview through Go using the Laravel process adapter.
- [x] Switching engine does not change editor document shape.
- [x] Datasource metadata remains neutral.
- [x] Flex/grid metadata remains neutral.
- [x] Responsive metadata remains neutral.
- [x] Global color schemes remain neutral.
- [x] Global typography remains neutral.

## 10. Active Support Matrix

| Capability | Laravel | Go |
| --- | --- | --- |
| Canonical Page JSON | ✅ | ✅ |
| Portable `block.json` | ✅ | ✅ |
| Portable `template.html` | ✅ | ✅ |
| Dynamic block discovery | ✅ | ✅ |
| Nested blocks | ✅ | ✅ |
| Conditions / loops | ✅ | ✅ |
| Context binding | ✅ | ✅ |
| Portable CSS/JS assets | ✅ | ✅ |
| Layout/style envelopes | ✅ | ✅ |
| Responsive metadata | ✅ | ✅ |
| Page tokens / schemes / typography | ✅ | ✅ |
| Host database integration | Eloquent adapter | Host-defined or pre-resolved context |
| Shared conformance coverage | ✅ | ✅ |
| Officially distributed | ✅ | ✅ |
| Canonical source under `engine/` | ✅ | ✅ |

## 11. Engines Outside Current Scope

Rust, Node.js, Python, and Bun are not current supported engines.

- [x] They are absent from active engine config.
- [x] They are absent from active CI engine jobs.
- [x] They are absent from active build artifacts.
- [x] They are excluded from Composer distribution.
- [x] They are not listed as supported in the active matrix.

Future engines MUST consume the same `specification/`, Page JSON, portable block contract, and conformance fixtures without redefining them.

## 12. Build Pipeline

Canonical build command:

```bash
bash scripts/build-universal-renderers.sh
```

Canonical output:

```text
dist/engine/page-builder-engine-go
```

- [x] Build source is `engine/go`.
- [x] Build no longer depends on `renderers/go`.
- [x] Only the supported external Go engine is built.
- [x] The generated Go engine binary has no Laravel/PHP runtime dependency.
- [x] Runtime block root is provided at execution time.

## 13. CI Gates

- [x] Composer metadata validation.
- [x] Composer dependency audit.
- [x] Laravel/PHP static analysis.
- [x] Laravel/PHP formatting including `engine/laravel/src`.
- [x] Laravel engine PHPUnit suite.
- [x] Go unit/conformance tests from `engine/go`.
- [x] Go standalone engine build.
- [x] Go protocol smoke test.
- [x] React editor dependency lock install.
- [x] React editor unit tests with coverage.
- [x] React editor production build.
- [x] React editor Playwright E2E.
- [x] Composer archive build.
- [x] Composer archive includes `engine/laravel`.
- [x] Composer archive includes `engine/go` source.
- [x] Composer archive includes universal specifications.
- [x] Composer archive includes portable blocks.
- [x] Composer archive excludes editor development source.
- [x] Composer archive excludes tests/CI harness.
- [x] Composer archive excludes legacy `renderers/` experiments.

## 14. Packaging

### Laravel/Composer distribution

Contains:

- [x] Laravel package integration.
- [x] `engine/laravel` canonical adapter.
- [x] `engine/go` reproducible standalone engine source.
- [x] Compiled React editor assets.
- [x] Portable blocks.
- [x] Universal specifications.
- [x] Universal engine documentation.

### Go binary distribution

Contains:

- [x] `page-builder-engine-go` standalone binary.
- [x] No Laravel dependency.
- [x] No PHP dependency.
- [x] Runtime block root supplied through protocol input.

### Portable block distribution

```text
block.json
template.html
style.css      # optional
frontend.js    # optional
```

- [x] No Laravel dependency is required by the block contract.
- [x] No Go dependency is required by the block contract.
- [x] No engine source modification is required for ordinary block additions.

## 15. Release Workflow

- [x] Release verifies Laravel engine.
- [x] Release verifies Go engine from `engine/go`.
- [x] Release builds `dist/engine/page-builder-engine-go`.
- [x] Release verifies Composer archive includes both canonical engines.
- [x] Release verifies Composer archive excludes `renderers/`.
- [x] Release publishes the Composer ZIP.
- [x] Release publishes the standalone Go engine binary.

## 16. Versioning Rules

- [x] Page document has an explicit version.
- [x] Renderer protocol has an explicit version.
- [x] Block manifests have explicit versions.
- [x] Schemas are committed/distributable.
- [x] Breaking template grammar changes require specification versioning.
- [x] Breaking process protocol changes require protocol versioning.
- [x] Engines reject unsupported major protocol versions.
- [x] One engine cannot introduce private persisted fields that become required by the editor or another engine.

## 17. Definition of Done

The current Laravel + Go universal architecture is done only when all statements below remain true:

- [x] `editor/` is React and renderer independent.
- [x] `specification/` is the universal contract source of truth.
- [x] `blocks/` contains portable engine-neutral block packages.
- [x] `engine/` physically exists as the canonical engine root.
- [x] `engine/laravel/` physically contains the Laravel engine adapter.
- [x] `engine/go/` physically contains the standalone Go engine source.
- [x] Laravel does not own the universal document specification.
- [x] Go consumes the same document/block specification.
- [x] There is no duplicate supported Go implementation under `renderers/go`.
- [x] There is no duplicate legacy PHP rendering engine class under `src/Rendering`.
- [x] Switching Laravel ↔ Go does not migrate Page JSON.
- [x] Adding portable blocks does not require modifying either engine for registration.
- [x] CI tests the canonical engine directories.
- [x] Release builds artifacts from the canonical engine directories.
- [x] Composer distribution contains canonical engines and excludes legacy renderer experiments.

## 18. Future Engine Extension Rule

To add Rust, Python, Node.js, Bun, or another engine later:

1. Create `engine/<name>/`.
2. Implement `specification/renderer-protocol.schema.json`.
3. Consume the canonical page and block schemas unchanged.
4. Dynamically load portable blocks from the supplied block root.
5. Implement the portable template semantics.
6. Pass shared conformance fixtures unchanged.
7. Add language-specific tests/builds.
8. Add the engine to CI only after conformance passes.
9. Add release artifacts.
10. Add it to the official support matrix only after distribution is complete.

A future engine is never allowed to redefine the editor document model or portable block format.
