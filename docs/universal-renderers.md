# Universal renderers

The page builder stores one language-agnostic page document. Rendering can be performed by PHP/Laravel, Go, Rust, Node.js, or Python without changing the persisted page JSON.

## Portable block contract

Portable blocks use the same folder in every engine:

```text
blocks/<block>/
  block.json
  template.html
  style.css        # optional
  frontend.js      # optional
```

`template.html` supports escaped interpolation, fallback values, conditions, loops, and the raw `children` slot. Laravel Blade remains a compatibility fallback only.

## Process protocol

External renderers read one JSON object from stdin and write one JSON object to stdout.

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
  "assets": { "css": [], "js": [] },
  "diagnostics": []
}
```

The Laravel host resolves host-owned database bindings first and adds transient `_render` and `_pageRender` envelopes. Persisted page JSON remains independent of Laravel, Eloquent, Go, Rust, Node, and Python.

## Build all external engines

```bash
bash scripts/build-universal-renderers.sh
```

Artifacts are written to `dist/renderers/`:

- `page-builder-render-go`
- `page-builder-render-rust`
- `page-builder-render-node`
- `page-builder-render-python`

## Laravel engine selection

The default remains PHP:

```env
PAGE_BUILDER_RENDERER=php
```

Use Go:

```env
PAGE_BUILDER_RENDERER=go
PAGE_BUILDER_GO_BINARY=/absolute/path/page-builder-render-go
```

Use Rust:

```env
PAGE_BUILDER_RENDERER=rust
PAGE_BUILDER_RUST_BINARY=/absolute/path/page-builder-render-rust
```

Use Node.js:

```env
PAGE_BUILDER_RENDERER=node
```

Use Python:

```env
PAGE_BUILDER_RENDERER=python
```

Commands can also be overridden in `config/page-builder.php`. The process driver bypasses the shell, enforces a timeout, captures stderr, validates JSON output, and returns the same `RenderResult` contract for every engine.

## Data ownership

Persisted pages refer to neutral resources such as `products`, `posts`, and `projects`. A host adapter maps those resource names to its own database layer. Laravel maps them to Eloquent models; another host may use SQLx, Prisma, SQLAlchemy, or a custom repository.

`source: context` bindings are portable and can be resolved in every renderer. Host-owned providers such as Laravel database bindings are resolved before invoking an external renderer.

## Conformance

All five runtimes consume `specification/conformance/portable-runtime.json`. CI compares exact HTML, assets, and diagnostics and covers:

- escaped values and fallback interpolation
- nested blocks
- conditions and loops
- context bindings
- asset de-duplication
- block style/layout envelopes
- responsive CSS
- slot and color-scheme metadata
- page-level tokens, typography, color schemes, and custom CSS

A renderer is considered compatible only when this fixture passes unchanged.
