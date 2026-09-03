# Universal Editor + Engine Distribution Plan

> **Status: COMPLETE — READY FOR DISTRIBUTION**
>
> This document is the implementation checklist. Every item below is implemented and is covered by repository validation, engine tests, shared conformance, packaging checks, or release tooling.
>
> Canonical architecture is fixed. Do not add a separate top-level `core/`, `runtime/`, or `renderers/` architecture layer.

## 1. Canonical Architecture

```text
editor/
  React visual editor

specification/
  page.schema.json
  block.schema.json
  datasource.schema.json
  renderer-protocol.schema.json
  rendering-spec.md
  compatibility-policy.md
  version.json
  conformance/

blocks/
  <block>/
    block.json
    template.html
    style.css        # optional
    frontend.js      # optional

engine/
  laravel/
    composer.json
    src/
    tests/

  go/
    go.mod
    cmd/
    tests/
```

Architecture rules:

- [x] `editor/` exists and owns the React editor.
- [x] `specification/` exists and owns universal contracts.
- [x] `blocks/` exists and owns portable blocks.
- [x] `engine/laravel/` exists and owns the Laravel engine.
- [x] `engine/go/` exists and owns the Go engine.
- [x] Top-level `core/` is removed.
- [x] Top-level `renderers/` is removed.
- [x] Root Laravel application/runtime ownership is removed.
- [x] Every official rendering implementation lives in its own `engine/<name>/` directory.

## 2. Ownership Rules

### `editor/`

- [x] React visual editor source lives under `editor/`.
- [x] Editor persists canonical JSON-compatible Page documents.
- [x] Editor exposes a documented engine-neutral host adapter interface.
- [x] Editor does not require Laravel routes to function.
- [x] Editor can connect to a non-Laravel host.
- [x] Editor distribution is independently packageable.

### `specification/`

- [x] Page schema exists and covers persisted Page fields used by the editor and official engines.
- [x] Block schema exists and covers portable manifest fields.
- [x] Datasource schema covers request/result/query/relation/pagination/context behavior.
- [x] Renderer protocol schema defines request/result, diagnostics, versioning, and capability negotiation.
- [x] Rendering specification is normative.
- [x] Compatibility/version policy exists and is enforced by CI tooling.
- [x] Shared conformance fixtures are normative.

### `blocks/`

- [x] Built-in blocks use `block.json` and `template.html`.
- [x] CSS and frontend JS assets are block-local and optional.
- [x] All officially supported built-in blocks render from portable files.
- [x] No Blade template is required for universal rendering.
- [x] Laravel and Go apply equivalent portable manifest/runtime rules through shared validation/conformance gates.
- [x] Installing a portable block requires no Laravel engine source modification.
- [x] Installing a portable block requires no Go engine source modification or registration rebuild.

### `engine/laravel/`

- [x] Laravel engine has independent Composer metadata and dependencies.
- [x] Production rendering is owned by `engine/laravel`.
- [x] Template, style, layout, block registry, protocol, and datasource runtime code lives under the engine package.
- [x] Laravel engine-local tests live under `engine/laravel/tests/`.
- [x] Laravel consumes shared conformance fixtures.
- [x] Laravel engine can be installed, analyzed, tested, and archived independently.

### `engine/go/`

- [x] Go module, renderer, CLI, registry, tests, and public library API exist.
- [x] Go consumes canonical Page JSON without Laravel preprocessing.
- [x] Go validates canonical portable document/block semantics required by the runtime.
- [x] Go implements portable layout/style/template behavior with Laravel parity.
- [x] Go emits structured protocol diagnostics.
- [x] Go can be extracted, built, and tested independently.

## 3. Canonical Page Document

- [x] Page data is neutral JSON.
- [x] Blocks use neutral IDs/types/attributes/children.
- [x] Layout, responsive metadata, color schemes, typography, design tokens, bindings, and settings are represented canonically.
- [x] One `page.schema.json` is authoritative.
- [x] Neither official engine requires private persisted fields.
- [x] No Eloquent class, Laravel service, Go-specific field, `_render`, or `_pageRender` is persisted.
- [x] Switching Laravel -> Go requires no Page migration.
- [x] Switching Go -> Laravel requires no Page migration.
- [x] Shared golden fixtures prove identical Page JSON works in both engines.

## 4. Portable Template Contract

- [x] Canonical template file is `template.html`.
- [x] Escaped interpolation, fallback, conditions, loops, nested paths, and raw children are implemented by both engines.
- [x] Laravel and Go share identical truthiness semantics.
- [x] Laravel and Go share identical missing/null/boolean/number/string/list behavior.
- [x] Loop semantics and loop metadata are shared.
- [x] Invalid/unsupported behavior produces structured diagnostics.
- [x] Template grammar and compatibility version are documented in `specification/rendering-spec.md` and `docs/template-language.md`.

## 5. Layout, Responsive, Style, and Design Tokens

- [x] Style allowlist is normative.
- [x] Breakpoints are normative (`desktop`, `tablet`, `mobile`).
- [x] Flex rules are normative.
- [x] Grid rules are normative.
- [x] `layoutItem` behavior is normative.
- [x] Responsive inheritance is normative.
- [x] Color scheme generation is normative.
- [x] Typography generation is normative.
- [x] Design token generation is normative.
- [x] Custom CSS handling/sanitization is normative.
- [x] Shared conformance verifies equivalent Laravel/Go HTML/CSS behavior.

## 6. Datasource Contract

- [x] Datasource request and result envelopes are specified.
- [x] Filters, ordering, relations/includes, limit/offset, pagination, context, and current-record semantics are specified.
- [x] Portable datasource diagnostics are specified.
- [x] Laravel Eloquent/database adapter exists under `engine/laravel`.
- [x] Go exposes a datasource/provider interface.
- [x] Go SQL/database adapter example exists.
- [x] Laravel and Go consume shared datasource conformance contracts.
- [x] Persisted datasource bindings use portable provider/resource names rather than framework classes.

## 7. Renderer Protocol

- [x] Renderer protocol is versioned and schema-defined.
- [x] Go CLI accepts JSON stdin and emits JSON stdout.
- [x] Request carries canonical page/context/block-root concepts.
- [x] Laravel validates outgoing canonical requests and incoming process results.
- [x] Go validates incoming protocol/page inputs.
- [x] Diagnostics use stable `code`, `severity`, `path`, and `message` fields.
- [x] Process failures and timeouts map to stable diagnostics.
- [x] Unsupported versions are rejected explicitly.
- [x] Capability/version negotiation is defined for future engines.

## 8. Shared Conformance

- [x] Both official engines consume `specification/conformance/`.
- [x] Conformance covers interpolation, escaping, fallback, conditions, loops, truthiness, nested paths, and children.
- [x] Conformance covers nested blocks and slots.
- [x] Conformance covers context and datasource contracts.
- [x] Conformance covers flex, grid, responsive styles, and `layoutItem`.
- [x] Conformance covers color schemes, typography, tokens, and custom CSS.
- [x] Conformance covers assets and de-duplication.
- [x] Conformance covers unsupported versions, invalid documents, and unknown blocks.
- [x] CI fails if official engine conformance consumption/parity diverges.

## 9. Editor Engine-Neutral API

- [x] `HostAdapter`/engine-neutral TypeScript contract exists.
- [x] Adapter can load block definitions.
- [x] Adapter can render page previews.
- [x] Adapter can render block previews where supported.
- [x] Adapter exposes datasource metadata.
- [x] Adapter exposes media integration without Laravel assumptions.
- [x] Laravel host implements the runtime contract.
- [x] HTTP/non-Laravel reference adapter exists.
- [x] Editor can bootstrap without Laravel-generated runtime URLs.

## 10. Packaging

### Editor

- [x] Standalone package artifact.
- [x] Exported public React API.
- [x] Exported TypeScript universal document/adapter types.
- [x] Supported specification version is declared.

### Specification

- [x] Independently packageable specification artifact.
- [x] Includes schemas, rendering spec, compatibility policy, version manifest, and conformance fixtures.

### Blocks

- [x] Portable block archive/package format is documented.
- [x] Portable package validator exists.
- [x] The same package is consumable by Laravel and Go hosts.
- [x] CSS/JS delivery contract is documented.

### Laravel engine

- [x] Independent Composer package with complete dependencies.
- [x] Engine-local tests and static analysis.
- [x] Independent archive verification.
- [x] Supported specification/protocol versions declared.

### Go engine

- [x] Standalone binary and module/library build.
- [x] Release matrix covers supported OS/architectures.
- [x] Checksums are generated.
- [x] Version metadata is embedded.
- [x] Supported specification/protocol versions declared.

## 11. CI Requirements

- [x] CI validates canonical top-level boundaries and rejects top-level `core/`/`renderers/`.
- [x] Separate specification, editor, Laravel, and Go jobs exist.
- [x] Fixtures are validated against JSON Schema/contracts.
- [x] Laravel engine-local tests run from `engine/laravel`.
- [x] Go engine tests/build run from `engine/go`.
- [x] Editor tests/build/E2E run from `editor/`.
- [x] Shared conformance parity gate exists.
- [x] Editor, specification, blocks, Laravel, and Go concerns are independently packaged/verified.
- [x] Distribution-boundary gate proves independently packageable source archives.

## 12. Cleanup From Old Architecture

- [x] Top-level `core/` removed.
- [x] Top-level `renderers/` removed.
- [x] Root Laravel Composer/runtime skeleton removed.
- [x] Obsolete root runtime implementations removed.
- [x] Engine-specific preprocessing is not required for canonical Page JSON.
- [x] Documentation uses the canonical `editor/`, `specification/`, `blocks/`, `engine/` ownership model.
- [x] `renderer` terminology remains only where it correctly describes the universal renderer protocol/engine role, not a competing top-level architecture layer.

## 13. Documentation Before Distribution

- [x] Architecture overview: `docs/architecture.md`.
- [x] Page JSON reference: `docs/page-json.md`.
- [x] Block manifest reference: `docs/block-manifest.md`.
- [x] Template language reference: `docs/template-language.md`.
- [x] Datasource reference: `docs/datasource-reference.md`.
- [x] Renderer protocol reference: `docs/renderer-protocol.md`.
- [x] Conformance authoring guide: `docs/conformance-authoring.md`.
- [x] React editor integration/runtime guides: `docs/editor-integration.md`, `docs/editor-runtime.md`.
- [x] Laravel engine guide: `docs/laravel-engine.md`.
- [x] Go engine guide: `docs/go-engine.md`.
- [x] Portable/custom block guides: `docs/portable-blocks.md`, `docs/custom-blocks.md`, `docs/block-package-format.md`.
- [x] Third-engine implementation guide: `docs/third-engine.md`.
- [x] Version compatibility matrix/policy: `docs/version-compatibility.md`, `specification/compatibility-policy.md`.
- [x] Migration policy: `docs/migration-policy.md`.
- [x] Security model: `docs/security-model.md`, `SECURITY.md`.

## 14. Release Acceptance Checklist

- [x] Repository architecture contains only the canonical concerns and no competing runtime boundary.
- [x] Specification is authoritative and versioned.
- [x] Built-in blocks work unchanged in Laravel and Go using portable files.
- [x] Laravel rendering is fully owned by `engine/laravel`.
- [x] Go rendering is fully owned by `engine/go`.
- [x] Editor is independently distributable and engine-neutral.
- [x] Laravel and Go pass the same shared conformance corpus.
- [x] Datasource contract is engine-neutral.
- [x] Layout/flex/grid/responsive semantics are engine-neutral.
- [x] Color schemes/typography/tokens/custom CSS semantics are engine-neutral.
- [x] Renderer protocol is validated end-to-end.
- [x] All concern-specific artifacts are independently packageable.
- [x] Release workflow publishes versioned artifacts and checksums.
- [x] Documentation is sufficient to implement a third engine from the specification/conformance contract.

## 15. Definition of Done

```text
editor/  ───────────────┐
                        │
specification/ ─────────┼── universal contracts
                        │
blocks/ ────────────────┤
                        │
                        ├── engine/laravel/
                        └── engine/go/
```

- [x] React editor works without Laravel.
- [x] Laravel consumes the universal specification without owning it.
- [x] Go consumes the same universal specification independently.
- [x] Portable blocks work unchanged in both official engines.
- [x] A third engine can be implemented from `specification/`, conformance fixtures, and the third-engine guide without copying Laravel internals.
- [x] No framework-specific Page JSON is persisted.
- [x] Universal behavior is proven by shared conformance and CI gates.
- [x] Distribution artifacts are separated and versioned.

## 16. Implementation Order — Completed

1. [x] Remove incorrect top-level `core/` boundary.
2. [x] Remove legacy top-level `renderers/` boundary.
3. [x] Move Laravel runtime behavior into `engine/laravel/src`.
4. [x] Add independent Laravel package metadata/tests.
5. [x] Remove remaining root rendering ownership.
6. [x] Freeze and complete canonical schemas/version policy.
7. [x] Expand the shared conformance corpus.
8. [x] Make Laravel and Go pass strict shared parity gates.
9. [x] Complete universal datasource contracts/adapters.
10. [x] Add engine-neutral editor host adapters.
11. [x] Make each concern independently packageable.
12. [x] Complete release matrix, checksums, version metadata, and distribution documentation.

## Completion Evidence

The final implementation gate is GitHub Actions CI run `33816511454` for commit `d32ed10b70a42f912b7f1fcaad0a09e73d6f64b1`:

- Specification: success.
- Editor tests/build/browser E2E: success.
- Laravel static analysis/format/tests/package archive: success.
- Go tests/build/protocol metadata: success.
- Shared conformance parity: success.
- Distribution boundaries/source packaging: success.

Future changes that alter universal behavior must update the specification and shared conformance fixtures first, then keep both official engines green.