# Go Full CMS Implementation Plan

> **Status: PLANNING — IMPLEMENTATION NOT STARTED**
>
> This plan applies **only to `engine/go/`**. The Laravel engine remains a rendering engine/package and must not be converted into a full CMS.
>
> The Go implementation will become a standalone executable full CMS while continuing to consume the universal `specification/` and portable `blocks/` contracts.

## 1. Target Architecture

```text
engine/go/
├── cmd/
│   └── cms/
│       └── main.go
│
├── internal/
│   ├── domain/
│   │   ├── handler/
│   │   │   ├── page_handler.go
│   │   │   ├── block_handler.go
│   │   │   ├── media_handler.go
│   │   │   ├── datasource_handler.go
│   │   │   ├── settings_handler.go
│   │   │   └── render_handler.go
│   │   ├── model/
│   │   │   ├── page.go
│   │   │   ├── block.go
│   │   │   ├── media.go
│   │   │   ├── datasource.go
│   │   │   ├── setting.go
│   │   │   └── render.go
│   │   ├── repository/
│   │   │   ├── page_repository.go
│   │   │   ├── media_repository.go
│   │   │   ├── datasource_repository.go
│   │   │   └── setting_repository.go
│   │   └── service/
│   │       ├── page_service.go
│   │       ├── block_service.go
│   │       ├── media_service.go
│   │       ├── datasource_service.go
│   │       ├── settings_service.go
│   │       └── render_service.go
│   │
│   ├── config/
│   │   └── config.go
│   ├── middleware/
│   │   ├── recovery.go
│   │   ├── request_id.go
│   │   ├── cors.go
│   │   ├── logging.go
│   │   └── security.go
│   ├── router/
│   │   └── router.go
│   ├── pkg/
│   │   ├── response/
│   │   ├── validator/
│   │   ├── filesystem/
│   │   ├── pagination/
│   │   └── errors/
│   └── database/
│       ├── database.go
│       ├── migration.go
│       └── migrations/
│
├── renderer.go
├── registry.go
├── datasource.go
├── validation.go
├── template_validate.go
├── version.go
├── go.mod
└── go.sum
```

Architecture rules:

- [ ] Go is distributed as a standalone CMS executable.
- [ ] `cmd/cms/main.go` contains bootstrap/wiring only.
- [ ] Business features live under `internal/domain/`.
- [ ] Domain handlers depend on services, not directly on storage.
- [ ] Domain services depend on repository interfaces.
- [ ] Repository implementations own persistence access.
- [ ] Shared infrastructure belongs outside `domain/`.
- [ ] Universal renderer behavior remains compatible with `specification/` and `blocks/`.
- [ ] No Laravel-specific persistence or runtime concepts are introduced into Go CMS data.

## 2. Runtime Model

The Go engine becomes the complete application runtime:

```text
HTTP request
    ↓
router
    ↓
middleware
    ↓
domain/handler
    ↓
domain/service
    ↓
domain/repository
    ↓
database / filesystem

Page render path:
HTTP request
    ↓
render handler
    ↓
render service
    ↓
universal renderer
    ↓
portable blocks + specification
    ↓
HTML/CSS/JS response
```

- [ ] Replace stdin/stdout as the primary runtime with HTTP server execution.
- [ ] Keep renderer protocol compatibility only where required for conformance/integration tooling.
- [ ] Make direct HTTP CMS endpoints the normal production path.
- [ ] Graceful startup and graceful shutdown are implemented.
- [ ] Runtime configuration comes from environment/config, not hard-coded values.

## 3. Configuration

`internal/config/` owns application configuration.

- [ ] HTTP host/port.
- [ ] Application environment.
- [ ] Database driver and DSN.
- [ ] Storage path.
- [ ] Block root path.
- [ ] Upload limits.
- [ ] Render timeout.
- [ ] CORS configuration.
- [ ] Trusted proxy configuration if required.
- [ ] Logging configuration.
- [ ] Configuration validation at startup.
- [ ] Safe production defaults.

## 4. Database

`internal/database/` owns database lifecycle and migrations.

Initial target: SQL database with repository abstractions.

- [ ] Database connection bootstrap.
- [ ] Connection pooling.
- [ ] Health check.
- [ ] Transaction support.
- [ ] Migration runner.
- [ ] Schema version table.
- [ ] Pages table.
- [ ] Media table.
- [ ] Datasource definitions table where persistence is required.
- [ ] Settings table.
- [ ] Indexes for slugs/status/updated timestamps.
- [ ] Repository tests against a real test database or supported integration database.
- [ ] Clean shutdown closes database resources.

## 5. Page Domain

### Model

- [ ] Page ID.
- [ ] Title.
- [ ] Slug.
- [ ] Status: draft/published.
- [ ] Canonical universal Page JSON document.
- [ ] Created timestamp.
- [ ] Updated timestamp.
- [ ] Published timestamp.
- [ ] Revision/version metadata where required.

### Repository

- [ ] Create page.
- [ ] Read page by ID.
- [ ] Read page by slug.
- [ ] List pages.
- [ ] Update page.
- [ ] Delete page.
- [ ] Publish/unpublish page.
- [ ] Pagination.
- [ ] Filtering.
- [ ] Ordering.

### Service

- [ ] Validate canonical Page JSON before persistence.
- [ ] Enforce unique slug rules.
- [ ] Create drafts.
- [ ] Update drafts.
- [ ] Publish pages.
- [ ] Unpublish pages.
- [ ] Duplicate pages.
- [ ] Protect persisted content from framework-specific fields.

### Handler

- [ ] `GET /api/pages`.
- [ ] `POST /api/pages`.
- [ ] `GET /api/pages/{id}`.
- [ ] `PUT/PATCH /api/pages/{id}`.
- [ ] `DELETE /api/pages/{id}`.
- [ ] `POST /api/pages/{id}/publish`.
- [ ] `POST /api/pages/{id}/unpublish`.
- [ ] Consistent JSON error responses.

## 6. Rendering Domain

- [ ] Render persisted page by ID.
- [ ] Render persisted page by slug.
- [ ] Render unsaved preview Page JSON.
- [ ] Render a single block preview.
- [ ] Resolve block registry from portable `blocks/` folders.
- [ ] Validate templates before rendering.
- [ ] Produce structured diagnostics.
- [ ] Deduplicate CSS/JS assets.
- [ ] Preserve Laravel/Go conformance parity for universal behavior.
- [ ] Expose public frontend route for published pages.
- [ ] Do not expose draft pages publicly by default.

Suggested endpoints:

- [ ] `POST /api/render/page`.
- [ ] `POST /api/render/block`.
- [ ] `GET /{slug}` for published frontend pages.

## 7. Block Domain

Portable blocks remain owned by top-level `blocks/`.

The Go CMS manages discovery and metadata, not Go-specific block definitions.

- [ ] List installed block definitions.
- [ ] Read block manifest metadata.
- [ ] Validate `block.json`.
- [ ] Validate `template.html`.
- [ ] Discover CSS/JS assets.
- [ ] Reload/discover new block folders without source-code registration.
- [ ] New portable blocks require no Go rebuild when loaded from filesystem at runtime.
- [ ] Invalid block packages produce structured diagnostics.

Suggested endpoints:

- [ ] `GET /api/blocks`.
- [ ] `GET /api/blocks/{type}`.

## 8. Media Domain

- [ ] Upload media.
- [ ] List media.
- [ ] Read media metadata.
- [ ] Delete media.
- [ ] File type validation.
- [ ] File size limits.
- [ ] Collision-safe filenames.
- [ ] Storage abstraction.
- [ ] Local filesystem implementation.
- [ ] Public URL generation.
- [ ] Prevent path traversal.
- [ ] Prevent executable upload abuse.

Suggested endpoints:

- [ ] `GET /api/media`.
- [ ] `POST /api/media`.
- [ ] `DELETE /api/media/{id}`.

## 9. Datasource Domain

Datasource behavior must stay compatible with `specification/datasource.schema.json`.

- [ ] Register datasource resources.
- [ ] Resolve list resources such as products/posts/projects.
- [ ] Resolve single records.
- [ ] Filters.
- [ ] Ordering.
- [ ] Limit/offset.
- [ ] Pagination.
- [ ] Relations/includes.
- [ ] Current-record context.
- [ ] Binding nested paths.
- [ ] Binding fallback values.
- [ ] SQL datasource adapter.
- [ ] Structured datasource diagnostics.
- [ ] Editor metadata endpoint for datasource selection.

Suggested endpoints:

- [ ] `GET /api/datasources`.
- [ ] `POST /api/datasources/query`.
- [ ] `GET /api/datasources/{resource}/metadata`.

## 10. Settings Domain

- [ ] Site title.
- [ ] Site URL/base path configuration where appropriate.
- [ ] Global color schemes.
- [ ] Global typography.
- [ ] Design tokens.
- [ ] Default page settings.
- [ ] Persist settings in neutral JSON.
- [ ] Validate settings before persistence.

Suggested endpoints:

- [ ] `GET /api/settings`.
- [ ] `PUT /api/settings`.

## 11. Editor Integration

The existing React editor remains top-level `editor/` and engine-neutral.

The Go CMS must implement the editor host contract directly.

- [ ] Block listing endpoint matches editor adapter needs.
- [ ] Page preview endpoint matches editor adapter needs.
- [ ] Block preview endpoint matches editor adapter needs.
- [ ] Datasource metadata endpoint matches editor adapter needs.
- [ ] Media endpoints match editor adapter needs.
- [ ] Page CRUD is consumable by a Go host integration.
- [ ] Editor requires no Laravel route to run against Go CMS.
- [ ] Browser E2E proves the editor can run against Go CMS.

## 12. Middleware

`internal/middleware/` contains infrastructure middleware only.

- [ ] Panic recovery.
- [ ] Request ID.
- [ ] Structured request logging.
- [ ] CORS.
- [ ] Security headers.
- [ ] Body-size limits.
- [ ] Content-Type validation where required.
- [ ] Timeout middleware where appropriate.
- [ ] No authentication middleware unless authentication becomes an explicit CMS requirement.

## 13. Router

`internal/router/` owns route registration only.

- [ ] Health route.
- [ ] API route group.
- [ ] Page routes.
- [ ] Block routes.
- [ ] Render routes.
- [ ] Datasource routes.
- [ ] Media routes.
- [ ] Settings routes.
- [ ] Published frontend route.
- [ ] Static media/assets route where required.
- [ ] No business logic in router package.

## 14. Internal Shared Packages

`internal/pkg/` is for reusable Go-CMS infrastructure that is not a business domain.

- [ ] Standard response writer.
- [ ] Typed application errors.
- [ ] Request validation helpers.
- [ ] Pagination helpers.
- [ ] Filesystem helpers.
- [ ] Slug helpers if required.
- [ ] No domain business logic in `pkg/`.

## 15. Executable

Primary executable:

```text
engine/go/cmd/cms/main.go
```

Responsibilities are limited to:

- [ ] load config;
- [ ] connect database;
- [ ] run migrations if configured;
- [ ] create repository implementations;
- [ ] create services;
- [ ] create handlers;
- [ ] create router;
- [ ] start HTTP server;
- [ ] handle termination signals;
- [ ] graceful shutdown.

`main.go` must not contain CMS business logic.

## 16. Migration From Current Go Layout

Current engine-local packages will be reorganized carefully without changing universal rendering semantics.

- [ ] Move current internal render handler into `internal/domain/handler`.
- [ ] Move request/render model into `internal/domain/model`.
- [ ] Move registry repository into `internal/domain/repository` where it represents domain persistence/discovery behavior.
- [ ] Move render service into `internal/domain/service`.
- [ ] Keep `internal/config`.
- [ ] Keep `internal/middleware` but remove protocol-specific naming where it is not needed by HTTP CMS runtime.
- [ ] Replace stdin/stdout router with HTTP router.
- [ ] Add `internal/pkg`.
- [ ] Expand `internal/database` into actual DB lifecycle/migration package.
- [ ] Replace `cmd/page-builder-render` as primary binary with `cmd/cms`.
- [ ] Retain protocol/conformance compatibility only through a compatibility command or adapter if tests/releases still require it.
- [ ] Update CI build target.
- [ ] Update release binary names.
- [ ] Update Go documentation.

## 17. Testing

### Unit tests

- [ ] Domain service tests.
- [ ] Handler tests.
- [ ] Repository tests.
- [ ] Middleware tests.
- [ ] Configuration tests.
- [ ] Renderer tests.

### Integration tests

- [ ] Database migrations.
- [ ] Page CRUD.
- [ ] Publish/unpublish flow.
- [ ] Media upload lifecycle.
- [ ] Datasource query lifecycle.
- [ ] Settings lifecycle.
- [ ] Preview rendering.
- [ ] Published frontend rendering.

### Cross-engine tests

- [ ] Existing universal renderer conformance remains green.
- [ ] Laravel and Go still render universal fixtures consistently.
- [ ] Go CMS persistence does not mutate canonical Page JSON.

### Browser tests

- [ ] React editor loads blocks from Go CMS.
- [ ] React editor creates/saves a page through Go CMS.
- [ ] React editor previews through Go renderer.
- [ ] React editor media browser works with Go CMS.
- [ ] React editor datasource inspector works with Go CMS.

## 18. Security

- [ ] Validate every persisted canonical document.
- [ ] SQL uses parameterized queries.
- [ ] Upload path traversal is blocked.
- [ ] Block root traversal is blocked.
- [ ] Template execution remains non-arbitrary.
- [ ] Custom CSS sanitization remains enforced.
- [ ] Request body limits are enforced.
- [ ] Timeouts are enforced.
- [ ] Panic details are not leaked in production responses.
- [ ] Internal filesystem paths are not exposed unnecessarily.

## 19. Observability and Operations

- [ ] Structured logging.
- [ ] Request IDs.
- [ ] Startup configuration summary without secrets.
- [ ] `GET /health`.
- [ ] `GET /ready` if database readiness differs from process health.
- [ ] Graceful shutdown.
- [ ] Stable exit codes.
- [ ] Version command/flag.

## 20. CI and Distribution

- [ ] `go test ./...` passes.
- [ ] `go vet ./...` passes.
- [ ] `gofmt` enforced.
- [ ] CMS executable builds independently.
- [ ] Linux amd64/arm64 release binaries.
- [ ] macOS amd64/arm64 release binaries.
- [ ] Windows amd64/arm64 release binaries.
- [ ] Version embedded at build time.
- [ ] SHA-256 checksums generated.
- [ ] Database migration files included where required.
- [ ] Portable block/specification compatibility declared.
- [ ] Release workflow no longer describes Go only as a renderer library.

## 21. Documentation

- [ ] Go CMS architecture guide.
- [ ] Configuration reference.
- [ ] Database setup guide.
- [ ] Migration guide.
- [ ] API reference.
- [ ] Page CRUD examples.
- [ ] Block integration guide.
- [ ] Datasource integration guide.
- [ ] Media storage guide.
- [ ] Editor + Go CMS integration guide.
- [ ] Production deployment guide.

## 22. Definition of Done

```text
React editor
     │
     ▼
Go CMS executable
     │
     ├── Page CRUD
     ├── Blocks
     ├── Media
     ├── Datasources
     ├── Settings
     ├── Preview rendering
     └── Published frontend
             │
             ▼
     universal specification
             +
        portable blocks
```

The Go full CMS is complete only when:

- [ ] Go runs as a standalone HTTP CMS executable.
- [ ] Page CRUD is persisted in a database.
- [ ] Draft/published lifecycle works.
- [ ] React editor works directly against Go CMS.
- [ ] Media management works.
- [ ] Datasource querying works.
- [ ] Global settings/design tokens work.
- [ ] Preview rendering works.
- [ ] Public published-page rendering works.
- [ ] Portable blocks remain engine-neutral.
- [ ] Canonical Page JSON remains universal.
- [ ] Laravel engine is unaffected as a full-CMS concern.
- [ ] Universal Laravel/Go conformance remains green.
- [ ] Go CMS CI and browser E2E are green.
- [ ] Distribution binaries are produced for the release matrix.

## 23. Implementation Order

1. [ ] Freeze this architecture and naming.
2. [ ] Reorganize current Go internal packages into `internal/domain/*`.
3. [ ] Introduce HTTP server/router runtime.
4. [ ] Implement database bootstrap and migrations.
5. [ ] Implement Page model/repository/service/handler CRUD.
6. [ ] Implement publish/unpublish and public page rendering.
7. [ ] Integrate current universal renderer into the render domain.
8. [ ] Implement portable block discovery API.
9. [ ] Implement media domain.
10. [ ] Implement datasource domain.
11. [ ] Implement settings/design-token domain.
12. [ ] Complete editor HostAdapter support against Go CMS.
13. [ ] Add integration and browser E2E tests.
14. [ ] Update CI and release workflow for the CMS executable.
15. [ ] Complete operational/security hardening.
16. [ ] Complete documentation.
17. [ ] Run the full universal conformance suite and final Go CMS CI.
18. [ ] Mark this plan COMPLETE only after all checks are proven.
