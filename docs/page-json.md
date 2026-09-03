# Page JSON Reference

The authoritative schema is `specification/page.schema.json`. Persisted documents use `version: 1` and contain `blocks` plus optional page `settings`.

Each block has a neutral `id`, portable `type`, JSON `attrs`, optional `children`, `slot`, `styles`, `layout`, `layoutItem`, `bindings`, `lock`, and `colorSchemeId`. Engine-private fields are forbidden. In particular, Page JSON must not persist Eloquent classes, service-container identifiers, Go types, pre-rendered HTML, or engine-specific transient structures.

Responsive values use the canonical keys `desktop`, `tablet`, and `mobile`. Layout supports block, flex, and grid containers and neutral child placement metadata. Settings may define content width, background, custom class/CSS, design tokens, typography, color schemes, and the default scheme.

The same document is valid input to every conforming engine; changing the rendering engine never requires rewriting a version-1 document.
