# Block Manifest Reference

`block.json` is validated by `specification/block.schema.json`. A portable block directory contains `block.json`, `template.html`, and optional `style.css` / `frontend.js`.

The manifest declares a stable block `name`, human metadata, manifest version, attribute schemas and defaults, variations, child/slot support, layout/style support, and asset files. Attribute definitions are editor metadata and portable defaults; rendering semantics come from `template.html` and the universal rendering specification.

Official engines discover block directories at runtime. Adding a conforming block therefore requires no Laravel source change and no Go registration rebuild. Framework-specific templates are not part of the portable package and must never be required for conformance.
