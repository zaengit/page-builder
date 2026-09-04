# Go Full CMS Implementation Plan

> **Status: COMPLETE — PRODUCTION BASELINE READY**
>
> This plan applies only to `engine/go/`. Laravel remains an independently distributable rendering engine/package. The Go implementation is a standalone HTTP CMS that consumes the same universal `specification/` and portable `blocks/` contracts.
>
> Production acceptance evidence: GitHub Actions CI run **33827190949** completed successfully for commit `2af64af8d87be523c13c4295e8726a6fc4ce494f`, including Go verification/build/SQLite smoke, specification validation, Laravel verification, editor Browser E2E, cross-engine conformance parity, and distribution-boundary checks.

## 1. Production Architecture

```text
engine/go/
├── cmd/
│   ├── cms/                     standalone HTTP CMS
│   └── page-builder-render/     renderer-protocol compatibility command
├── internal/
│   ├── page/{handler,model,repository,service}
│   ├── media/{handler,model,repository,service}
│   ├── datasource/{handler,model,repository,service}
│   ├── block/{handler,model,repository,service}
│   ├── setting/{handler,model,repository,service}
│   ├── render/{handler,model,repository,service}
│   ├── config/
│   ├── database/
│   ├── middleware/
│   ├── router/
│   └── pkg/response/
├── datasource.go
├── renderer.go
├── registry.go
├── validation.go
├── template_validate.go
├── version.go
├── go.mod
└── go.sum
```

- [x] Go is distributed as a standalone CMS executable.
- [x] `cmd/cms/main.go` is bootstrap/wiring only.
- [x] Business features are feature-first under `internal/<feature>/`.
- [x] No `internal/domain/` wrapper is used.
- [x] HTTP handlers call feature services rather than performing persistence directly.
- [x] GORM repositories own SQL persistence.
- [x] A single shared `*gorm.DB` is injected into persistence features.
- [x] Cross-cutting concerns live in config/database/middleware/router/pkg.
- [x] Universal renderer behavior remains specification/block compatible.
- [x] Persisted page content contains no Laravel/framework-specific runtime fields.

Concrete repositories are intentionally kept internal where an interface would add no production boundary. The extensible data boundary is the public `DatasourceAdapter`; custom adapters can target another ORM, API, service, or relation model without changing Page JSON.

## 2. Runtime

```text
HTTP → router → middleware → handler → service → repository → GORM → SQL database
```

Rendering uses:

```text
HTTP → render service → universal renderer → portable registry → HTML/CSS/JS
```

- [x] HTTP is the primary production runtime.
- [x] Startup validates configuration and database connectivity.
- [x] SIGINT/SIGTERM graceful shutdown is implemented.
- [x] HTTP server read/header/write/idle/shutdown timeouts are configured.
- [x] Per-request timeout middleware is configured.
- [x] Renderer protocol compatibility is retained separately.
- [x] `--version` reports embedded runtime/specification metadata.

## 3. GORM Database Layer

Supported drivers:

- [x] SQLite, default and CGO-free.
- [x] PostgreSQL.
- [x] MySQL/MariaDB.
- [x] SQL Server.

Production database behavior:

- [x] Driver selected through `DB_DRIVER`.
- [x] DSN selected through `DB_DSN`.
- [x] SQLite works without an external database service.
- [x] GORM logger changes by environment.
- [x] Context is propagated with `WithContext`.
- [x] Transaction helper is available.
- [x] `PingContext` readiness checks are available.
- [x] Database handles close gracefully.
- [x] Max open connections are configurable.
- [x] Max idle connections are configurable.
- [x] Connection maximum lifetime is configurable.
- [x] Database credentials are not emitted by application logs.

Environment controls include:

```text
DB_DRIVER=sqlite
DB_DSN=page-builder.db
DB_MAX_OPEN_CONNS=50
DB_MAX_IDLE_CONNS=10
DB_CONN_MAX_LIFETIME_MS=3600000
DB_MIGRATE_ON_START=true
```

## 4. Versioned Migrations

- [x] `schema_migrations` persists applied schema versions.
- [x] Migrations execute in order.
- [x] Migration application is transactional.
- [x] Initial pages/media/datasources/settings schema is versioned.
- [x] Migration state lives in the selected database.
- [x] SQLite migration/bootstrap is exercised by CI and integration tests.

The migration runner may use GORM schema primitives inside an explicit numbered migration. Production evolution is controlled by the numbered migration list rather than by invoking unconstrained `AutoMigrate` from feature code.

## 5. Configuration

- [x] Environment and HTTP address.
- [x] Database driver/DSN and pool settings.
- [x] Storage path and public media path.
- [x] Portable block root.
- [x] Upload size limits.
- [x] Renderer timeout.
- [x] Request/read/write/idle/shutdown timeouts.
- [x] CORS allow-list.
- [x] Migration-on-start switch.
- [x] Startup validation and production defaults.
- [x] Configuration tests cover production defaults and invalid values.

Trusted-proxy behavior is intentionally not inferred. Deployments should terminate forwarding at a trusted reverse proxy and only add proxy-derived client identity when the deployment explicitly requires it.

## 6. Page Lifecycle

- [x] GORM page model with ID/title/slug/status/content/timestamps/revision.
- [x] Canonical Page JSON is validated before persistence.
- [x] Create/read/update/delete.
- [x] List pagination/filter/search/order.
- [x] Find by ID and slug.
- [x] Unique slug enforcement in service/database behavior.
- [x] Draft lifecycle.
- [x] Publish/unpublish lifecycle.
- [x] Duplicate page.
- [x] Published timestamp and revision increments.
- [x] Persisted content remains framework neutral.

Endpoints:

- [x] `GET /api/pages`
- [x] `POST /api/pages`
- [x] `GET /api/pages/{id}`
- [x] `PUT /api/pages/{id}`
- [x] `PATCH /api/pages/{id}`
- [x] `DELETE /api/pages/{id}`
- [x] `POST /api/pages/{id}/duplicate`
- [x] `POST /api/pages/{id}/publish`
- [x] `POST /api/pages/{id}/unpublish`

## 7. Media

- [x] GORM metadata model/repository.
- [x] Upload/list/read/delete lifecycle.
- [x] Configurable upload limit.
- [x] Extension and detected-content MIME validation.
- [x] Executable/unsupported uploads rejected.
- [x] SVG excluded from the built-in local upload policy.
- [x] Collision-safe generated filenames.
- [x] Original filenames are reduced to safe base names.
- [x] Local storage directories/files use restrictive permissions.
- [x] Path traversal is prevented.
- [x] Public URLs are generated independently from filesystem paths.
- [x] Storage paths are not exposed in API errors.

The local filesystem is the built-in production storage implementation. Media persistence is isolated behind the media service so a deployment-specific object-storage implementation can be introduced without changing Page JSON or the editor contract.

Endpoints:

- [x] `GET /api/media`
- [x] `POST /api/media`
- [x] `GET /api/media/{id}`
- [x] `DELETE /api/media/{id}`

## 8. Datasources

- [x] GORM-backed datasource definition registry.
- [x] Resource/table/column identifiers are allow-listed and validated.
- [x] No arbitrary SQL endpoint is exposed.
- [x] Values use parameter binding.
- [x] Single-record resolution.
- [x] Collection resolution.
- [x] Canonical filters including equality/range/LIKE/IN/NULL variants.
- [x] Multi-column canonical ordering.
- [x] Limit/offset.
- [x] Page/per-page pagination metadata.
- [x] Current-record resolution through `contextKey`.
- [x] Nested runtime binding paths.
- [x] Renderer fallback values remain canonical renderer behavior.
- [x] `DatasourceAdapter` is wired into the standalone CMS renderer.
- [x] Canonical datasource HTTP requests are accepted.
- [x] Legacy CMS query request remains supported for compatibility.
- [x] Metadata endpoint is available to the editor.
- [x] Invalid datasource requests do not expose SQL/filesystem internals.

`with`/relation semantics are adapter-owned because generic SQL tables do not contain portable relationship metadata. The built-in GORM adapter fails closed when an unconfigured include is requested; deployments that expose relations implement them through `DatasourceAdapter` while retaining the canonical `with` contract.

Endpoints:

- [x] `GET /api/datasources`
- [x] `PUT /api/datasources/{name}`
- [x] `POST /api/datasources/query`
- [x] `GET /api/datasources/{resource}/metadata`

## 9. Portable Blocks

- [x] Runtime directory discovery.
- [x] `block.json` loading and validation.
- [x] `template.html` loading and template validation.
- [x] CSS/JS asset discovery.
- [x] Installed block listing and lookup.
- [x] New portable block packages are discovered without rebuilding the CMS.
- [x] Invalid packages fail through registry validation/diagnostics.
- [x] Block root traversal is prevented by registry loading rules.

Endpoints:

- [x] `GET /api/blocks`
- [x] `GET /api/blocks/{type}`

## 10. Settings

- [x] GORM settings persistence.
- [x] Neutral JSON document storage.
- [x] JSON validation before persistence.
- [x] Global color schemes can be persisted.
- [x] Global typography can be persisted.
- [x] Design tokens can be persisted.
- [x] Site/base/default page configuration can be persisted without framework coupling.
- [x] Stored malformed JSON fails closed.
- [x] Internal database errors are hidden from HTTP clients.

Endpoints:

- [x] `GET /api/settings`
- [x] `PUT /api/settings`

## 11. Rendering

- [x] Unsaved page preview.
- [x] Single-block preview.
- [x] Published page render by slug.
- [x] Persisted pages are available by ID through page APIs and can be previewed without format conversion.
- [x] Registry comes from portable block service.
- [x] Page/template validation.
- [x] Structured renderer diagnostics.
- [x] CSS/JS asset de-duplication.
- [x] Responsive/layout/design-token behavior remains shared-conformance compatible.
- [x] Database datasource provider is connected to the renderer.
- [x] Public frontend only resolves published pages.
- [x] Render API internal errors are sanitized.

Endpoints:

- [x] `POST /api/render/page`
- [x] `POST /api/render/block`
- [x] `GET /{slug}`

## 12. HTTP Hardening

- [x] Panic recovery.
- [x] Request IDs generated with cryptographic randomness when absent.
- [x] Request ID propagated into logs and response headers.
- [x] Structured request logging with status/duration.
- [x] CORS allow-list.
- [x] Security headers.
- [x] Body-size limits.
- [x] API Content-Type validation.
- [x] Per-request timeout.
- [x] Server read/header/write/idle timeout.
- [x] Generic client-facing internal errors.
- [x] Detailed failures remain server-side logs.
- [x] Middleware contains no CMS business rules.

## 13. Router and Health

- [x] `GET /health` liveness.
- [x] `GET /ready` database readiness.
- [x] Page routes.
- [x] Media routes.
- [x] Datasource routes.
- [x] Block routes.
- [x] Setting routes.
- [x] Render routes.
- [x] Published frontend route.
- [x] Static media route.
- [x] Router contains wiring/routing only.

## 14. Editor Integration

The top-level React editor remains engine-neutral through `EditorHostAdapter`.

- [x] HTTP adapter accepts both plain engine responses and Go CMS `{data: ...}` envelopes.
- [x] Block list contract works with Go CMS.
- [x] Page render payload uses the Go/Laravel-neutral `{page, context}` shape.
- [x] Page preview works without Laravel-specific endpoints.
- [x] Block preview works without Laravel-specific endpoints.
- [x] Datasource metadata contract is engine-neutral.
- [x] Media list/upload/delete contract is engine-neutral.
- [x] Editor package Browser E2E remains green.
- [x] Go HTTP integration tests exercise the same API boundary used by the editor.

## 15. Security Acceptance

- [x] Every persisted Page document is canonical-validated.
- [x] SQL values are parameterized.
- [x] HTTP clients cannot provide arbitrary table/column syntax.
- [x] Upload traversal and executable uploads are blocked.
- [x] Portable template language cannot execute arbitrary Go code.
- [x] Custom CSS/style sanitization remains enforced by renderer rules.
- [x] Request body limits and timeouts are enforced.
- [x] Panic stacks remain server-side.
- [x] Filesystem/database internals are not returned by hardened handlers.
- [x] Database credentials are not deliberately logged.

Authentication, authorization, tenancy, TLS termination, rate limiting, WAF policy, and secret management remain deployment/host concerns; the project intentionally does not invent an authentication product inside the page-builder CMS runtime.

## 16. Tests

- [x] Renderer/conformance unit tests.
- [x] Page lifecycle tests.
- [x] Media safety tests.
- [x] Datasource registration/query tests.
- [x] Canonical datasource single/current-context tests.
- [x] Canonical datasource collection/filter/order/pagination tests.
- [x] Datasource allow-list rejection tests.
- [x] Config validation tests.
- [x] Middleware request-ID/security/content-type/timeout tests.
- [x] HTTP CMS page lifecycle integration test.
- [x] HTTP preview/frontend integration test.
- [x] SQLite bootstrap/migration tests.
- [x] Standalone binary SQLite smoke test in CI.
- [x] Cross-engine conformance parity.
- [x] Editor unit tests and Browser E2E.

PostgreSQL/MySQL/SQL Server dialectors are compiled and kept behind the same GORM repositories. Live external-database CI is infrastructure-conditional; SQLite remains the mandatory zero-service integration gate.

## 17. CI and Distribution

- [x] `gofmt` enforced with useful unformatted-file output.
- [x] `go mod verify` passes.
- [x] `go vet ./...` passes.
- [x] `go test ./...` passes.
- [x] Standalone CMS and renderer commands build independently.
- [x] SQLite binary smoke test is mandatory.
- [x] Linux amd64/arm64 release binaries.
- [x] macOS amd64/arm64 release binaries.
- [x] Windows amd64/arm64 release binaries.
- [x] Version metadata is embedded at build time.
- [x] Release manifest and SHA-256 checksums.
- [x] Specification, blocks, editor, Laravel engine, Go CMS source/binaries are independently packageable.
- [x] Release workflow labels Go as standalone CMS plus protocol renderer.

## 18. Documentation

- [x] Go CMS architecture/runtime guide.
- [x] Database configuration reference.
- [x] SQLite default setup.
- [x] PostgreSQL example.
- [x] MySQL/MariaDB example.
- [x] SQL Server example.
- [x] Migration/production operations guidance.
- [x] API endpoint overview.
- [x] Portable block integration documentation.
- [x] Datasource contract/integration documentation.
- [x] Media behavior/security documentation.
- [x] Editor integration documentation.
- [x] Production deployment documentation.

Primary references: `docs/go-engine.md`, `docs/production.md`, `docs/editor-integration.md`, `docs/datasource-reference.md`, `docs/portable-blocks.md`, `docs/security-model.md`, and the canonical schemas under `specification/`.

## 19. Definition of Done

```text
React editor
     │
     ▼
Go standalone CMS
     │
     ├── page
     ├── media
     ├── datasource
     ├── block
     ├── setting
     └── render
             │
             ├── GORM
             │    ├── SQLite (default)
             │    ├── PostgreSQL
             │    ├── MySQL/MariaDB
             │    └── SQL Server
             │
             ▼
     universal specification
             +
        portable blocks
```

- [x] Go runs as a standalone HTTP CMS executable.
- [x] Feature-first structure is in place.
- [x] GORM is the persistence layer.
- [x] SQLite is the zero-configuration database.
- [x] SQL driver changes require configuration, not feature repository rewrites.
- [x] PostgreSQL/MySQL/MariaDB/SQL Server dialectors are supported.
- [x] Page/media/datasource/settings/block/render features operate end-to-end.
- [x] React editor integration is Laravel-independent.
- [x] Universal rendering conformance is green.
- [x] CI proves SQLite operation, Go quality gates, editor compatibility, Laravel compatibility, and distribution boundaries.
- [x] Release workflow produces standalone Go CMS binaries.

The implementation is therefore considered **production-ready as a page-builder CMS runtime baseline**. Production operators still own environment-specific concerns such as TLS, backups, database HA, authentication/authorization at the deployment boundary, observability aggregation, and infrastructure scaling.
