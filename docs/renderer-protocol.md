# Renderer Protocol Reference

The process contract is `specification/renderer-protocol.schema.json`, protocol version 1. Requests contain `version`, canonical `page`, optional runtime `context`, and exactly one registry source: `blockRoot` or an inline `registry`.

Results contain rendered `html`, de-duplicated `assets.css` / `assets.js`, and structured `diagnostics`. Diagnostics always use stable `code`, `severity`, `path`, and `message` fields. Engines may also report protocol `version` and a boolean `capabilities` object.

Stable protocol failures include `unsupported_protocol_version`, `protocol_invalid_request`, `block_registry_error`, `render_error`, and `render_timeout`. A process host should treat malformed stdout or premature exit as `renderer_process_error` and must not expose implementation stack traces as Page JSON.

Capability negotiation is additive in protocol v1. Hosts must ignore unknown capabilities and must not require an optional capability unless they explicitly check it first. Breaking request/result changes require a new protocol version.
