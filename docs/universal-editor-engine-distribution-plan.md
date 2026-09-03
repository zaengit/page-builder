# Universal Page Builder — Editor + Engine Distribution Plan

## 1. Tujuan Akhir

Arsitektur final harus memisahkan **editor** dan **engine** secara tegas.

```text
page-builder/
├── editor/
│   └── react/
├── blocks/
├── specification/
├── conformance/
├── engine/
│   ├── laravel/
│   └── golang/
├── examples/
├── scripts/
└── docs/
```

Prinsip utama:

- React adalah satu-satunya editor.
- Laravel adalah satu engine mandiri.
- Golang adalah satu engine mandiri.
- Laravel tidak menjadi parent engine Golang.
- Golang tidak bergantung pada Laravel.
- `blocks/` bersifat universal dan dipakai oleh semua engine.
- `specification/` bersifat universal dan menjadi sumber kebenaran semua engine.
- Page JSON yang dihasilkan React harus identik untuk Laravel maupun Golang.
- Satu block harus dibuat satu kali dan dapat dirender oleh Laravel serta Golang tanpa duplikasi template.
- Engine harus bisa didistribusikan dan dijalankan secara independen.

---

# 2. Definition of Done Global

Project dianggap selesai dan siap distribusi hanya jika seluruh checklist ini terpenuhi.

## Architecture

- [ ] `editor/react` tidak memiliki dependency ke Laravel.
- [ ] `editor/react` tidak memiliki dependency ke Golang.
- [ ] `engine/laravel` dapat dijalankan tanpa engine Golang.
- [ ] `engine/golang` dapat dijalankan tanpa Laravel.
- [ ] `blocks/` tidak berisi syntax Blade sebagai canonical template.
- [ ] `blocks/` tidak berisi Go template sebagai canonical template.
- [ ] `specification/` tidak bergantung framework tertentu.
- [ ] Page JSON tidak menyimpan nama class Eloquent.
- [ ] Page JSON tidak menyimpan package/class Go.
- [ ] Semua engine mengikuti specification yang sama.

## Rendering

- [ ] Laravel dan Golang menghasilkan HTML yang setara dari fixture yang sama.
- [ ] Escaping identik.
- [ ] Fallback identik.
- [ ] `if` identik.
- [ ] `for` identik.
- [ ] Nested `if`/`for` identik.
- [ ] Nested blocks identik.
- [ ] Layout identik.
- [ ] Responsive CSS identik.
- [ ] Typography identik.
- [ ] Color scheme identik.
- [ ] Custom CSS identik.
- [ ] Asset collection identik.
- [ ] Diagnostics identik.

## Distribution

- [ ] React editor memiliki artifact production.
- [ ] Laravel engine dapat dipasang sebagai package Composer.
- [ ] Golang engine dapat didistribusikan sebagai binary.
- [ ] Universal blocks ikut dalam release.
- [ ] Universal specifications ikut dalam release.
- [ ] Conformance fixtures tersedia untuk implementor engine lain di masa depan.
- [ ] CI release gagal jika salah satu artifact tidak lengkap.
- [ ] Dokumentasi instalasi tersedia.
- [ ] Dokumentasi membuat custom block tersedia.
- [ ] Dokumentasi datasource tersedia.
- [ ] Dokumentasi deployment Laravel tersedia.
- [ ] Dokumentasi deployment Golang tersedia.

---

# 3. Struktur Repository Final

Target struktur:

```text
page-builder/
├── editor/
│   └── react/
│       ├── src/
│       ├── tests/
│       ├── e2e/
│       ├── package.json
│       └── vite.config.ts
│
├── blocks/
│   ├── heading/
│   │   ├── block.json
│   │   ├── template.html
│   │   ├── style.css
│   │   └── frontend.js
│   ├── container/
│   ├── columns/
│   ├── image/
│   ├── carousel/
│   └── ...
│
├── specification/
│   ├── page.schema.json
│   ├── block.schema.json
│   ├── datasource.schema.json
│   ├── renderer-protocol.schema.json
│   ├── template-language.md
│   ├── rendering.md
│   ├── layout.md
│   ├── styling.md
│   └── datasource.md
│
├── conformance/
│   ├── fixtures/
│   ├── expected/
│   └── README.md
│
├── engine/
│   ├── laravel/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── composer.json
│   │   └── README.md
│   │
│   └── golang/
│       ├── cmd/page-builder-render/
│       ├── internal/
│       ├── tests/
│       ├── go.mod
│       └── README.md
│
├── examples/
│   ├── pages/
│   ├── custom-blocks/
│   ├── laravel/
│   └── golang/
│
├── scripts/
│   ├── validate-spec.sh
│   ├── run-conformance.sh
│   ├── build-editor.sh
│   ├── build-laravel-package.sh
│   ├── build-go-engine.sh
│   └── release.sh
│
└── docs/
```

Checklist:

- [ ] Buat struktur final repository.
- [ ] Pindahkan editor ke `editor/react`.
- [ ] Pindahkan Laravel-specific source ke `engine/laravel`.
- [ ] Pindahkan Golang renderer ke `engine/golang`.
- [ ] Pertahankan `blocks/` di root universal.
- [ ] Pertahankan `specification/` di root universal.
- [ ] Pindahkan conformance ke root `conformance/`.
- [ ] Perbarui seluruh path CI.
- [ ] Perbarui dokumentasi path.

---

# 4. Universal Page Specification

`specification/page.schema.json` menjadi kontrak antara React dan semua engine.

Minimal page:

```json
{
  "version": 1,
  "settings": {},
  "blocks": []
}
```

Checklist:

- [ ] Tambahkan `version` wajib.
- [ ] Definisikan `settings` secara formal.
- [ ] Definisikan recursive `blocks`.
- [ ] Definisikan `attrs`.
- [ ] Definisikan `bindings`.
- [ ] Definisikan `data`.
- [ ] Definisikan `styles`.
- [ ] Definisikan `layout`.
- [ ] Definisikan `layoutItem`.
- [ ] Definisikan `slot`.
- [ ] Definisikan `colorSchemeId`.
- [ ] Definisikan responsive override.
- [ ] Larang field engine-specific.
- [ ] Tambahkan schema validation test.

Engine-specific field yang dilarang dalam persisted JSON:

- [ ] `modelClass`
- [ ] `eloquentModel`
- [ ] PHP namespace/class
- [ ] Go package/type
- [ ] SQLAlchemy model class
- [ ] Blade template path

---

# 5. Universal Block Specification

Satu block dibuat satu kali.

```text
blocks/product-card/
├── block.json
├── template.html
├── style.css
└── frontend.js
```

Canonical manifest:

```json
{
  "name": "core/product-card",
  "version": 1,
  "title": "Product Card",
  "template": "template.html",
  "attributes": {},
  "settings": [],
  "assets": {
    "css": ["style.css"],
    "js": ["frontend.js"]
  }
}
```

Checklist manifest:

- [ ] `name` wajib namespaced.
- [ ] `version` wajib.
- [ ] `title` wajib.
- [ ] `template` wajib atau default `template.html`.
- [ ] Attribute type distandarkan.
- [ ] Default value distandarkan.
- [ ] Inspector settings distandarkan.
- [ ] Group inspector didukung.
- [ ] Variations/presets didukung.
- [ ] Assets didukung.
- [ ] Data contract didukung.
- [ ] Nested children didukung.
- [ ] Slots didukung.
- [ ] Responsive settings didukung.
- [ ] Color scheme selector didukung.
- [ ] Typography selector didukung.

Block canonical tidak boleh membutuhkan:

- [ ] Blade directive.
- [ ] PHP expression.
- [ ] Go template expression.
- [ ] Laravel helper.
- [ ] Eloquent model.

---

# 6. Universal Template Language

Canonical syntax yang wajib diimplementasikan Laravel dan Golang:

```text
{{ value }}
{{ value ?? "fallback" }}
{{{ children }}}
{% if condition %}
{% endif %}
{% for item in items %}
{% endfor %}
```

Checklist parser:

- [ ] Escaped interpolation.
- [ ] Raw interpolation terbatas.
- [ ] Fallback value.
- [ ] Dot path resolution.
- [ ] Whole-context resolution.
- [ ] Boolean truthiness canonical.
- [ ] Number truthiness canonical.
- [ ] String truthiness canonical.
- [ ] Empty array truthiness canonical.
- [ ] Null truthiness canonical.
- [ ] Canonical scalar stringify.
- [ ] Nested `if`.
- [ ] Nested `for`.
- [ ] `if` di dalam `for`.
- [ ] `for` di dalam `if`.
- [ ] Nested same-type loops.
- [ ] Invalid syntax diagnostics.
- [ ] Unknown variable behavior.
- [ ] Security escaping tests.

Implementation requirement:

- [ ] Jangan mengandalkan regex-only parser untuk nested constructs.
- [ ] Laravel memiliki tokenizer/parser yang mendukung nesting.
- [ ] Golang memiliki tokenizer/parser yang mendukung nesting.
- [ ] Keduanya menggunakan conformance fixture yang sama.

---

# 7. Universal Style Contract

Style disimpan sebagai data, bukan CSS engine-specific.

Checklist:

- [ ] Margin.
- [ ] Padding.
- [ ] Width.
- [ ] Height.
- [ ] Min/max width.
- [ ] Min/max height.
- [ ] Background.
- [ ] Text color.
- [ ] Border.
- [ ] Border width.
- [ ] Border style.
- [ ] Border color.
- [ ] Radius.
- [ ] Box shadow.
- [ ] Opacity.
- [ ] Overflow.
- [ ] Custom class.
- [ ] Responsive style override.
- [ ] Safe CSS value handling.
- [ ] Deterministic serialization order.

Laravel dan Golang harus menghasilkan CSS yang sama dari object style yang sama.

---

# 8. Universal Layout Contract

Supported container mode:

- [ ] block
- [ ] flex
- [ ] grid

Flex:

- [ ] direction
- [ ] wrap
- [ ] justify-content
- [ ] align-items
- [ ] align-content
- [ ] gap
- [ ] row-gap
- [ ] column-gap

Flex child:

- [ ] grow
- [ ] shrink
- [ ] basis
- [ ] order
- [ ] align-self

Grid:

- [ ] columns
- [ ] rows
- [ ] auto-flow
- [ ] gap
- [ ] column gap
- [ ] row gap

Grid child:

- [ ] column start
- [ ] row start
- [ ] column span
- [ ] row span

Responsive:

- [ ] desktop
- [ ] tablet
- [ ] mobile
- [ ] deterministic breakpoint order

Conformance:

- [ ] Laravel CSS output identik dengan Go.

---

# 9. Global Color Scheme

Checklist:

- [ ] Multiple color schemes.
- [ ] Stable scheme ID.
- [ ] Page default scheme.
- [ ] Block override scheme.
- [ ] CSS variable generation.
- [ ] Background token.
- [ ] Foreground token.
- [ ] Accent tokens.
- [ ] Border tokens.
- [ ] Custom tokens.
- [ ] Sanitized identifier.
- [ ] Laravel/Go output parity.

---

# 10. Global Typography

Checklist:

- [ ] Primary font family.
- [ ] Secondary font family.
- [ ] Monospace family.
- [ ] H1.
- [ ] H2.
- [ ] H3.
- [ ] H4.
- [ ] H5.
- [ ] H6.
- [ ] Body.
- [ ] Body small.
- [ ] Caption.
- [ ] Label.
- [ ] Button.
- [ ] Font size.
- [ ] Weight.
- [ ] Line-height.
- [ ] Letter-spacing.
- [ ] Text-transform.
- [ ] CSS variable generation.
- [ ] Laravel/Go parity.

---

# 11. Universal Datasource Specification

Page/block hanya menyimpan resource netral.

Contoh:

```json
{
  "resource": "products",
  "query": {
    "where": [
      {
        "field": "status",
        "operator": "=",
        "value": "active"
      }
    ],
    "orderBy": [
      {
        "field": "created_at",
        "direction": "desc"
      }
    ],
    "limit": 12
  }
}
```

Checklist query specification:

- [ ] resource
- [ ] select
- [ ] where
- [ ] nested where groups
- [ ] operators
- [ ] orderBy
- [ ] limit
- [ ] offset
- [ ] pagination
- [ ] relation/include
- [ ] search
- [ ] single-record mode
- [ ] collection mode
- [ ] current-context resource
- [ ] fallback

Operator awal:

- [ ] `=`
- [ ] `!=`
- [ ] `>`
- [ ] `>=`
- [ ] `<`
- [ ] `<=`
- [ ] `in`
- [ ] `not_in`
- [ ] `contains`
- [ ] `starts_with`
- [ ] `ends_with`
- [ ] `is_null`
- [ ] `is_not_null`

Security:

- [ ] Field whitelist per resource.
- [ ] Relation whitelist.
- [ ] Max limit.
- [ ] Max nesting depth.
- [ ] Reject arbitrary SQL.
- [ ] Reject arbitrary Laravel class.
- [ ] Reject arbitrary Go code.

---

# 12. Laravel Engine

Laravel adalah engine mandiri di `engine/laravel`.

Responsibilities:

- membaca universal page JSON;
- membaca universal block registry;
- resolve datasource menggunakan Laravel/Eloquent;
- menjalankan universal template language;
- compile universal style/layout/page settings;
- mengumpulkan assets;
- menghasilkan diagnostics;
- menghasilkan HTML.

Checklist:

- [ ] Package Composer sendiri.
- [ ] Namespace package bersih.
- [ ] Service provider.
- [ ] Config engine.
- [ ] Universal block loader.
- [ ] Universal schema validator.
- [ ] Universal template runtime.
- [ ] Style compiler.
- [ ] Layout compiler.
- [ ] Typography compiler.
- [ ] Color scheme compiler.
- [ ] Datasource registry.
- [ ] Eloquent resource adapter.
- [ ] Context provider.
- [ ] Relationship mapping.
- [ ] Pagination.
- [ ] Asset collector.
- [ ] Diagnostics.
- [ ] Render API.
- [ ] CLI render command.
- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Conformance tests.

Legacy compatibility:

- [ ] Blade fallback boleh tersedia.
- [ ] Blade bukan canonical universal block.
- [ ] Blade fallback terdokumentasi sebagai Laravel-only.

Distribution:

- [ ] `composer validate --strict`.
- [ ] PHPStan clean.
- [ ] Pint clean.
- [ ] PHPUnit clean.
- [ ] `composer archive` berhasil.
- [ ] Archive berisi universal blocks/specification yang diperlukan atau dependency strategy yang terdokumentasi.

---

# 13. Golang Engine

Go adalah engine mandiri di `engine/golang`.

Responsibilities sama dengan Laravel engine, kecuali implementation internal menggunakan Go.

Checklist:

- [ ] `go.mod` mandiri.
- [ ] CLI binary `page-builder-render`.
- [ ] Universal block loader.
- [ ] JSON schema validation strategy.
- [ ] Universal template tokenizer/parser.
- [ ] Style compiler.
- [ ] Layout compiler.
- [ ] Typography compiler.
- [ ] Color scheme compiler.
- [ ] Datasource registry.
- [ ] `database/sql` adapter.
- [ ] Configurable SQL driver layer.
- [ ] Context provider.
- [ ] Relationships strategy.
- [ ] Pagination.
- [ ] Asset collector.
- [ ] Diagnostics.
- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Conformance tests.
- [ ] Race test jika relevan.
- [ ] `go vet` clean.
- [ ] `gofmt` clean.

Binary distribution:

- [ ] linux amd64
- [ ] linux arm64
- [ ] darwin amd64
- [ ] darwin arm64
- [ ] windows amd64
- [ ] checksums

Optional setelah v1:

- [ ] container image
- [ ] static binary strategy

---

# 14. Engine Render Protocol

Laravel CLI dan Go CLI harus menerima contract yang sama.

Request:

```json
{
  "version": 1,
  "page": {},
  "context": {},
  "registry": {}
}
```

Response:

```json
{
  "html": "",
  "assets": {
    "css": [],
    "js": []
  },
  "diagnostics": []
}
```

Checklist:

- [ ] Protocol version.
- [ ] Request schema.
- [ ] Response schema.
- [ ] Error response schema.
- [ ] Unknown block diagnostic.
- [ ] Invalid manifest diagnostic.
- [ ] Invalid page diagnostic.
- [ ] Datasource error diagnostic.
- [ ] Template parse error diagnostic.
- [ ] No debug stack trace in production response.
- [ ] Deterministic output.

---

# 15. React Editor

React editor harus hanya membaca specification dan registry metadata.

Checklist core editor:

- [ ] Block inserter.
- [ ] Drag/drop.
- [ ] Nested blocks.
- [ ] Grid cell drop.
- [ ] Flex positional drop.
- [ ] History undo/redo.
- [ ] Selection state.
- [ ] Inspector.
- [ ] Responsive breakpoint switcher.
- [ ] Page settings.
- [ ] Color scheme manager.
- [ ] Typography manager.
- [ ] Datasource builder.
- [ ] Dynamic binding editor.
- [ ] Preview.
- [ ] Save/load universal JSON.

Editor neutrality checks:

- [ ] Tidak ada Laravel model class dalam persisted JSON.
- [ ] Tidak ada Blade syntax generation.
- [ ] Tidak ada Go-specific settings.
- [ ] Resource selector menggunakan resource ID universal.
- [ ] Query builder menghasilkan datasource spec universal.

Testing:

- [ ] Unit tests.
- [ ] Store tests.
- [ ] Serialization tests.
- [ ] Schema compatibility tests.
- [ ] Browser E2E.
- [ ] Screenshot regression untuk flow penting.

Distribution:

- [ ] production JS artifact.
- [ ] production CSS artifact.
- [ ] package manifest.
- [ ] version stamp.

---

# 16. Block Authoring Workflow

Developer membuat block satu kali.

Command target:

```text
page-builder make:block vendor/product-card
```

Output:

```text
blocks/product-card/
├── block.json
├── template.html
├── style.css
└── frontend.js
```

Checklist scaffolder:

- [ ] Generate valid `block.json`.
- [ ] Generate `version: 1`.
- [ ] Generate portable `template.html`.
- [ ] Generate empty/minimal style.css.
- [ ] Generate optional frontend.js.
- [ ] Validate block after generation.
- [ ] No Blade as default.
- [ ] No Go template as default.

Block validation CLI:

- [ ] Validate manifest schema.
- [ ] Validate template file exists.
- [ ] Validate asset files exist.
- [ ] Validate portable template syntax.
- [ ] Validate forbidden engine-specific syntax.
- [ ] Validate duplicate block name.

---

# 17. JavaScript Frontend Runtime

Interactive block behavior berjalan di browser, terlepas engine yang merender HTML.

Checklist:

- [ ] Define mount contract.
- [ ] Define destroy/unmount contract jika perlu.
- [ ] Asset JS hanya dimuat sekali.
- [ ] Multiple instances aman.
- [ ] SSR markup hydration-safe.
- [ ] Carousel bekerja pada Laravel output.
- [ ] Carousel bekerja pada Go output.
- [ ] Tidak membutuhkan React runtime untuk frontend public kecuali block memang memilihnya.

---

# 18. Asset System

Checklist:

- [ ] CSS manifest support.
- [ ] JS manifest support.
- [ ] Asset deduplication.
- [ ] Stable ordering.
- [ ] Relative asset path rules.
- [ ] Public URL mapping strategy.
- [ ] Optional hash/fingerprint strategy.
- [ ] Missing asset diagnostic.
- [ ] Laravel and Go parity.

---

# 19. Conformance Suite

Conformance adalah sumber kebenaran utama cross-engine.

Fixture minimum:

- [ ] plain text block
- [ ] escaping HTML
- [ ] fallback
- [ ] if true
- [ ] if false
- [ ] loop
- [ ] nested loop
- [ ] loop + if
- [ ] nested children
- [ ] attrs defaults
- [ ] context binding
- [ ] datasource resolved data
- [ ] style
- [ ] flex
- [ ] grid
- [ ] responsive
- [ ] typography
- [ ] color scheme
- [ ] page custom CSS
- [ ] block assets
- [ ] asset deduplication
- [ ] unknown block
- [ ] invalid template

Execution:

```text
same fixture
   ├── Laravel Engine
   └── Golang Engine

compare:
- HTML
- assets
- diagnostics
```

Checklist:

- [ ] Exact HTML comparison.
- [ ] Exact asset comparison.
- [ ] Exact diagnostic comparison.
- [ ] Whitespace policy documented.
- [ ] Escaping policy documented.
- [ ] Numeric/string conversion documented.
- [ ] CI blocks merge when outputs differ.

---

# 20. Migration dari Struktur Saat Ini

## Phase A — Inventory

- [ ] Inventaris seluruh Laravel-specific file.
- [ ] Inventaris seluruh universal file.
- [ ] Inventaris seluruh Go renderer file.
- [ ] Inventaris editor source.
- [ ] Tandai dependency lintas boundary yang salah.

## Phase B — Move Editor

- [ ] Pindahkan React editor ke `editor/react`.
- [ ] Perbaiki Vite paths.
- [ ] Perbaiki test paths.
- [ ] Perbaiki build output path.
- [ ] Perbaiki Laravel adapter integration terhadap artifact editor.

## Phase C — Move Laravel

- [ ] Pindahkan package Laravel ke `engine/laravel`.
- [ ] Perbaiki composer autoload.
- [ ] Perbaiki service provider path.
- [ ] Perbaiki config/resource/view path.
- [ ] Pisahkan Blade compatibility dari portable renderer.

## Phase D — Move Go

- [ ] Pindahkan Go renderer ke `engine/golang`.
- [ ] Perbaiki module path.
- [ ] Perbaiki CLI build path.
- [ ] Perbaiki conformance fixture path.

## Phase E — Universal Root

- [ ] Pindahkan/rapikan `specification`.
- [ ] Pindahkan/rapikan `blocks`.
- [ ] Pindahkan conformance.
- [ ] Pastikan tidak ada source Laravel di root universal modules.

## Phase F — Remove Deprecated Engines

Untuk scope sekarang hanya Laravel dan Golang.

- [ ] Hapus Python renderer dari distribusi aktif.
- [ ] Hapus Rust renderer dari distribusi aktif.
- [ ] Hapus Node renderer dari distribusi aktif.
- [ ] Hapus config engine Python/Rust/Node.
- [ ] Hapus CI engine Python/Rust/Node.
- [ ] Hapus docs yang menyatakan engine aktif tersebut.
- [ ] Pertahankan specification extensible untuk engine masa depan.

---

# 21. CI Pipeline Final

## Specification job

- [ ] Validate JSON schemas.
- [ ] Validate all built-in block manifests.
- [ ] Validate portable templates.

## Editor job

- [ ] npm/bun install sesuai package manager yang dipilih.
- [ ] unit tests.
- [ ] build.
- [ ] verify artifacts.
- [ ] Playwright E2E.

## Laravel engine job

- [ ] composer validate.
- [ ] composer install.
- [ ] composer audit.
- [ ] PHPStan.
- [ ] Pint.
- [ ] PHPUnit.
- [ ] conformance Laravel.

## Golang engine job

- [ ] go mod verify.
- [ ] gofmt check.
- [ ] go vet.
- [ ] go test ./...
- [ ] conformance Go.
- [ ] build CLI.

## Cross-engine conformance job

- [ ] Run Laravel fixture output.
- [ ] Run Go fixture output.
- [ ] Compare exact results.
- [ ] Fail on difference.

## Package/release job

- [ ] Build React artifacts.
- [ ] Build Laravel Composer archive.
- [ ] Build Go binaries.
- [ ] Verify universal blocks included/distributed.
- [ ] Verify specifications included/distributed.
- [ ] Generate checksums.
- [ ] Upload CI artifacts.

---

# 22. Versioning

Gunakan semantic versioning.

Checklist:

- [ ] Root project version strategy.
- [ ] Specification version.
- [ ] Block manifest version.
- [ ] Renderer protocol version.
- [ ] Laravel engine version.
- [ ] Go engine version.
- [ ] React editor version.

Compatibility rule:

- [ ] Engine menyatakan supported specification versions.
- [ ] Editor menyatakan generated specification version.
- [ ] Unsupported version menghasilkan diagnostic jelas.

---

# 23. Release Distribution

Target release contoh:

```text
page-builder-v1.0.0/
├── editor-react.tar.gz
├── laravel-engine.zip
├── page-builder-render-linux-amd64
├── page-builder-render-linux-arm64
├── page-builder-render-darwin-amd64
├── page-builder-render-darwin-arm64
├── page-builder-render-windows-amd64.exe
├── universal-blocks.zip
├── specification.zip
└── checksums.txt
```

Checklist release:

- [ ] Tag release otomatis.
- [ ] Build dari clean checkout.
- [ ] No uncommitted source dependency.
- [ ] Artifacts relocatable.
- [ ] Node/Python absolute-path launcher issue tidak relevan karena engines tersebut tidak didistribusikan.
- [ ] Go binary smoke test setelah dipindahkan ke temporary directory.
- [ ] Laravel archive installation smoke test di clean Laravel fixture app.
- [ ] Universal block archive validation.
- [ ] Specification archive validation.
- [ ] SHA256 checksums.
- [ ] Release notes.

---

# 24. Laravel Distribution Test

Sebelum release:

- [ ] Buat clean Laravel application fixture.
- [ ] Install engine dari local Composer archive.
- [ ] Register engine package.
- [ ] Publish config jika diperlukan.
- [ ] Load built-in block.
- [ ] Render static page.
- [ ] Render nested page.
- [ ] Render Eloquent datasource.
- [ ] Render pagination.
- [ ] Verify CSS/JS assets.
- [ ] Verify editor integration.

---

# 25. Golang Distribution Test

Sebelum release:

- [ ] Copy binary ke directory baru tanpa source tree.
- [ ] Copy universal blocks/spec according to deployment contract.
- [ ] Run render request via stdin/file/API.
- [ ] Verify output JSON.
- [ ] Verify datasource config.
- [ ] Verify HTML.
- [ ] Verify assets.
- [ ] Verify diagnostics.
- [ ] Verify binary does not depend on Laravel files.

---

# 26. Documentation Wajib Sebelum Release

- [ ] `docs/architecture.md`
- [ ] `docs/page-json.md`
- [ ] `docs/block-authoring.md`
- [ ] `docs/template-language.md`
- [ ] `docs/datasource.md`
- [ ] `docs/layout.md`
- [ ] `docs/styles.md`
- [ ] `docs/color-schemes.md`
- [ ] `docs/typography.md`
- [ ] `docs/editor.md`
- [ ] `docs/engine-laravel.md`
- [ ] `docs/engine-golang.md`
- [ ] `docs/deployment-laravel.md`
- [ ] `docs/deployment-golang.md`
- [ ] `docs/custom-engine.md`
- [ ] `docs/migration.md`
- [ ] `docs/release.md`

---

# 27. Security Checklist

- [ ] HTML escaped by default.
- [ ] Raw output limited to approved fields such as `children`.
- [ ] Template cannot execute PHP.
- [ ] Template cannot execute shell commands.
- [ ] Template cannot execute arbitrary Go.
- [ ] Custom CSS strips dangerous style/script breakout sequences.
- [ ] Block path traversal protected.
- [ ] Asset path traversal protected.
- [ ] Manifest template filename validated.
- [ ] Datasource field whitelist.
- [ ] Datasource relation whitelist.
- [ ] Datasource limit cap.
- [ ] Query nesting cap.
- [ ] Process/CLI input size cap.
- [ ] Render recursion depth cap.
- [ ] Maximum block count configurable.
- [ ] Diagnostics do not leak credentials.
- [ ] Database credentials never stored in Page JSON.

---

# 28. Performance Checklist

React:

- [ ] Memoized selectors.
- [ ] Large tree performance test.
- [ ] History memory bounds.
- [ ] Avoid full tree rerender when editing one block.

Laravel:

- [ ] Block registry cache.
- [ ] Parsed template cache.
- [ ] Avoid N+1 datasource queries.
- [ ] Query limits.
- [ ] Compiled style cache where safe.

Golang:

- [ ] Block registry cache.
- [ ] Parsed template AST cache.
- [ ] Bounded concurrency.
- [ ] Database pool configuration.
- [ ] Benchmark representative pages.

Cross-engine:

- [ ] Benchmark 10 blocks.
- [ ] Benchmark 100 blocks.
- [ ] Benchmark 1,000 blocks.
- [ ] Benchmark nested layout.
- [ ] Benchmark datasource collection.

---

# 29. Observability dan Diagnostics

Canonical diagnostics object harus didefinisikan.

Checklist:

- [ ] severity
- [ ] code
- [ ] message
- [ ] blockId optional
- [ ] blockType optional
- [ ] path optional

Contoh codes:

- [ ] `unknown_block`
- [ ] `invalid_manifest`
- [ ] `template_parse_error`
- [ ] `binding_not_found`
- [ ] `datasource_error`
- [ ] `unsupported_spec_version`
- [ ] `invalid_page`

---

# 30. Backward Compatibility

Checklist:

- [ ] Define migration dari page JSON lama.
- [ ] Define migration block manifest lama.
- [ ] `template.blade.php` tetap optional untuk legacy Laravel blocks.
- [ ] Legacy block diberi diagnostic jika tidak portable ke Go.
- [ ] Sediakan command/report untuk mengecek portability seluruh blocks.

Target portability command:

```text
page-builder check:portability
```

Output harus dapat menunjukkan:

- [ ] portable di Laravel + Go
- [ ] Laravel-only legacy
- [ ] invalid manifest
- [ ] invalid template
- [ ] unsupported datasource

---

# 31. Final Acceptance Scenarios

## Scenario 1 — Static landing page

- [ ] Dibuat di React.
- [ ] JSON disimpan.
- [ ] Laravel render sukses.
- [ ] Go render sukses.
- [ ] Exact expected output sesuai conformance policy.

## Scenario 2 — Product list database

- [ ] React memilih resource `products`.
- [ ] React membuat where/order/limit.
- [ ] Page JSON tidak menyimpan Eloquent class.
- [ ] Laravel menerjemahkan resource ke Eloquent.
- [ ] Go menerjemahkan resource ke SQL adapter.
- [ ] Template block sama.
- [ ] Output schema data sama.

## Scenario 3 — Responsive grid

- [ ] Grid desktop 4 column.
- [ ] Tablet 2 column.
- [ ] Mobile 1 column.
- [ ] Laravel CSS sesuai.
- [ ] Go CSS sesuai.

## Scenario 4 — Interactive carousel

- [ ] Server HTML dari Laravel.
- [ ] Server HTML dari Go.
- [ ] frontend.js sama.
- [ ] Browser behavior sama.

## Scenario 5 — Custom third-party block

- [ ] Developer membuat folder block baru.
- [ ] Tidak rebuild Laravel engine.
- [ ] Tidak rebuild Go engine untuk template change.
- [ ] React registry membaca block.
- [ ] Laravel membaca block.
- [ ] Go membaca block.
- [ ] Block berfungsi di kedua engine.

---

# 32. Urutan Eksekusi yang Direkomendasikan

Checklist implementasi harus dikerjakan berurutan:

## Milestone 1 — Repository Boundary

- [ ] Refactor directory structure.
- [ ] Editor → `editor/react`.
- [ ] Laravel → `engine/laravel`.
- [ ] Go → `engine/golang`.
- [ ] Root `blocks/specification/conformance` universal.
- [ ] CI tetap hijau setelah move.

## Milestone 2 — Specification Freeze v1

- [ ] Page schema final.
- [ ] Block schema final.
- [ ] Datasource schema final.
- [ ] Renderer protocol final.
- [ ] Template language final.
- [ ] Truthiness/stringification final.

## Milestone 3 — Universal Block Runtime

- [ ] AST parser Laravel.
- [ ] AST parser Go.
- [ ] Nested conformance.
- [ ] Built-in blocks portable.

## Milestone 4 — Universal Style/Layout

- [ ] Laravel compiler parity.
- [ ] Go compiler parity.
- [ ] Responsive parity.
- [ ] Page setting parity.

## Milestone 5 — Universal Datasource

- [ ] Resource registry contract.
- [ ] Laravel Eloquent adapter.
- [ ] Go SQL adapter.
- [ ] Collection/relation/pagination tests.

## Milestone 6 — React Neutrality

- [ ] Remove engine-specific persisted fields.
- [ ] Resource query builder universal.
- [ ] Preview contract universal.
- [ ] Serialization tests.

## Milestone 7 — Distribution

- [ ] Composer Laravel package.
- [ ] Go cross-platform binaries.
- [ ] React production artifact.
- [ ] Universal blocks/spec package.

## Milestone 8 — Release Hardening

- [ ] Security suite.
- [ ] Performance suite.
- [ ] Clean-install tests.
- [ ] Relocatable artifacts.
- [ ] Full documentation.
- [ ] Release workflow.

## Milestone 9 — v1 Release

- [ ] All CI green.
- [ ] All conformance green.
- [ ] All acceptance scenarios green.
- [ ] Tag `v1.0.0`.
- [ ] Build artifacts.
- [ ] Publish release notes.
- [ ] Verify install from released artifacts.

---

# 33. Final Release Gate

Tidak boleh menyatakan selesai sebelum seluruh gate ini hijau:

- [ ] React editor production build sukses.
- [ ] React E2E sukses.
- [ ] Laravel static analysis sukses.
- [ ] Laravel formatting sukses.
- [ ] Laravel tests sukses.
- [ ] Laravel clean-install package test sukses.
- [ ] Go formatting sukses.
- [ ] Go vet sukses.
- [ ] Go tests sukses.
- [ ] Go binary standalone smoke test sukses.
- [ ] Laravel conformance sukses.
- [ ] Go conformance sukses.
- [ ] Cross-engine exact parity sukses.
- [ ] Semua built-in blocks valid.
- [ ] Semua built-in blocks portable.
- [ ] Universal schemas valid.
- [ ] Security checklist selesai.
- [ ] Distribution artifacts lengkap.
- [ ] Checksums tersedia.
- [ ] Dokumentasi lengkap.
- [ ] Release artifact diuji dari lokasi baru/clean environment.

Jika satu saja belum terpenuhi, project belum dianggap siap distribusi.

---

# 34. Scope v1

Engine aktif untuk v1:

- [ ] Laravel
- [ ] Golang

Engine yang **tidak masuk scope v1**:

- Python
- Rust
- Node.js
- Bun

Namun seluruh universal specification harus menjaga boundary sehingga engine baru nantinya dapat ditambahkan tanpa mengubah persisted page/block format secara breaking.

---

# 35. Target Akhir

```text
                 React Editor
                      │
                      ▼
              Universal Page JSON
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   Laravel Engine            Golang Engine
          │                       │
    Eloquent Adapter          SQL Adapter
          │                       │
          └───────────┬───────────┘
                      │
                      ▼
         Universal blocks + specification
                      │
                      ▼
             HTML + CSS + JS assets
```

Final architectural rule:

> **Editor satu, block satu, specification satu, engine banyak. Untuk v1 engine aktif hanya Laravel dan Golang.**
