# Security Model

Portable templates are not arbitrary code. Interpolation is HTML escaped, array/object values are not implicitly serialized, and raw insertion is limited to renderer-owned nested `children`. CSS values are sanitized according to the rendering specification and custom CSS removes dangerous tag boundaries before insertion.

Block packages are trusted application extensions, not untrusted uploads. Hosts should validate manifests, constrain block roots, serve only declared assets, and apply normal supply-chain review to `frontend.js`. Datasource resource names and relation/filter columns must be allowlisted by the host; never accept persisted framework class names or raw SQL.

Renderer-process hosts must enforce input limits and timeouts, treat malformed output as a process error, and avoid returning stack traces in diagnostics. Media endpoints must validate file type, filename/path traversal, size, and configured storage roots. Normal framework CSRF/authentication policy remains the host application's responsibility.
