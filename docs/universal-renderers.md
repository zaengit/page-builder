# Universal Engines

The page builder stores one language-agnostic Page JSON document. The universal contract is owned by `specification/`; official rendering implementations live only under `engine/`.

```text
editor/          React visual editor
specification/   schemas, rendering semantics, protocol, and conformance
blocks/          portable block packages
engine/
  laravel/       Laravel engine and host integration
  go/            standalone Go engine and library
```

Portable blocks use `block.json`, `template.html`, and optional `style.css` / `frontend.js`. Engines discover them at runtime from a block root. No portable block needs an engine source registration change.

The Laravel engine can render directly or act as a host for a renderer-protocol process. The Go CLI implements protocol v1 over stdin/stdout. Persisted pages always use neutral resource names and never store Laravel/Eloquent or Go implementation details.

Build the standalone engine artifact with:

```bash
bash scripts/build-engines.sh
```

Laravel and Go consume the same shared conformance corpus. A third engine is supported only when it implements `specification/` and passes those fixtures unchanged.

See `docs/architecture.md`, `docs/renderer-protocol.md`, `docs/portable-blocks.md`, and `docs/third-engine.md` for the current contracts.
