# Zaengit Page Builder

Universal block-based page builder with a React visual editor, portable block packages, a versioned rendering specification, an independently distributable Laravel rendering package, and a standalone Go CMS.

The universal contracts remain engine-neutral: `specification/`, `blocks/`, and `editor/` do not depend on Laravel or Go. The Laravel implementation remains an embeddable rendering package. The Go implementation additionally owns the complete CMS runtime: persistence, publishing, media, datasources, settings, HTTP APIs, preview rendering, and published frontend delivery.

## Repository layout

```text
editor/          React visual editor and engine-neutral host adapter API
specification/   Page/block/datasource/protocol schemas and shared conformance
blocks/          portable block packages
engine/
  laravel/       independent Laravel rendering engine/package
  go/            standalone Go CMS + renderer compatibility executable
scripts/         distribution and validation tooling
docs/            architecture, integration, compatibility, security, and operations docs
```

`specification/` is authoritative for universal page, block, datasource, and rendering semantics. Persisted Page JSON never contains framework-specific model or class names.

## Portable blocks

```text
blocks/testimonial/
  block.json
  template.html
  style.css       # optional
  frontend.js     # optional
```

Portable blocks are runtime-discovered. Adding a conforming block does not require source registration in either official implementation. Validate packages with:

```bash
python scripts/validate-block-packages.py
```

## Canonical Page JSON

```json
{
  "version": 1,
  "settings": {
    "contentWidth": "1200px",
    "tokens": { "brand": "#2563eb" }
  },
  "blocks": [
    {
      "id": "hero-title",
      "type": "core/heading",
      "version": 1,
      "attrs": { "text": "Hello" },
      "bindings": {
        "text": {
          "source": "database",
          "resource": "products",
          "path": "name",
          "fallback": "Hello"
        }
      }
    }
  ]
}
```

The same universal document can be rendered by Laravel or by the Go CMS renderer.

## React editor

`editor/` is independently buildable and exports `mountPageBuilder`, `EditorApp`, `EditorHostAdapter`, `createHttpHostAdapter`, and `createStandaloneHostAdapter`. The HTTP adapter accepts both direct responses and the Go CMS `{ "data": ... }` envelope.

```ts
const host = createStandaloneHostAdapter({
  blocks,
  renderPage: (page, context) => renderer.render(page, context),
});

await mountPageBuilder(element, {
  host,
  initial: { version: 1, blocks: [] },
});
```

See `editor/README.md` and `docs/editor-integration.md`.

## Laravel engine

`engine/laravel/` remains a standalone Composer rendering package. It can render directly or host an external renderer process through renderer protocol v1. Host-specific Eloquent mappings are configuration only and are never persisted in canonical Page JSON.

```bash
cd engine/laravel
composer install
vendor/bin/phpstan analyse --memory-limit=1G
vendor/bin/pint --test src tests routes config
vendor/bin/phpunit
```

## Go full CMS

`engine/go/` builds a standalone HTTP CMS executable at `cmd/cms`. The default database is SQLite. Persistence uses GORM and also supports PostgreSQL, MySQL/MariaDB, and SQL Server. The compatibility command `cmd/page-builder-render` remains available for renderer-protocol conformance and process integration.

```bash
cd engine/go
go test ./...
go run ./cmd/cms
```

Default startup uses:

```text
HTTP_ADDR=:8080
DB_DRIVER=sqlite
DB_DSN=page-builder.db
STORAGE_PATH=storage
PUBLIC_STORAGE_PATH=/media
```

The Go CMS provides health/readiness probes, page CRUD and publish/unpublish, dynamic portable blocks, media management, safe datasource registration/querying, global settings, page/block preview rendering, and published frontend routes. See `docs/go-engine.md` and `docs/go-full-cms-plan.md`.

Build both Go executables with:

```bash
bash scripts/build-engines.sh
```

This produces `dist/engine/page-builder-cms-go` and `dist/engine/page-builder-renderer-go`.

## Specification and conformance

Canonical versions are declared in `specification/version.json`. Shared fixtures cover exact rendering, assets, responsive/layout behavior, template semantics, design tokens, typography, datasource behavior, and structured diagnostics. Laravel and Go both consume the shared corpus.

## Distribution

Release artifacts are independent:

```text
page-builder-editor-v<version>.zip
page-builder-specification-v<version>.zip
page-builder-blocks-v<version>.zip
page-builder-engine-laravel-v<version>.zip
page-builder-cms-go-<os>-<arch>-v<version>[.exe]
page-builder-renderer-go-<os>-<arch>-v<version>[.exe]
page-builder-go-cms-source-v<version>.zip
manifest.json
SHA256SUMS
```

The Go release binaries are built for Linux, macOS, and Windows on amd64 and arm64 with no CGO requirement for the default SQLite runtime.

## Documentation

Start with `docs/architecture.md`. Universal contracts are documented in `docs/page-json.md`, `docs/block-manifest.md`, `docs/template-language.md`, `docs/datasource-reference.md`, and `docs/renderer-protocol.md`. Implementation guides are in `docs/laravel-engine.md`, `docs/go-engine.md`, `docs/editor-integration.md`, `docs/portable-blocks.md`, and `docs/third-engine.md`.

The universal distribution checklist is `docs/universal-editor-engine-distribution-plan.md`; the Go full-CMS implementation checklist is `docs/go-full-cms-plan.md`.
