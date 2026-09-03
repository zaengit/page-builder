# Rendering engines

`engine/` is the canonical home for all officially supported rendering engines.

The repository architecture is intentionally limited to these top-level concerns:

```text
editor/
specification/
blocks/
engine/
  laravel/
  go/
```

There is no separate runtime `core/` package. Shared behavior is defined normatively in `specification/`; each engine implements that contract inside its own engine directory.

- `engine/laravel` contains the complete Laravel engine implementation and Laravel-specific adapters.
- `engine/go` contains the complete standalone Go engine implementation.
- `blocks/` contains portable block packages consumed by both engines.
- `editor/` consumes the universal document/block contracts and communicates with engine hosts through engine-neutral APIs.
