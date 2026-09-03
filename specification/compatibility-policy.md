# Page Builder Specification Compatibility Policy

The universal contract is versioned independently from any rendering engine or editor release.

## Canonical versions

`specification/version.json` is the machine-readable source of truth for the current specification, page document, block manifest, datasource contract, renderer process protocol, and template language versions.

Every official engine and editor distribution must declare which specification versions it supports. A release is conforming only when its declared versions include the values in `specification/version.json` and its conformance suite passes.

## Compatibility rules

- A document with an unsupported major `version` must be rejected with a structured diagnostic rather than silently rewritten.
- Additive optional fields may be introduced within a compatible specification revision only when older conforming engines can safely ignore them or capability negotiation explicitly gates them.
- Removing fields, changing field meaning, changing template truthiness, changing escaping semantics, or changing serialized layout/style output requires a new incompatible contract version.
- Persisted Page JSON must never contain engine implementation details such as PHP class names, Eloquent models, Blade templates, Go types, executable code, or engine-private preprocessing fields.
- Runtime context, datasource credentials, database adapters, media adapters, and host URLs are host concerns and must not be persisted in Page JSON.
- The editor must write one canonical page document that can be sent unchanged to any compatible engine.

## Renderer protocol

Renderer protocol version `1` accepts the canonical page document and either a block registry or a block root. Unsupported protocol versions must produce a stable error diagnostic and must not be treated as the latest version automatically.

## Template language

Template language version `1` supports escaped interpolation, null/missing fallback, conditions, loops, and the renderer-generated raw `children` slot. Ordinary data is always escaped. Any future raw-data syntax requires a new incompatible template-language version.

## Breakpoints

Version `1` defines exactly three persisted responsive keys: `desktop`, `tablet`, and `mobile`. Engines may choose host-specific media-query values, but the canonical serialization order is desktop base output followed by tablet and mobile overrides as defined by the rendering specification.

## Conformance requirement

`specification/conformance/` is normative. A contract behavior is not considered implemented across official engines until the shared fixture exists and every official engine passes it in CI.
