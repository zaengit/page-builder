# Portable Custom Blocks

Create a directory under a configured block root containing `block.json` and `template.html`; add `style.css` and `frontend.js` only when needed. Validate the directory with `scripts/validate-block-packages.py` before distribution.

Use only the template language documented in `docs/template-language.md`. Do not require Blade, PHP, Go templates, React rendering, or framework service lookups in portable files. Dynamic values enter through JSON attributes, context bindings, or the neutral datasource contract.

Both official engines discover packages from the filesystem at runtime. A valid package therefore installs by copying/extracting the directory into a block root; no engine source edit, registration switch, or Go rebuild is required. CSS/JS assets are returned once per render in first-use order and may be served by the host from the block package.
