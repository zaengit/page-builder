# Renderer adapters

This directory contains external host-language adapters for the universal renderer specification in `../specification`.

## Current official engines

- **Laravel** — implemented by the package runtime under `src/`.
- **Go** — standalone external renderer under `renderers/go/`.

Only Laravel and Go are part of the current support, CI, build, and release matrix.

Existing experimental source for other languages, when present in the repository history or development branches, is not an active engine and is not shipped as an official renderer artifact.

## Contract

Every renderer must consume the same canonical page document, portable block manifests, portable templates, and protocol. A host may use any framework/database internally, but host-specific behavior must remain behind its adapter.

```text
render(page, registry, context) -> {
  html,
  assets: { css: [], js: [] },
  diagnostics: []
}
```

No renderer may persist framework-specific expressions, model classes, or language-specific types in canonical page JSON.

## Adding a future engine

A future Rust, Node.js, Bun, Python, or other adapter must:

1. implement `specification/renderer-protocol.schema.json`;
2. consume `specification/page.schema.json` and `specification/block.schema.json` unchanged;
3. discover portable blocks dynamically from the block root;
4. pass the shared conformance fixtures;
5. receive CI/build/release integration before being called officially supported.

See `../docs/universal-editor-engine-distribution-plan.md` for the complete distribution rules.
