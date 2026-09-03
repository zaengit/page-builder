# Renderer adapters

The files in this directory define the host-language boundary for the universal renderer specification in `../specification`.

A renderer implementation must consume the same page document and block manifests. It may use any framework/database internally, but host-specific code must stay behind the adapter.

Expected implementations:

- `php-laravel`: built into `src/Blocks`, using the portable template renderer first and Blade only as a legacy fallback.
- `go`: implement the v1 rendering spec and translate database provider queries to the chosen Go SQL layer.
- `rust`: implement the v1 rendering spec and translate database provider queries to SQLx/Diesel/etc.
- `node`: implement the v1 rendering spec and translate database provider queries to Prisma/Drizzle/etc.
- `python`: implement the v1 rendering spec and translate database provider queries to SQLAlchemy/etc.

Every implementation exposes the same conceptual operation:

```text
render(page, registry, context) -> {
  html,
  assets: { css: [], js: [] },
  diagnostics: []
}
```

No implementation is allowed to persist framework-specific expressions in page JSON.
