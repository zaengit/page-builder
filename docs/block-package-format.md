# Block Package Format

A distributable block package is a ZIP or directory whose root contains exactly one block directory, or a collection directory containing multiple block directories. Each block directory requires `block.json` and `template.html`; `style.css` and `frontend.js` are optional. Extra framework executable files are not part of the portable contract.

Package validation checks JSON Schema conformance, manifest name uniqueness, required template presence, declared asset existence, path containment, UTF-8 text files, and absence of Blade-only templates as the sole rendering source. The repository validator is `scripts/validate-block-packages.py`.

Hosts install a package by extracting it under a configured block root. Laravel and Go registry loaders discover it at runtime. Assets are identified by portable relative paths and returned in deterministic first-use order with de-duplication. Hosts choose the public URL mapping; blocks do not persist host URLs into their manifest.
