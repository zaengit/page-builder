# Universal Editor + Engine Distribution Plan

> Status: implementation target completed for the currently supported engines: Laravel and Go.
>
> Scope rule: the editor and portable block specification are universal. Laravel and Go are the only officially supported rendering engines in the current distribution. Rust, Node.js, Bun, and Python are future adapters and are not part of the active support matrix.

## 1. Target Architecture

```text
editor/
  React editor

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

engines /
  Laravel adapter
  Go runtime
```

The persisted page document, block definition, template grammar, datasource contract, rendering protocol, and conformance fixtures MUST NOT depend on Laravel, Eloquent, Blade, Go, or any other host framework.

## 2. Distribution Boundaries

- [x] React editor is separated from server rendering runtime.
- [x] Persisted page JSON is language agnostic.
- [x] Portable block contract lives outside the Laravel implementation.
- [x] Portable template is `template.html`.
- [x] `block.json` is the canonical block definition shared by every engine.
- [x] CSS and frontend JavaScript assets are engine-independent.
- [x] Renderer process protocol is defined as JSON input/output.
- [x] Shared JSON Schemas live in `specification/`.
- [x] Shared conformance fixtures live in `specification/conformance/`.
- [x] Laravel-specific database resolution happens before external rendering.
- [x] Go renderer consumes the same page/block contracts as Laravel.
- [x] Unsupported engines are removed from the active configuration and CI support matrix.

## 3. Universal Block Contract

Canonical block layout:

```text
blocks/hero/
  block.json
  template.html
  style.css
  frontend.js
```

### Requirements

- [x] Block identity is defined in `block.json`.
- [x] Block attributes are declared in JSON and remain serializable.
- [x] Inspector settings are declarative and not tied to PHP classes.
- [x] Variations/presets are declarative.
- [x] Nested children are represented by portable page JSON.
- [x] Template interpolation is runtime-neutral.
- [x] Conditions are runtime-neutral.
- [x] Loops are runtime-neutral.
- [x] Fallback values are runtime-neutral.
- [x] HTML escaping semantics are part of the portable rendering contract.
- [x] Block CSS is portable.
- [x] Block frontend JavaScript is portable.
- [x] Global color-scheme metadata remains portable.
- [x] Typography metadata remains portable.
- [x] Spacing, border, effects, responsive, flex, and grid metadata remain persisted as neutral JSON.

### Compatibility

- [x] `template.html` is the canonical universal template.
- [x] Blade templates are Laravel compatibility templates only and are not part of the universal specification.
- [x] A block can be distributed without requiring Go source changes or recompilation when it only uses the portable block contract.
- [x] A newly added portable block can be loaded dynamically from the configured block root.

## 4. Universal Page Document

- [x] Page document has an explicit version.
- [x] Blocks are stored as neutral objects.
- [x] Block attributes are JSON-compatible.
- [x] Nested children are JSON-compatible.
- [x] Dynamic binding metadata is JSON-compatible.
- [x] Layout metadata is JSON-compatible.
- [x] Responsive metadata is JSON-compatible.
- [x] Global tokens are JSON-compatible.
- [x] Color schemes are JSON-compatible.
- [x] Typography is JSON-compatible.
- [x] Custom CSS is JSON-compatible.
- [x] No Eloquent model class names are required in canonical page JSON.
- [x] No Laravel service/container references are stored in canonical page JSON.
- [x] No Go-specific types are stored in canonical page JSON.

## 5. Universal Datasource Contract

Canonical resources use stable names such as:

```text
products
posts
projects
categories
users
```

- [x] Resource identifiers are framework-neutral.
- [x] Nested paths such as `product.name` are supported by the binding contract.
- [x] Fallback values are supported.
- [x] Collection/repeater data can be represented without framework-specific classes.
- [x] Query metadata is represented as neutral JSON.
- [x] Relations are represented as neutral resource/path metadata.
- [x] Pagination metadata is portable.
- [x] Current-record context can be passed through renderer context.
- [x] Laravel owns Eloquent mapping only inside the Laravel adapter.
- [x] Go can receive already-resolved context or implement a host-specific datasource adapter independently.

## 6. Renderer Protocol

Input contract:

```json
{
  "version": 1,
  "page": {},
  "context": {},
  "blockRoot": "/absolute/path/to/blocks"
}
```

Output contract:

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

- [x] Protocol has an explicit version.
- [x] Requests are JSON serializable.
- [x] Results are JSON serializable.
- [x] HTML is returned separately from asset metadata.
- [x] Diagnostics are portable.
- [x] External engine execution bypasses the shell.
- [x] External engine timeout is configurable.
- [x] Invalid process output is rejected.
- [x] stderr is captured for diagnostics/failure reporting.

## 7. Laravel Engine

Current official engine name: `laravel`.

- [x] Laravel remains an official rendering engine.
- [x] Laravel engine can render canonical page JSON.
- [x] Laravel engine consumes portable blocks.
- [x] Laravel can resolve host-owned Eloquent datasource bindings before rendering.
- [x] Laravel can invoke Go using the renderer protocol.
- [x] Blade remains optional compatibility behavior rather than the universal block format.
- [x] Default engine configuration uses `laravel`.
- [x] Legacy `php` selection remains accepted internally for backward compatibility but is not advertised as a separate supported engine.

## 8. Go Engine

- [x] Go renderer is a standalone module under `renderers/go`.
- [x] Go renderer dynamically loads block metadata from the block root.
- [x] Go renderer uses `template.html`.
- [x] Go renderer supports nested blocks.
- [x] Go renderer supports interpolation and escaping.
- [x] Go renderer supports fallback values.
- [x] Go renderer supports conditions.
- [x] Go renderer supports loops.
- [x] Go renderer consumes portable context bindings.
- [x] Go renderer returns CSS/JS assets.
- [x] Go renderer de-duplicates assets.
- [x] Go renderer participates in conformance tests.
- [x] Go renderer can be compiled as a standalone binary.
- [x] The build pipeline creates `page-builder-render-go`.

## 9. React Editor

- [x] Editor remains in `editor/`.
- [x] Editor consumes block/schema metadata rather than Laravel rendering internals.
- [x] Editor page state is stored as canonical portable JSON.
- [x] Editor preview can use the Laravel engine.
- [x] Editor preview can use the Go engine through the Laravel host process adapter.
- [x] Editor does not need to change persisted page shape when renderer engine changes.
- [x] Dynamic datasource metadata remains engine-neutral.
- [x] Flex/grid layout metadata remains engine-neutral.
- [x] Responsive metadata remains engine-neutral.
- [x] Global color schemes and typography remain engine-neutral.

## 10. Active Engine Support Matrix

| Capability | Laravel | Go |
| --- | --- | --- |
| Canonical page JSON | ✅ | ✅ |
| Portable `block.json` | ✅ | ✅ |
| Portable `template.html` | ✅ | ✅ |
| Nested blocks | ✅ | ✅ |
| Conditions / loops | ✅ | ✅ |
| Context binding | ✅ | ✅ |
| Portable CSS/JS assets | ✅ | ✅ |
| Layout/style envelopes | ✅ | ✅ |
| Responsive metadata | ✅ | ✅ |
| Page tokens / schemes / typography | ✅ | ✅ |
| Host database integration | ✅ Eloquent adapter | ✅ host-defined / pre-resolved context |
| Conformance coverage | ✅ | ✅ |
| Officially distributed | ✅ | ✅ |

## 11. Engines Explicitly Out of Current Scope

The following are not current supported engines:

- [x] Rust excluded from active config, build, CI, and support matrix.
- [x] Node.js excluded from active config, build, CI, and support matrix.
- [x] Python excluded from active config, build, CI, and support matrix.
- [x] Bun is reserved as a possible future engine and has no active runtime contract implementation requirement.

Their future implementations MUST consume the same `specification/` and conformance fixtures. No canonical page/block format changes may be introduced only to accommodate one language.

## 12. Build and CI

- [x] PHP/Laravel tests remain mandatory.
- [x] Go tests remain mandatory.
- [x] Editor tests remain mandatory.
- [x] Editor build remains mandatory.
- [x] Go standalone binary build remains mandatory.
- [x] Go artifact smoke test remains mandatory.
- [x] Composer archive validation includes shared specification files.
- [x] Composer archive validation includes Go runtime source.
- [x] CI no longer requires Rust, Node, or Python renderer jobs.

## 13. Packaging

### Laravel package distribution

Contains:

- [x] Laravel adapter/runtime integration.
- [x] React editor compiled assets.
- [x] Portable blocks.
- [x] Universal specifications.
- [x] Go renderer source for reproducible build/integration.
- [x] Universal renderer documentation.

### Go binary distribution

Contains:

- [x] Standalone `page-builder-render-go` binary.
- [x] No Laravel dependency.
- [x] No PHP runtime dependency.
- [x] Runtime block root supplied at execution time.

### Portable block distribution

A portable block package contains only:

```text
block.json
template.html
style.css      # optional
frontend.js    # optional
```

- [x] No Laravel dependency required by the block contract.
- [x] No Go dependency required by the block contract.
- [x] No engine rebuild required for ordinary portable block additions.

## 14. Versioning Rules

- [x] Page document includes a version.
- [x] Renderer protocol includes a version.
- [x] Schemas are committed and distributable.
- [x] Backward-incompatible template grammar changes require a specification version change.
- [x] Backward-incompatible renderer protocol changes require a protocol version change.
- [x] Engines must reject unsupported major protocol versions instead of silently mis-rendering.

## 15. Release Acceptance Checklist

A release is accepted only when all of the following pass:

- [x] Laravel backend tests.
- [x] PHP static analysis.
- [x] PHP formatting checks.
- [x] Go unit/conformance tests.
- [x] Go standalone binary build.
- [x] Go binary protocol smoke test.
- [x] React editor unit tests.
- [x] React editor production build.
- [x] React editor browser E2E tests.
- [x] Composer archive build.
- [x] Composer archive contains portable specifications.
- [x] Composer archive contains portable blocks.
- [x] Composer archive contains Go renderer source.
- [x] Active runtime documentation names only Laravel and Go as officially supported engines.

## 16. Definition of Done

The universal architecture is considered complete for the current release when:

- [x] `editor/` is React and remains renderer-independent.
- [x] `specification/` is the source of truth for portable contracts.
- [x] `blocks/` uses portable `block.json` + `template.html` as the canonical engine-neutral format.
- [x] Laravel is an adapter/engine, not the owner of the universal document format.
- [x] Go is a standalone engine consuming the same contracts.
- [x] Switching Laravel ↔ Go does not migrate or rewrite persisted page JSON.
- [x] Adding a portable block does not require modifying Laravel engine source.
- [x] Adding a portable block does not require recompiling Go solely to register that block.
- [x] CI verifies both official engines and the React editor.
- [x] Distribution documentation and configuration expose only the supported Laravel + Go engine set.

## 17. Future Engine Extension Rule

To add Rust, Python, Node.js, Bun, or another engine later:

1. Implement `specification/renderer-protocol.schema.json`.
2. Consume the canonical page schema and block schema without extensions tied to that language.
3. Dynamically load blocks from the supplied block root.
4. Pass the shared conformance fixtures unchanged.
5. Add engine-specific CI only after conformance passes.
6. Add it to the official support matrix only after release artifacts and documentation are complete.

No future engine is allowed to redefine the editor document model or portable block format.
