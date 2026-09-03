# Universal Editor + Engine Distribution Plan

> **Audit status: IN PROGRESS — NOT READY FOR DISTRIBUTION**
>
> This checklist records verified implementation state, not intended architecture. A checkbox is marked `[x]` only when the repository currently contains the implementation and the boundary is actually usable. Planned or partially implemented work stays `[ ]` and is annotated when useful.
>
> Current supported implementation target: **React editor + Laravel engine + Go engine**. Rust, Node.js, Python, and Bun are outside the current implementation scope.

## Status Rules

- `[x]` — implemented and directly verifiable in the repository.
- `[ ]` — missing, incomplete, coupled to the wrong layer, or not yet verified end-to-end.
- An item described as **partial** must remain unchecked until the complete target contract is satisfied.

---

## 1. Required Final Architecture

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
    composer.json / package metadata
    src/
      ... complete Laravel engine implementation ...
    tests/

  go/
    go.mod
    ... complete standalone Go engine implementation ...
    tests/
```

The final architecture must satisfy all of the following:

- [x] `editor/` exists as a top-level React editor workspace.
- [x] `specification/` exists as a top-level contract directory.
- [x] `blocks/` exists as a top-level portable block directory.
- [x] `engine/` exists as a top-level engine directory.
- [x] `engine/laravel/` exists.
- [x] `engine/go/` exists.
- [ ] Universal runtime/core logic is fully independent from Laravel.
- [ ] Universal runtime/core logic is fully independent from Go.
- [ ] Laravel engine can be distributed from `engine/laravel/` without depending on implementation classes under the root `src/Blocks` rendering stack.
- [ ] Go engine can be distributed from `engine/go/` together with the universal specification without relying on repository-relative implementation assumptions.
- [ ] The repository root is an orchestrating monorepo rather than a Laravel package that still owns core runtime behavior.

### Current audit finding

`engine/laravel/src/LaravelRenderingEngine.php` exists, but it currently delegates directly to `Zaengit\PageBuilder\Blocks\PageRenderer` from the root Laravel package. Therefore `engine/laravel` is currently an adapter shell, **not yet a standalone engine implementation**.

---

## 2. Canonical Ownership Boundaries

### Editor

- [x] React editor source lives under `editor/`.
- [ ] Editor depends only on universal specification contracts for persisted document shape.
- [ ] Editor has no Laravel-specific API assumptions in its core runtime.
- [ ] Editor can connect to an arbitrary engine host through a documented engine-neutral adapter API.

### Specification

- [x] `specification/page.schema.json` exists.
- [x] `specification/block.schema.json` exists.
- [x] `specification/datasource.schema.json` exists.
- [x] `specification/renderer-protocol.schema.json` exists.
- [x] `specification/rendering-spec.md` exists.
- [x] `specification/conformance/` exists.
- [ ] Specification is the single source of truth used to generate or validate runtime contracts in both engines.
- [ ] No duplicated contract rules remain hard-coded independently in Laravel and Go.
- [ ] Specification versioning and compatibility rules are enforced by tooling.

### Blocks

- [x] Portable blocks are stored outside `engine/laravel` and `engine/go`.
- [x] Built-in blocks include `block.json`.
- [x] Built-in blocks include `template.html`.
- [ ] `template.html` is the only canonical rendering template required for all officially supported blocks.
- [ ] Blade templates are completely optional compatibility files and no supported feature requires Blade-only behavior.
- [ ] Block validation is performed from the same universal schema semantics in Laravel and Go.

### Engines

- [x] Canonical Go source is under `engine/go`.
- [x] Canonical Laravel engine entry class is under `engine/laravel`.
- [ ] All Laravel rendering implementation code has moved under `engine/laravel`.
- [ ] Root `src/Blocks/PageRenderer.php` is no longer the implementation core of the Laravel engine.
- [ ] Root `src/Blocks/BlockRenderer.php` is no longer the implementation core of the Laravel engine.
- [ ] Universal template rendering code is extracted from Laravel-specific namespaces/packages.
- [ ] Universal style/layout serialization code is extracted from Laravel-specific namespaces/packages.
- [ ] Universal block registry/manifest loading semantics are extracted from Laravel-specific namespaces/packages.

---

## 3. Universal Core — Must Be Framework Independent

This is the largest missing architectural layer.

Target conceptual structure:

```text
core/
  contracts/
  document/
  blocks/
  template/
  rendering/
  styles/
  layout/
  datasource/
  validation/
  conformance/
```

The exact directory name may remain `specification/` plus generated/runtime packages, but the ownership must be framework neutral.

- [ ] Define a framework-neutral runtime contract for `RenderRequest`.
- [ ] Define a framework-neutral runtime contract for `RenderResult`.
- [ ] Define a framework-neutral block registry contract.
- [ ] Define a framework-neutral datasource resolver contract.
- [ ] Define a framework-neutral template renderer contract.
- [ ] Define a framework-neutral asset collector contract.
- [ ] Define framework-neutral style serialization semantics.
- [ ] Define framework-neutral layout serialization semantics.
- [ ] Define framework-neutral diagnostics/error codes.
- [ ] Define framework-neutral validation error codes.
- [ ] Ensure every canonical runtime rule is documented in `specification/`.
- [ ] Add machine-readable conformance fixtures for every rule.
- [ ] Remove Laravel helper semantics such as `e()`, `app()`, `request()`, `View::file()`, and Laravel Cache from anything classified as universal core.
- [ ] Ensure the universal core has no Eloquent dependency.
- [ ] Ensure the universal core has no Blade dependency.
- [ ] Ensure the universal core has no Laravel service container dependency.
- [ ] Ensure the universal core has no Go-specific persisted representation.

---

## 4. Universal Page Document

### Existing foundation

- [x] Page/block state is represented as JSON-compatible structures.
- [x] Blocks have neutral `id`, `type`, `attrs`, and `children` concepts.
- [x] Layout metadata can be represented in JSON.
- [x] Responsive metadata can be represented in JSON.
- [x] Color scheme and typography settings can be represented in JSON.

### Remaining work

- [ ] One canonical Page Document schema covers every field currently accepted by the editor and both renderers.
- [ ] Laravel validates the canonical page document directly against equivalent universal rules.
- [ ] Go validates the canonical page document directly against equivalent universal rules.
- [ ] Unknown fields/version mismatches have specified portable behavior.
- [ ] Page migration rules are engine neutral.
- [ ] Switching Laravel -> Go requires no page migration.
- [ ] Switching Go -> Laravel requires no page migration.
- [ ] A golden fixture proves byte-equivalent semantic input works in both engines.
- [ ] No transient Laravel-only rendering fields are required in persisted Page JSON.
- [ ] No transient Go-only rendering fields are required in persisted Page JSON.

---

## 5. Universal Block Contract

Canonical block package:

```text
blocks/example/
  block.json
  template.html
  style.css        # optional
  frontend.js      # optional
```

### Manifest

- [x] `block.json` is already used by built-in blocks.
- [x] Block manifests can declare attributes.
- [x] Block manifests can declare assets.
- [ ] `block.schema.json` fully covers every field used by the editor and both engines.
- [ ] Laravel manifest validation is derived from or proven equivalent to `block.schema.json`.
- [ ] Go manifest validation is derived from or proven equivalent to `block.schema.json`.
- [ ] Manifest extension rules are versioned and documented.

### Template language

- [x] `template.html` exists for built-in blocks.
- [x] Laravel has a universal template renderer path.
- [x] Go has a portable template renderer implementation.
- [ ] Laravel and Go implement exactly the same template grammar.
- [ ] Escaping behavior is proven equivalent for all supported value types.
- [ ] Raw interpolation behavior is proven equivalent.
- [ ] Fallback behavior is proven equivalent.
- [ ] Conditional behavior is proven equivalent.
- [ ] Loop behavior is proven equivalent.
- [ ] Nested path resolution is proven equivalent.
- [ ] Missing/null/false/zero/empty-list truthiness is specified and proven equivalent.
- [ ] Invalid template syntax produces portable diagnostics instead of engine-specific behavior.
- [ ] Template grammar has its own explicit compatibility/version policy.

### Dynamic loading

- [x] Laravel discovers block manifests from configured block paths.
- [x] Go has a block registry loader.
- [ ] Both loaders implement the exact same path safety and manifest resolution rules.
- [ ] Both engines support the same block root layout without engine-specific files.
- [ ] Adding an ordinary portable block requires no Laravel source modification.
- [ ] Adding an ordinary portable block requires no Go source modification.
- [ ] Adding an ordinary portable block requires no Go recompilation solely for registration.

---

## 6. Layout, Responsive, Style, and Design Tokens

### Existing Laravel implementation

- [x] Laravel root package currently has style serialization logic.
- [x] Laravel root package currently has layout serialization logic.
- [x] Laravel root package currently emits responsive CSS.
- [x] Laravel root package currently emits page color scheme CSS.
- [x] Laravel root package currently emits typography CSS.

### Universalization required

- [ ] Style property allowlist is defined in the universal specification.
- [ ] Layout serialization rules are defined in the universal specification.
- [ ] Flex serialization rules are defined in the universal specification.
- [ ] Grid serialization rules are defined in the universal specification.
- [ ] Responsive breakpoint semantics are defined in the universal specification.
- [ ] Block `layoutItem` semantics are defined in the universal specification.
- [ ] Color scheme CSS generation semantics are defined in the universal specification.
- [ ] Typography CSS generation semantics are defined in the universal specification.
- [ ] Token serialization semantics are defined in the universal specification.
- [ ] Laravel implements these rules from its engine package.
- [ ] Go implements the same rules independently.
- [ ] Cross-engine golden tests compare final HTML/CSS for all layout/style features.

---

## 7. Universal Datasource Contract

Target resources remain framework-neutral:

```text
products
posts
projects
categories
users
```

### Existing foundation

- [x] A datasource schema file exists.
- [x] Laravel has data provider infrastructure.
- [x] Laravel has Eloquent/database integration infrastructure.
- [x] Runtime context bindings exist.

### Missing universal architecture

- [ ] Datasource request envelope is fully specified independently of Laravel.
- [ ] Datasource result envelope is fully specified independently of Laravel.
- [ ] Query filters are fully specified.
- [ ] Ordering is fully specified.
- [ ] Limit/offset semantics are fully specified.
- [ ] Pagination semantics are fully specified.
- [ ] Relation/include semantics are fully specified.
- [ ] Collection/repeater semantics are fully specified.
- [ ] Current-record context semantics are fully specified.
- [ ] Authorization/error behavior is represented by portable diagnostics.
- [ ] Laravel Eloquent adapter implements the universal datasource interface.
- [ ] Go has a real datasource adapter interface, not only pre-resolved context consumption.
- [ ] A Go SQL/database adapter example exists.
- [ ] Datasource conformance fixtures are shared by Laravel and Go.

---

## 8. Renderer Protocol

### Existing foundation

- [x] Renderer protocol schema exists.
- [x] Go CLI accepts JSON from stdin.
- [x] Go CLI returns JSON to stdout.
- [x] Protocol request includes a version.
- [x] Protocol includes page/context/block-root concepts.
- [x] Laravel has a process rendering engine abstraction.

### Required completion

- [ ] Every request field is validated against the protocol contract in Laravel before execution.
- [ ] Every request field is validated against the protocol contract in Go.
- [ ] Every response field is validated against the protocol contract in Laravel.
- [ ] Portable diagnostic objects have stable codes/severity/path metadata.
- [ ] stderr/process failures map to documented portable errors.
- [ ] Timeout behavior has a portable error contract.
- [ ] Unsupported protocol versions have identical documented behavior.
- [ ] Capability negotiation/version compatibility is defined for future engines.
- [ ] Protocol conformance is tested independently from Laravel host behavior.

---

## 9. Laravel Engine

Current state: **partial adapter, not standalone**.

- [x] `engine/laravel/src/LaravelRenderingEngine.php` exists.
- [x] Composer autoload maps `Zaengit\PageBuilder\Engine\Laravel\` to `engine/laravel/src/`.
- [x] Canonical configured engine name is `laravel`.
- [x] Legacy `php` alias exists for compatibility.
- [ ] `engine/laravel` has its own package metadata suitable for independent distribution.
- [ ] `engine/laravel` owns its complete rendering implementation.
- [ ] `engine/laravel` does not depend on root `src/Blocks/PageRenderer` for its core rendering behavior.
- [ ] `engine/laravel` does not depend on root `src/Blocks/BlockRenderer` for its core rendering behavior.
- [ ] Universal template runtime has moved out of Laravel-specific root implementation ownership.
- [ ] Laravel-specific integrations are isolated to adapters: Blade compatibility, Eloquent, Laravel Cache, Laravel request context, service provider wiring.
- [ ] Laravel engine has engine-local unit tests.
- [ ] Laravel engine has engine-local conformance tests.
- [ ] Laravel engine can be versioned independently from the React editor.
- [ ] Laravel engine can be packaged independently from the repository development harness.

---

## 10. Go Engine

Current state: **substantial renderer implementation exists, distribution boundary still needs hardening**.

- [x] `engine/go/go.mod` exists.
- [x] Go module path is under `/engine/go`.
- [x] Go registry loader exists.
- [x] Go renderer exists.
- [x] Go CLI exists.
- [x] Go renderer tests exist.
- [x] Go registry tests exist.
- [x] Go renderer consumes shared conformance fixture(s).
- [ ] Go validates the complete canonical page schema.
- [ ] Go validates the complete canonical block schema.
- [ ] Go validates the complete datasource schema where applicable.
- [ ] Go validates renderer request/response against the full protocol semantics.
- [ ] Go implements every Laravel-supported portable layout/style feature with proven parity.
- [ ] Go implements every portable template edge case with proven parity.
- [ ] Go has portable structured diagnostics rather than only string diagnostics.
- [ ] Go has a stable public library API in addition to the CLI contract.
- [ ] Go module can be extracted and tested as a standalone distribution without repository-relative fixture assumptions.
- [ ] Go release artifacts are generated for the required OS/architecture matrix.
- [ ] Checksums/version metadata are generated for Go binary releases.

---

## 11. React Editor

Current state: **editor exists; engine-neutral distribution is not yet proven**.

- [x] React editor exists under `editor/`.
- [x] Editor produces JSON page state.
- [x] Editor consumes block metadata.
- [x] Editor has unit tests/build/E2E infrastructure.
- [ ] Editor is packaged as a standalone distributable package independent from Laravel Composer packaging.
- [ ] Editor has an explicit universal engine adapter interface.
- [ ] Laravel preview adapter implements that interface.
- [ ] Go preview adapter implements that interface without requiring Laravel as the bridge.
- [ ] Editor can be embedded in a non-Laravel host with documented integration steps.
- [ ] Editor schema validation uses the universal specification as its source of truth.
- [ ] Editor block inspector schema uses the universal block specification as its source of truth.
- [ ] Editor import/export compatibility tests run against both engines.

---

## 12. Conformance Suite

A universal project is not complete until conformance, not directory layout, proves compatibility.

- [x] `specification/conformance/` exists.
- [x] At least one portable runtime fixture exists and is consumed by Go tests.
- [ ] Laravel runs the exact same portable runtime fixture and compares the same expected result.
- [ ] Conformance covers every built-in block feature.
- [ ] Conformance covers every template language construct.
- [ ] Conformance covers every supported scalar/null/list/object edge case.
- [ ] Conformance covers nested blocks.
- [ ] Conformance covers named slots.
- [ ] Conformance covers context bindings.
- [ ] Conformance covers datasource envelopes.
- [ ] Conformance covers flex layout.
- [ ] Conformance covers grid layout.
- [ ] Conformance covers responsive styles.
- [ ] Conformance covers spacing/border/radius/effects.
- [ ] Conformance covers color schemes.
- [ ] Conformance covers typography.
- [ ] Conformance covers page tokens.
- [ ] Conformance covers custom CSS sanitization behavior.
- [ ] Conformance covers asset ordering and de-duplication.
- [ ] Conformance covers unknown blocks and invalid documents.
- [ ] CI fails if Laravel and Go outputs diverge from the same golden fixtures.

---

## 13. Legacy `renderers/` Cleanup

Current repository still contains:

```text
renderers/
  README.md
  node/
  python/
  rust/
```

These are not part of the current Laravel + Go target and create architectural ambiguity.

- [x] `renderers/go` duplicate implementation has been removed.
- [x] Legacy renderer experiments are excluded from Composer distribution.
- [ ] Remove `renderers/node/` from the canonical repository tree or move it to a clearly separated archive/experimental repository.
- [ ] Remove `renderers/python/` from the canonical repository tree or move it to a clearly separated archive/experimental repository.
- [ ] Remove `renderers/rust/` from the canonical repository tree or move it to a clearly separated archive/experimental repository.
- [ ] Remove or rewrite `renderers/README.md` after legacy engines are relocated.
- [ ] No production documentation refers to `renderers/` as an active architecture component.

---

## 14. Build System

- [x] Go build script targets `engine/go`.
- [x] Go binary output has moved under `dist/engine/`.
- [ ] Rename `scripts/build-universal-renderers.sh` to engine terminology or provide a canonical `scripts/build-engines.sh` entrypoint.
- [ ] Build script validates specification version compatibility before building.
- [ ] Build output embeds engine version/protocol version metadata.
- [ ] Laravel engine has an independent package build step.
- [ ] React editor has an independent package build step.
- [ ] Portable blocks can be packaged independently.
- [ ] Universal specification can be packaged independently.
- [ ] Monorepo release can compose editor + specs + blocks + selected engines without assuming Laravel is the root product.

---

## 15. CI Gates

### Existing gates

- [x] PHP static analysis exists.
- [x] PHP formatting check exists.
- [x] PHPUnit suite exists.
- [x] Go test job exists for `engine/go`.
- [x] Go binary build/smoke test exists.
- [x] React editor unit test/build job exists.
- [x] Playwright E2E exists.
- [x] Composer archive verification exists.

### Required universal gates

- [ ] CI has a dedicated universal-specification validation job.
- [ ] CI validates every JSON Schema file itself.
- [ ] CI validates fixtures against the schemas.
- [ ] CI executes the same conformance corpus against Laravel and Go.
- [ ] CI compares Laravel and Go results for parity.
- [ ] CI verifies `engine/laravel` can be packaged independently.
- [ ] CI verifies `engine/go` can be packaged independently.
- [ ] CI verifies editor can be packaged independently.
- [ ] CI verifies portable blocks package independently.
- [ ] CI verifies no Laravel dependency leaks into universal specification/block artifacts.
- [ ] CI verifies no Go dependency leaks into universal specification/block artifacts.
- [ ] CI verifies legacy `renderers/` code is not included in official distributions.

---

## 16. Distribution Targets

### Universal specification distribution

- [ ] Publish/version the specification independently.
- [ ] Include schemas.
- [ ] Include rendering specification.
- [ ] Include conformance fixtures.
- [ ] Include compatibility/version policy.

### Portable blocks distribution

- [ ] Define a portable block package/archive format.
- [ ] Validate block packages before release.
- [ ] Support installing the same block package into Laravel and Go hosts.
- [ ] Document frontend JS/CSS asset delivery contract.

### React editor distribution

- [ ] Publish standalone editor package/artifact.
- [ ] Publish TypeScript types generated from or synchronized with universal schemas.
- [ ] Document host adapter interface.
- [ ] Document Laravel host integration.
- [ ] Document Go/non-Laravel host integration.

### Laravel engine distribution

- [ ] Package `engine/laravel` independently.
- [ ] Move complete Laravel engine runtime under its engine boundary.
- [ ] Keep Eloquent/Blade/Laravel-specific concerns as Laravel-only adapters.
- [ ] Version it against the universal specification compatibility range.

### Go engine distribution

- [x] Go binary can be built from `engine/go`.
- [ ] Publish versioned binaries for supported platforms.
- [ ] Publish checksums.
- [ ] Publish source/module version.
- [ ] Declare supported specification/protocol versions.

---

## 17. Documentation Required Before Release

- [ ] Architecture overview with ownership boundaries.
- [ ] Universal Page JSON reference.
- [ ] Universal block manifest reference.
- [ ] Universal template language reference.
- [ ] Universal datasource contract reference.
- [ ] Renderer protocol reference.
- [ ] Conformance authoring guide.
- [ ] React editor integration guide.
- [ ] Laravel engine installation guide.
- [ ] Go engine installation guide.
- [ ] Custom portable block creation guide that does not assume Laravel.
- [ ] Engine authoring guide for future Rust/Python/Node/Bun engines.
- [ ] Version compatibility matrix.
- [ ] Migration policy.
- [ ] Security model for templates, CSS, JS assets, datasource access, and process engines.

---

## 18. Release Acceptance Checklist

A universal release MUST NOT be called complete until all items below are checked.

- [ ] Universal core ownership is independent from Laravel.
- [ ] Universal specification is authoritative and fully versioned.
- [ ] All built-in portable blocks work from `block.json + template.html` in both engines.
- [ ] Laravel engine is a real standalone engine package under `engine/laravel`.
- [ ] Go engine is a real standalone engine package/module under `engine/go`.
- [ ] React editor is distributable independently.
- [ ] Laravel and Go pass the same complete conformance corpus.
- [ ] Laravel and Go produce equivalent semantics for all supported features.
- [ ] Dynamic datasource contracts are engine neutral.
- [ ] Layout/flex/grid/responsive behavior is engine neutral.
- [ ] Color schemes/typography/tokens/custom CSS behavior is engine neutral.
- [ ] Renderer protocol is validated end-to-end.
- [ ] Official artifacts contain no legacy `renderers/` experiments.
- [ ] CI proves package independence for editor/specification/blocks/Laravel/Go.
- [ ] Release workflow publishes all required artifacts with versions/checksums.
- [ ] Documentation is complete enough to implement a third engine without reading Laravel source.

---

## 19. Definition of Done

The architecture is **DONE** only when this is true in practice:

```text
                 ┌──────────────────────┐
                 │  Universal Contract  │
                 │ specification/       │
                 └──────────┬───────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ▼                ▼                ▼
       editor/          engine/laravel   engine/go
        React              Laravel           Go
           │                │                │
           └────────────────┼────────────────┘
                            │
                            ▼
                       blocks/
              block.json + template.html
```

- [ ] The React editor can be used without Laravel.
- [ ] Laravel can render the universal document without owning its specification.
- [ ] Go can render the same universal document without Laravel.
- [ ] A portable block can be created once and used unchanged by both engines.
- [ ] A third engine can be implemented from `specification/` + conformance fixtures without copying Laravel runtime code.
- [ ] No component needs framework-specific persisted Page JSON.
- [ ] All universal behavior is proven by shared conformance tests.
- [ ] Distribution artifacts are separated by concern and versioned.

Until every checkbox in **Release Acceptance Checklist** and **Definition of Done** is complete, the project must remain marked **IN PROGRESS**.

---

## 20. Immediate Implementation Order

Work should proceed in this order to avoid building more code on the wrong boundary:

1. [ ] Freeze the canonical schemas and enumerate every field currently used by editor/Laravel/Go.
2. [ ] Build a complete cross-engine conformance corpus from current features.
3. [ ] Extract universal template/style/layout/block-loading semantics from Laravel-specific ownership.
4. [ ] Move the complete Laravel engine implementation into `engine/laravel`.
5. [ ] Make Go consume and validate the same complete contracts.
6. [ ] Add strict Laravel-vs-Go parity CI.
7. [ ] Define the universal datasource adapter interface and implement Laravel + Go adapters.
8. [ ] Introduce a real engine-neutral editor host adapter API.
9. [ ] Make editor/specification/blocks/Laravel/Go independently packageable.
10. [ ] Remove or relocate legacy `renderers/node`, `renderers/python`, and `renderers/rust`.
11. [ ] Complete release/versioning/checksum workflows.
12. [ ] Check items only after implementation and CI evidence exist.
