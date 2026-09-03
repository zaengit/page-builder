# Implementing a Third Engine

A new engine should be implementable without reading Laravel or Go source. Treat `specification/` as authoritative.

1. Validate `page.schema.json`, `block.schema.json`, `datasource.schema.json`, and `renderer-protocol.schema.json`.
2. Implement template language v1 exactly as defined by `rendering-spec.md`.
3. Implement deterministic style, flex/grid/layoutItem, responsive, design-token, color-scheme, typography, custom-CSS, slot, and asset semantics.
4. Discover portable block directories at runtime; do not compile a fixed block registry into the engine.
5. Keep datasource implementation behind a host adapter that consumes neutral requests.
6. Emit stable diagnostics rather than framework exceptions.
7. Run every fixture in `specification/conformance/` and require exact HTML/assets/diagnostic parity.
8. Declare supported specification, protocol, block-manifest, datasource, and template-language versions.

If a rule is ambiguous, fix the specification and add a conformance fixture first; do not infer behavior from another engine implementation.
