# Universal rendering

The page builder stores one language-agnostic page document. The universal contract is independent from Laravel and Go; the current official engine support matrix contains **Laravel** and **Go** only.

## Architecture

```text
editor/          React visual editor
specification/   universal schemas, protocol, and conformance fixtures
blocks/          portable block packages
engine/
  laravel/       canonical Laravel engine adapter
  go/            standalone Go engine
src/             Laravel package integration and shared host services
```

`engine/` is the canonical engine boundary. Laravel is an engine/host adapter. It is not the owner of the persisted page format, portable block format, or renderer protocol.

## Portable block contract

Portable blocks use the same folder in every engine:

```text
blocks/<block>/
  block.json
  template.html
  style.css        # optional
  frontend.js      # optional
```

`template.html` supports escaped interpolation, fallback values, conditions, loops, and the raw `children` slot. Blade templates are Laravel compatibility templates only and are not part of the universal block contract.

Adding an ordinary portable block does not require adding source code to the Laravel engine or recompiling Go just to register the block. Engines discover blocks from the configured block root.

## Process protocol

The Go engine reads one JSON object from stdin and writes one JSON object to stdout.

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

The Laravel host resolves host-owned database bindings first and can add transient rendering context before invoking Go. Persisted page JSON remains independent of Laravel, Eloquent, and Go.

## Build the supported external engine

```bash
bash scripts/build-universal-renderers.sh
```

The build creates:

```text
dist/engine/page-builder-engine-go
```

## Laravel engine selection

Laravel is the default engine:

```env
PAGE_BUILDER_RENDERER=laravel
```

Legacy installations using `PAGE_BUILDER_RENDERER=php` are accepted as a compatibility alias for `laravel`, but `php` is not advertised as a separate engine.

Use Go:

```env
PAGE_BUILDER_RENDERER=go
PAGE_BUILDER_GO_BINARY=/absolute/path/page-builder-engine-go
```

The process driver bypasses the shell, enforces a timeout, captures stderr, validates JSON output, and returns the same `RenderResult` contract.

## Data ownership

Persisted pages refer to neutral resources such as `products`, `posts`, and `projects`. A host adapter maps those resource names to its own database layer. Laravel maps them to Eloquent models. A Go host may resolve data itself or receive already-resolved context.

`source: context` bindings are portable and can be resolved by either engine. Host-owned Laravel database bindings are resolved before invoking the Go process.

## Conformance

Laravel and Go consume the same portable specification and conformance fixtures. Compatibility covers escaped values and fallback interpolation, nested blocks, conditions and loops, context bindings, asset de-duplication, block style/layout envelopes, responsive CSS, slot/color-scheme metadata, and page-level tokens/typography/color schemes/custom CSS.

A renderer is compatible only when it passes the shared contract without changing the canonical page or block format.

## Support matrix

| Engine | Canonical source | Status | Distribution |
| --- | --- | --- | --- |
| Laravel | `engine/laravel` | Supported | Composer package |
| Go | `engine/go` | Supported | Standalone binary/source |
| Rust | future | Not active | None |
| Node.js | future | Not active | None |
| Python | future | Not active | None |
| Bun | future | Not active | None |

See `docs/universal-editor-engine-distribution-plan.md` for the architecture and release checklist.
