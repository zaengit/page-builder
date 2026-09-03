# Zaengit Page Builder

Universal block-based page builder with a React visual editor, portable block packages, a versioned rendering specification, and independently distributable Laravel and Go engines.

The repository is intentionally not a CMS. Host applications own authentication, authorization, persistence, publishing, domain models, tenancy, and infrastructure. The page builder owns the portable page/block format, authoring UI, rendering semantics, and conformance contract.

## Canonical repository layout

```text
editor/          React visual editor and engine-neutral host adapter API
specification/   Page/block/datasource/protocol schemas and shared conformance
blocks/          portable block packages
engine/
  laravel/       independent Laravel engine/package
  go/            independent Go engine/library/CLI
scripts/         distribution and validation tooling
docs/            architecture, integration, compatibility, and security docs
```

There is no top-level Laravel application, shared runtime core, or framework-owned renderer. `specification/` is authoritative; every engine consumes it.

## Portable blocks

```text
blocks/testimonial/
  block.json
  template.html
  style.css       # optional
  frontend.js     # optional
```

Portable blocks are runtime-discovered by both official engines. Adding a conforming block does not require editing Laravel engine source or rebuilding Go merely to register the block. Validate packages with:

```bash
python scripts/validate-block-packages.py
```

## Canonical Page JSON

Persisted documents use version 1 and contain no engine-specific model/class/runtime details:

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

The same document can be rendered by Laravel or Go. Hosts map neutral datasource resources such as `products`, `posts`, and `projects` to their own database implementation.

## React editor

`editor/` is an independently buildable package. It exports `mountPageBuilder`, `EditorApp`, `EditorHostAdapter`, `createHttpHostAdapter`, and `createStandaloneHostAdapter`. The adapter boundary allows the same authoring UI to work with Laravel, Go, or another conforming renderer.

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

`engine/laravel/` is a standalone Composer package with its own source, config, routes, resources, static analysis, and tests. It can render directly and can also host an external renderer process through renderer protocol v1. Database resource names are mapped to Eloquent models only in Laravel host configuration; Eloquent classes are never persisted in Page JSON.

```bash
cd engine/laravel
composer install
vendor/bin/phpstan analyse --memory-limit=1G
vendor/bin/pint --test src tests routes config
vendor/bin/phpunit
```

## Go engine

`engine/go/` is a standalone Go module and public library. Its CLI `cmd/page-builder-render` implements renderer protocol v1 over stdin/stdout, and `DatasourceAdapter` allows host-specific SQL/ORM/HTTP integrations.

```bash
cd engine/go
go test ./...
```

Build the default standalone artifact with:

```bash
bash scripts/build-engines.sh
```

Release workflow builds Linux, macOS, and Windows binaries for amd64 and arm64.

## Specification and conformance

The canonical contract is versioned in `specification/version.json` and includes:

- `page.schema.json`
- `block.schema.json`
- `datasource.schema.json`
- `renderer-protocol.schema.json`
- `rendering-spec.md`
- `conformance/`

Laravel and Go execute the same shared conformance fixtures. Exact HTML, asset ordering/de-duplication, responsive/layout behavior, template semantics, design tokens, typography, datasource behavior, and structured diagnostics are tested against one expected corpus.

## Distribution

Release artifacts are independent:

```text
page-builder-editor-<version>.zip
page-builder-specification-<version>.zip
page-builder-blocks-<version>.zip
page-builder-engine-laravel-<version>.zip
page-builder-engine-go-<os>-<arch>-<version>[.exe]
page-builder-engine-go-source-<version>.zip
manifest.json
SHA256SUMS
```

No artifact needs a Laravel application skeleton at repository root.

## Documentation

Start with `docs/architecture.md`. Contract references are in `docs/page-json.md`, `docs/block-manifest.md`, `docs/template-language.md`, `docs/datasource-reference.md`, and `docs/renderer-protocol.md`. Engine and integration guides are in `docs/laravel-engine.md`, `docs/go-engine.md`, `docs/editor-integration.md`, `docs/portable-blocks.md`, and `docs/third-engine.md`. Compatibility, migration, conformance authoring, package format, and security policies are documented under `docs/` as well.

The full completion/release checklist is `docs/universal-editor-engine-distribution-plan.md`.
