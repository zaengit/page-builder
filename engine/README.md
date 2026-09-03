# Rendering engines

`engine/` is the canonical home for officially supported page-builder rendering engines.

The universal contracts do not live inside an engine. They live in `../specification` and reusable portable blocks live in `../blocks`.

Current supported engines:

- `engine/laravel` — Laravel host adapter for the universal rendering contract.
- `engine/go` — standalone Go rendering engine implementing the same contract.

The React editor in `../editor` persists only language-agnostic Page JSON. Every engine consumes the same page document, block manifests, portable templates, datasource envelope, and renderer protocol.

`renderers/` is retained only as a legacy/experimental compatibility area and is not the canonical distribution boundary.
