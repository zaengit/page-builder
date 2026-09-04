# Go Full CMS Implementation Plan

> **Status: PLANNING — IMPLEMENTATION NOT STARTED**
>
> This plan applies **only to `engine/go/`**. The Laravel engine remains a rendering engine/package and must not be converted into a full CMS.
>
> The Go implementation will become a standalone executable full CMS while continuing to consume the universal `specification/` and portable `blocks/` contracts.

## 1. Target Architecture

The Go CMS uses a feature-first structure. There is no `domain/` wrapper. Each business feature lives directly under `internal/` and owns its handler, model, repository, and service layers where needed.

```text
engine/go/
├── cmd/
│   └── cms/
│       └── main.go
│
├── internal/
│   ├── page/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   │
│   ├── media/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   │
│   ├── datasource/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   │
│   ├── block/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   │
│   ├── setting/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   │
│   ├── render/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   │
│   ├── config/
│   ├── middleware/
│   ├── router/
│   ├── pkg/
│   └── database/
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
- [ ] Business features live directly under `internal/<feature>/`.
- [ ] No `internal/domain/` directory is used.
- [ ] Feature handlers depend on feature services, not directly on storage.
- [ ] Feature services depend on repository interfaces.
- [ ] Repository implementations own persistence or discovery access.
- [ ] Cross-cutting infrastructure belongs in `config`, `middleware`, `router`, `pkg`, or `database`.
- [ ] Universal renderer behavior remains compatible with `specification/` and `blocks/`.
- [ ] No Laravel-specific persistence or runtime concepts are introduced into Go CMS data.

## 2. Runtime Model

```text
HTTP request
    ↓
router
    ↓
middleware
    ↓
feature/handler
    ↓
feature/service
    ↓
feature/repository
    ↓
database / filesystem / portable blocks
```

Rendering path:

```text
HTTP request
    ↓
render/handler
    ↓
render/service
    ↓
universal renderer
    ↓
portable blocks + specification
    ↓
HTML/CSS/JS response
```

- [ ] HTTP server is the primary production runtime.
- [ ] Graceful startup and shutdown are implemented.
- [ ] Runtime configuration comes from environment/config.
- [ ] Renderer protocol compatibility is retained only where conformance/integration requires it.

## 3. `internal/page/`

Owns CMS page lifecycle.

### Model

- [ ] Page ID.
- [ ] Title.
- [ ] Slug.
- [ ] Status: draft/published.
- [ ] Canonical universal Page JSON.
- [ ] Created, updated, and published timestamps.
- [ ] Revision/version metadata where needed.

### Repository

- [ ] Create page.
- [ ] Find by ID.
- [ ] Find by slug.
- [ ] List pages.
- [ ] Update page.
- [ ] Delete page.
- [ ] Publish/unpublish.
- [ ] Pagination, filtering, and ordering.

### Service

- [ ] Validate canonical Page JSON before persistence.
- [ ] Enforce unique slugs.
- [ ] Draft lifecycle.
- [ ] Publish/unpublish lifecycle.
- [ ] Duplicate page.
- [ ] Keep persisted page content framework-neutral.

### Handler

- [ ] `GET /api/pages`.
- [ ] `POST /api/pages`.
- [ ] `GET /api/pages/{id}`.
- [ ] `PUT/PATCH /api/pages/{id}`.
- [ ] `DELETE /api/pages/{id}`.
- [ ] `POST /api/pages/{id}/publish`.
- [ ] `POST /api/pages/{id}/unpublish`.

## 4. `internal/media/`

Owns media library behavior.

- [ ] Media metadata model.
- [ ] Media repository.
- [ ] Upload service.
- [ ] List/read/delete media.
- [ ] File type validation.
- [ ] File size limits.
- [ ] Collision-safe file names.
- [ ] Storage abstraction.
- [ ] Local filesystem implementation.
- [ ] Public URL generation.
- [ ] Path traversal prevention.
- [ ] Executable upload protection.

Endpoints:

- [ ] `GET /api/media`.
- [ ] `POST /api/media`.
- [ ] `GET /api/media/{id}`.
- [ ] `DELETE /api/media/{id}`.

## 5. `internal/datasource/`

Owns dynamic data resources while remaining compatible with `specification/datasource.schema.json`.

- [ ] Datasource definition model.
- [ ] Datasource repository.
- [ ] Resource registry.
- [ ] Single-record resolution.
- [ ] Collection resolution.
- [ ] Filters.
- [ ] Ordering.
- [ ] Limit/offset.
- [ ] Pagination.
- [ ] Relations/includes.
- [ ] Current-record context.
- [ ] Nested binding paths.
- [ ] Fallback values.
- [ ] SQL datasource provider.
- [ ] Structured datasource diagnostics.
- [ ] Editor metadata endpoint.

Endpoints:

- [ ] `GET /api/datasources`.
- [ ] `POST /api/datasources/query`.
- [ ] `GET /api/datasources/{resource}/metadata`.

## 6. `internal/block/`

Owns portable block discovery and metadata. Block source packages remain in top-level `blocks/`.

- [ ] Discover block directories dynamically.
- [ ] Read `block.json`.
- [ ] Validate block manifests.
- [ ] Read and validate `template.html`.
- [ ] Discover CSS/JS assets.
- [ ] List installed block definitions.
- [ ] Get one block definition.
- [ ] Reload newly added portable blocks without rebuilding Go.
- [ ] Return structured diagnostics for invalid block packages.

Endpoints:

- [ ] `GET /api/blocks`.
- [ ] `GET /api/blocks/{type}`.

## 7. `internal/setting/`

Owns site-wide CMS configuration that is persisted as application data.

- [ ] Site title.
- [ ] Site URL/base path where appropriate.
- [ ] Global color schemes.
- [ ] Global typography.
- [ ] Design tokens.
- [ ] Default page settings.
- [ ] Neutral JSON persistence.
- [ ] Validation before persistence.

Endpoints:

- [ ] `GET /api/settings`.
- [ ] `PUT /api/settings`.

## 8. `internal/render/`

Owns rendering use-cases around the existing universal renderer implementation.

- [ ] Render persisted page by ID.
- [ ] Render persisted page by slug.
- [ ] Render unsaved page preview.
- [ ] Render single block preview.
- [ ] Load registry from `internal/block` services/repositories.
- [ ] Validate page and template input.
- [ ] Produce structured diagnostics.
- [ ] Deduplicate CSS/JS assets.
- [ ] Preserve Laravel/Go universal conformance parity.
- [ ] Public frontend route only exposes published pages.

Endpoints:

- [ ] `POST /api/render/page`.
- [ ] `POST /api/render/block`.
- [ ] `GET /{slug}` for published frontend pages.

## 9. `internal/config/`

Owns process/runtime configuration.

- [ ] HTTP host and port.
- [ ] Environment.
- [ ] Database driver and DSN.
- [ ] Storage path.
- [ ] Block root.
- [ ] Upload limits.
- [ ] Render timeout.
- [ ] CORS policy.
- [ ] Logging configuration.
- [ ] Trusted proxy configuration if needed.
- [ ] Startup configuration validation.
- [ ] Safe production defaults.

## 10. `internal/database/`

Owns database lifecycle, migrations, and transaction infrastructure.

- [ ] Database bootstrap.
- [ ] Connection pooling.
- [ ] Health check.
- [ ] Transaction helper.
- [ ] Migration runner.
- [ ] Schema version table.
- [ ] Pages table.
- [ ] Media table.
- [ ] Datasource definitions table.
- [ ] Settings table.
- [ ] Required indexes.
- [ ] Clean shutdown.
- [ ] Integration tests against supported SQL database.

Target layout:

```text
internal/database/
├── database.go
├── transaction.go
├── migration.go
└── migrations/
```

## 11. `internal/middleware/`

Cross-cutting HTTP middleware only.

- [ ] Panic recovery.
- [ ] Request ID.
- [ ] Structured request logging.
- [ ] CORS.
- [ ] Security headers.
- [ ] Body-size limits.
- [ ] Content-Type validation.
- [ ] Request timeout.
- [ ] No CMS business logic.

## 12. `internal/router/`

Owns route registration only.

- [ ] `GET /health`.
- [ ] `GET /ready`.
- [ ] Page routes.
- [ ] Media routes.
- [ ] Datasource routes.
- [ ] Block routes.
- [ ] Setting routes.
- [ ] Render routes.
- [ ] Published frontend route.
- [ ] Static media route where required.
- [ ] No business logic.

## 13. `internal/pkg/`

Reusable internal infrastructure that does not belong to one feature.

```text
internal/pkg/
├── response/
├── validator/
├── filesystem/
├── pagination/
├── errors/
└── slug/
```

- [ ] Standard JSON response writer.
- [ ] Typed application errors.
- [ ] Request validation helpers.
- [ ] Pagination helpers.
- [ ] Filesystem helpers.
- [ ] Slug helpers.
- [ ] No page/media/block/settings business rules in `pkg`.

## 14. Executable

Primary executable:

```text
engine/go/cmd/cms/main.go
```

Responsibilities:

- [ ] Load config.
- [ ] Connect database.
- [ ] Run migrations when configured.
- [ ] Create feature repositories.
- [ ] Create feature services.
- [ ] Create feature handlers.
- [ ] Create router.
- [ ] Start HTTP server.
- [ ] Handle OS termination signals.
- [ ] Graceful shutdown.
- [ ] `--version` support.

`main.go` must contain no CMS business logic.

## 15. Editor Integration

The React editor remains top-level `editor/` and engine-neutral.

- [ ] Block listing works against Go CMS.
- [ ] Page CRUD works against Go CMS.
- [ ] Page preview works against Go CMS.
- [ ] Block preview works against Go CMS.
- [ ] Datasource metadata works against Go CMS.
- [ ] Media browser works against Go CMS.
- [ ] No Laravel endpoint is required by the editor when using Go CMS.
- [ ] Browser E2E covers editor + Go CMS.

## 16. Migration From Current Go Layout

Current layout:

```text
internal/
├── config/
├── database/
├── handler/
├── middleware/
├── model/
├── repository/
├── router/
└── service/
```

Target migration:

- [ ] Move current renderer request model into `internal/render/model/`.
- [ ] Move current renderer handler into `internal/render/handler/`.
- [ ] Move current registry access into `internal/block/repository/` or `internal/render/repository/` according to responsibility.
- [ ] Move current renderer service into `internal/render/service/`.
- [ ] Remove old top-level `internal/handler`, `internal/model`, `internal/repository`, and `internal/service` after imports are migrated.
- [ ] Keep and expand `internal/config`.
- [ ] Keep and expand `internal/database`.
- [ ] Keep infrastructure middleware in `internal/middleware`.
- [ ] Replace stdin/stdout router as the primary runtime with HTTP routing.
- [ ] Add `internal/page`.
- [ ] Add `internal/media`.
- [ ] Add `internal/datasource`.
- [ ] Add `internal/block`.
- [ ] Add `internal/setting`.
- [ ] Add `internal/render`.
- [ ] Add `internal/pkg`.
- [ ] Add `cmd/cms`.
- [ ] Retain compatibility command only if shared renderer conformance still needs it.
- [ ] Update CI and release build targets.
- [ ] Update Go documentation.

## 17. Security

- [ ] Validate every persisted canonical document.
- [ ] Parameterized SQL only.
- [ ] Upload path traversal blocked.
- [ ] Block root traversal blocked.
- [ ] Template execution remains non-arbitrary.
- [ ] Custom CSS sanitization remains enforced.
- [ ] Request body limits enforced.
- [ ] Render/request timeouts enforced.
- [ ] Panic details hidden in production.
- [ ] Internal filesystem paths not leaked.

## 18. Testing

### Unit

- [ ] Page service/repository/handler tests.
- [ ] Media service/repository/handler tests.
- [ ] Datasource tests.
- [ ] Block discovery tests.
- [ ] Settings tests.
- [ ] Render tests.
- [ ] Middleware tests.
- [ ] Config tests.

### Integration

- [ ] Database migrations.
- [ ] Page CRUD.
- [ ] Publish/unpublish.
- [ ] Media lifecycle.
- [ ] Datasource query lifecycle.
- [ ] Settings lifecycle.
- [ ] Preview rendering.
- [ ] Published frontend rendering.

### Cross-engine

- [ ] Universal conformance corpus remains green.
- [ ] Laravel and Go still produce compatible universal render behavior.
- [ ] Go CMS persistence does not mutate canonical Page JSON.

### Browser

- [ ] React editor loads blocks from Go CMS.
- [ ] React editor creates and saves pages through Go CMS.
- [ ] React editor previews using Go rendering.
- [ ] React editor media integration works.
- [ ] React editor datasource integration works.

## 19. CI and Distribution

- [ ] `gofmt` enforced.
- [ ] `go vet ./...` passes.
- [ ] `go test ./...` passes.
- [ ] CMS executable builds independently.
- [ ] Linux amd64/arm64 binaries.
- [ ] macOS amd64/arm64 binaries.
- [ ] Windows amd64/arm64 binaries.
- [ ] Engine/CMS version embedded at build time.
- [ ] SHA-256 checksums.
- [ ] Migration files included where needed.
- [ ] Portable block/spec compatibility declared.
- [ ] Release workflow identifies Go as standalone CMS executable, not only a renderer library.

## 20. Documentation

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

## 21. Definition of Done

```text
React editor
     │
     ▼
Go CMS executable
     │
     ├── internal/page
     ├── internal/media
     ├── internal/datasource
     ├── internal/block
     ├── internal/setting
     └── internal/render
             │
             ▼
     universal specification
             +
        portable blocks
```

Complete only when:

- [ ] Go runs as a standalone HTTP CMS executable.
- [ ] Target feature-first directory structure is in place.
- [ ] No `internal/domain` wrapper exists.
- [ ] Page CRUD and draft/publish lifecycle work end-to-end.
- [ ] Media library works end-to-end.
- [ ] Datasources work end-to-end.
- [ ] Settings work end-to-end.
- [ ] Portable blocks are runtime-discovered without Go rebuild.
- [ ] Preview and published rendering work end-to-end.
- [ ] React editor works directly against Go CMS.
- [ ] Universal renderer/specification conformance remains green.
- [ ] CI is fully green.
- [ ] Release artifacts build for all supported platforms.
- [ ] Documentation is sufficient to deploy and extend the Go CMS.

## 22. Implementation Order

- [ ] Phase 1 — restructure current render code into `internal/render` and block discovery into `internal/block`.
- [ ] Phase 2 — HTTP server, config, router, middleware, health/readiness.
- [ ] Phase 3 — database bootstrap and migrations.
- [ ] Phase 4 — page feature.
- [ ] Phase 5 — render + published frontend integration.
- [ ] Phase 6 — media feature.
- [ ] Phase 7 — datasource feature.
- [ ] Phase 8 — setting feature.
- [ ] Phase 9 — editor integration and browser E2E.
- [ ] Phase 10 — security hardening, CI, release, and documentation.
