# Universal Editor + Engine Distribution Plan

> **Status: IN PROGRESS — NOT READY FOR DISTRIBUTION**
>
> This document is the implementation checklist. `[x]` means the repository contains and uses the implementation. `[ ]` means missing, partial, not yet proven by tests, or still coupled to the wrong layer.
>
> The canonical architecture is fixed. Do not add a separate `core/`, `runtime/`, or `renderers/` top-level architecture layer.

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
      ... complete Laravel engine implementation ...
    tests/

  go/
    go.mod
    ... complete standalone Go engine implementation ...
    tests/
```

Architecture rules:

- [x] `editor/` exists.
- [x] `specification/` exists.
- [x] `blocks/` exists.
- [x] `engine/laravel/` exists.
- [x] `engine/go/` exists.
- [x] Top-level `core/` is removed.
- [x] Top-level `renderers/` is removed.
- [x] `engine/laravel/composer.json` exists.
- [x] `engine/go/go.mod` exists.
- [ ] Root Laravel package code no longer owns rendering behavior that belongs to `engine/laravel`.
- [ ] Every official rendering implementation lives entirely inside its respective `engine/<name>/` directory.

## 2. Ownership Rules

### `editor/`

Owns only authoring/editor concerns.

- [x] React visual editor source lives under `editor/`.
- [x] Editor persists JSON-compatible page state.
- [ ] Editor uses a documented engine-neutral host adapter interface.
- [ ] Editor does not require Laravel routes to function.
- [ ] Editor can connect directly to a non-Laravel host.
- [ ] Editor distribution is independently packageable.

### `specification/`

Owns universal contracts. It contains no executable framework implementation.

- [x] Page schema exists.
- [x] Block schema exists.
- [x] Datasource schema exists.
- [x] Renderer protocol schema exists.
- [x] Rendering specification exists.
- [x] Conformance directory exists.
- [ ] Page schema covers every persisted field used by the editor and both engines.
- [ ] Block schema covers every manifest field used by the editor and both engines.
- [ ] Datasource schema covers all supported query, relation, pagination, and context behavior.
- [ ] Renderer protocol defines structured diagnostics and capability/version compatibility.
- [ ] Specification compatibility/version policy is enforced by tooling.

### `blocks/`

Owns reusable engine-neutral blocks.

- [x] Built-in blocks use `block.json`.
- [x] Built-in blocks use `template.html`.
- [x] CSS assets can live with a block.
- [x] frontend JS assets can live with a block.
- [ ] Every officially supported built-in block can run using only the portable files.
- [ ] Blade files are optional Laravel compatibility files only.
- [ ] Laravel and Go validate block manifests with equivalent rules.
- [ ] Installing a new portable block requires no Laravel engine source modification.
- [ ] Installing a new portable block requires no Go engine source modification or registration rebuild.

### `engine/laravel/`

Owns the complete Laravel rendering implementation.

- [x] Laravel engine package metadata exists.
- [x] Laravel engine entry class exists.
- [x] Template runtime exists under `engine/laravel/src/Runtime`.
- [x] Style serializer exists under `engine/laravel/src/Runtime`.
- [x] Layout serializer exists under `engine/laravel/src/Runtime`.
- [x] Block registry loader exists under `engine/laravel/src/Runtime`.
- [x] Datasource contract and Laravel datasource adapter exist under `engine/laravel`.
- [ ] Root `src/Blocks/PageRenderer.php` is no longer required by production rendering.
- [ ] Root `src/Blocks/BlockRenderer.php` is no longer required by production rendering.
- [ ] Root `src/Rendering/PortableRuntimeRenderer.php` is removed or reduced to a compatibility proxy.
- [ ] Root `src/Rendering/UniversalTemplateRenderer.php` is removed or reduced to a compatibility proxy.
- [ ] Laravel engine-local tests live under `engine/laravel/tests/`.
- [ ] Laravel engine-local conformance tests consume the shared fixtures.
- [ ] `engine/laravel` can be installed/tested independently from the root development harness.

### `engine/go/`

Owns the complete standalone Go implementation.

- [x] Go module exists.
- [x] Go renderer exists.
- [x] Go block registry loader exists.
- [x] Go CLI exists.
- [x] Go tests exist.
- [x] Go consumes canonical Page JSON without Laravel preprocessing.
- [ ] Go validates the complete Page schema semantics.
- [ ] Go validates the complete Block schema semantics.
- [ ] Go implements all portable layout/style behavior with Laravel parity.
- [ ] Go implements all portable template grammar edge cases with Laravel parity.
- [ ] Go implements structured diagnostics defined by the protocol.
- [ ] Go exposes a stable public library API in addition to the CLI.
- [ ] Go can be extracted and tested without repository-relative assumptions.

## 3. Canonical Page Document

- [x] Page data is JSON-compatible.
- [x] Blocks use neutral IDs and types.
- [x] Attributes are neutral JSON values.
- [x] Nested children are neutral JSON.
- [x] Layout metadata is representable as JSON.
- [x] Responsive metadata is representable as JSON.
- [x] Color schemes and typography are representable as JSON.
- [ ] One canonical `page.schema.json` covers all persisted fields.
- [ ] Neither Laravel nor Go requires private persisted fields.
- [ ] No `_render`, `_pageRender`, Eloquent class, Laravel service, or Go-specific persisted field is required.
- [ ] Switching Laravel -> Go requires no migration.
- [ ] Switching Go -> Laravel requires no migration.
- [ ] Shared golden fixtures prove the same Page JSON works unchanged in both engines.

## 4. Portable Template Contract

Canonical file: `template.html`.

- [x] Escaped interpolation exists in Laravel engine runtime.
- [x] Escaped interpolation exists in Go.
- [x] Fallback syntax exists.
- [x] Conditions exist.
- [x] Loops exist.
- [x] Nested children slot exists.
- [ ] Laravel and Go implement exactly identical truthiness rules.
- [ ] Laravel and Go implement exactly identical nested-path behavior.
- [ ] Laravel and Go implement exactly identical null/boolean/number/list behavior.
- [ ] Invalid syntax returns equivalent structured diagnostics.
- [ ] Template grammar and compatibility version are fully documented in `specification/rendering-spec.md`.

## 5. Layout, Responsive, Style, and Design Tokens

- [x] Laravel engine contains style serialization implementation.
- [x] Laravel engine contains flex/grid layout serialization implementation.
- [x] Go contains canonical Page JSON layout/style rendering implementation.
- [ ] Style allowlist is normative in `specification/`.
- [ ] Breakpoints are normative in `specification/`.
- [ ] Flex rules are normative in `specification/`.
- [ ] Grid rules are normative in `specification/`.
- [ ] `layoutItem` behavior is normative in `specification/`.
- [ ] Color scheme generation is normative in `specification/`.
- [ ] Typography generation is normative in `specification/`.
- [ ] Token generation is normative in `specification/`.
- [ ] Cross-engine golden tests compare equivalent final HTML/CSS for every supported rule.

## 6. Datasource Contract

- [x] `datasource.schema.json` exists.
- [x] Laravel Eloquent adapter exists under `engine/laravel`.
- [x] Context bindings are supported.
- [ ] Datasource request envelope is fully specified.
- [ ] Datasource result envelope is fully specified.
- [ ] Filters are fully specified.
- [ ] Ordering is fully specified.
- [ ] Limit/offset semantics are fully specified.
- [ ] Pagination semantics are fully specified.
- [ ] Relations/includes are fully specified.
- [ ] Current-record context is fully specified.
- [ ] Portable datasource diagnostics are specified.
- [ ] Go exposes a datasource adapter interface.
- [ ] A Go SQL/database adapter example exists.
- [ ] Laravel and Go share datasource conformance fixtures.

## 7. Renderer Protocol

- [x] Renderer protocol schema exists.
- [x] Go CLI accepts JSON stdin.
- [x] Go CLI emits JSON stdout.
- [x] Protocol has a version.
- [x] Request contains page/context/block-root concepts.
- [ ] Laravel validates every outgoing request field.
- [ ] Go validates every incoming request field.
- [ ] Laravel validates every incoming result field.
- [ ] Diagnostics have stable `code`, `severity`, `path`, and `message` fields.
- [ ] Process errors map to stable protocol diagnostics.
- [ ] Timeout maps to a stable protocol diagnostic.
- [ ] Unsupported protocol versions behave identically across engines.
- [ ] Capability negotiation is defined for future engines.

## 8. Shared Conformance

- [x] `specification/conformance/` exists.
- [x] Go consumes shared conformance fixtures.
- [ ] Laravel engine-local tests consume the same fixture files.
- [ ] Conformance covers interpolation.
- [ ] Conformance covers escaping.
- [ ] Conformance covers fallback.
- [ ] Conformance covers conditions.
- [ ] Conformance covers loops.
- [ ] Conformance covers nested blocks.
- [ ] Conformance covers slots.
- [ ] Conformance covers context binding.
- [ ] Conformance covers datasource envelopes.
- [ ] Conformance covers flex.
- [ ] Conformance covers grid.
- [ ] Conformance covers responsive styles.
- [ ] Conformance covers color schemes.
- [ ] Conformance covers typography.
- [ ] Conformance covers tokens.
- [ ] Conformance covers custom CSS sanitization.
- [ ] Conformance covers assets and de-duplication.
- [ ] Conformance covers invalid documents and unknown blocks.
- [ ] CI fails when Laravel and Go semantics diverge.

## 9. Editor Engine-Neutral API

- [x] Editor is in its own top-level workspace.
- [ ] Define `EngineAdapter`/`HostAdapter` TypeScript interface.
- [ ] Adapter can load block definitions.
- [ ] Adapter can render a page preview.
- [ ] Adapter can render a block preview where supported.
- [ ] Adapter can expose datasource metadata.
- [ ] Adapter can expose media integration without Laravel assumptions.
- [ ] Laravel host implements the adapter contract.
- [ ] Go/non-Laravel host reference adapter exists.
- [ ] Editor can bootstrap without Laravel-generated runtime URLs.

## 10. Packaging

### Editor

- [ ] Standalone npm/package artifact.
- [ ] Exported public React API.
- [ ] Exported TypeScript universal document types.
- [ ] Version compatibility with specification declared.

### Specification

- [ ] Independently versioned specification artifact.
- [ ] Includes schemas.
- [ ] Includes rendering spec.
- [ ] Includes conformance fixtures.
- [ ] Includes compatibility policy.

### Blocks

- [ ] Portable block archive/package format defined.
- [ ] Package validator exists.
- [ ] Same package installable by Laravel and Go hosts.
- [ ] CSS/JS delivery contract documented.

### Laravel engine

- [x] `engine/laravel/composer.json` exists.
- [ ] Engine has complete independent Composer package dependencies.
- [ ] Engine has engine-local tests.
- [ ] Engine can be archived independently.
- [ ] Engine declares supported specification/protocol versions.

### Go engine

- [x] Go binary build exists.
- [ ] Release matrix covers supported OS/architectures.
- [ ] Checksums are generated.
- [ ] Version metadata is embedded.
- [ ] Supported specification/protocol versions are declared.

## 11. CI Requirements

- [x] CI validates canonical top-level directories.
- [x] CI fails if top-level `core/` appears.
- [x] CI fails if top-level `renderers/` appears.
- [x] Separate Laravel engine job exists.
- [x] Separate Go engine job exists.
- [x] Separate editor job exists.
- [x] Separate specification validation job exists.
- [ ] CI validates fixtures against JSON Schema, not only JSON syntax.
- [ ] CI runs Laravel engine-local tests from `engine/laravel/tests`.
- [ ] CI compares shared Laravel/Go conformance results.
- [ ] CI independently packages editor.
- [ ] CI independently packages specification.
- [ ] CI independently packages blocks.
- [ ] CI independently packages Laravel engine.
- [ ] CI independently packages Go engine/module.

## 12. Cleanup Remaining From Old Architecture

- [x] Remove top-level `core/`.
- [x] Remove top-level `renderers/`.
- [x] Remove root Composer autoload mapping for `Core`.
- [ ] Remove obsolete root runtime implementations after all consumers move to `engine/laravel`.
- [ ] Remove obsolete preprocessing that creates engine-specific transient render structures.
- [ ] Remove documentation that describes legacy renderer/core architecture.
- [ ] Remove scripts whose names still use legacy `renderer` terminology.

## 13. Documentation Before Distribution

- [ ] Architecture overview using only `editor/`, `specification/`, `blocks/`, and `engine/`.
- [ ] Page JSON reference.
- [ ] Block manifest reference.
- [ ] Template language reference.
- [ ] Datasource reference.
- [ ] Renderer protocol reference.
- [ ] Conformance authoring guide.
- [ ] React editor integration guide.
- [ ] Laravel engine installation guide.
- [ ] Go engine installation guide.
- [ ] Portable custom block guide.
- [ ] Third-engine implementation guide.
- [ ] Version compatibility matrix.
- [ ] Migration policy.
- [ ] Security model.

## 14. Release Acceptance Checklist

Do not mark the project complete until every item here is checked.

- [ ] Repository architecture uses only the canonical concerns and contains no competing runtime boundary.
- [ ] Specification is authoritative and fully versioned.
- [ ] All built-in blocks work unchanged in Laravel and Go using portable files.
- [ ] Laravel rendering implementation is fully owned by `engine/laravel`.
- [ ] Go rendering implementation is fully owned by `engine/go`.
- [ ] Editor is independently distributable and engine-neutral.
- [ ] Laravel and Go pass the same complete conformance corpus.
- [ ] Datasource contract is engine-neutral.
- [ ] Layout/flex/grid/responsive semantics are engine-neutral.
- [ ] Color schemes/typography/tokens/custom CSS semantics are engine-neutral.
- [ ] Renderer protocol is validated end-to-end.
- [ ] All concern-specific artifacts are independently packageable.
- [ ] Release workflow publishes versioned artifacts and checksums.
- [ ] Documentation is sufficient to implement a third engine without reading Laravel or Go source.

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

- [ ] React editor works without Laravel.
- [ ] Laravel consumes the universal specification without owning it.
- [ ] Go consumes the same universal specification independently.
- [ ] One portable block works unchanged in both engines.
- [ ] A third engine can be implemented from `specification/` and conformance fixtures alone.
- [ ] No framework-specific Page JSON is persisted.
- [ ] All universal behavior is proven by shared conformance.
- [ ] Distribution artifacts are separated and versioned.

## 16. Implementation Order

1. [x] Remove incorrect top-level `core/` boundary.
2. [x] Remove legacy top-level `renderers/` boundary.
3. [x] Move extracted Laravel runtime behavior into `engine/laravel/src`.
4. [x] Add `engine/laravel/composer.json`.
5. [ ] Move/remove remaining root rendering implementations so `engine/laravel` owns production rendering completely.
6. [ ] Freeze and complete canonical schemas.
7. [ ] Expand shared conformance corpus.
8. [ ] Make Laravel and Go pass strict parity tests.
9. [ ] Complete universal datasource adapters.
10. [ ] Add engine-neutral editor host adapter.
11. [ ] Make each concern independently packageable.
12. [ ] Complete release matrix, checksums, version metadata, and documentation.

The project remains **IN PROGRESS** until the Release Acceptance Checklist and Definition of Done are fully checked by implementation and CI evidence.
