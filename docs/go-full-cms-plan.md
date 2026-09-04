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
│   ├── media/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   ├── datasource/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   ├── block/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   ├── setting/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   ├── render/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   ├── config/
│   ├── middleware/
│   ├── router/
│   ├── pkg/
│   └── database/
│       ├── database.go
│       ├── migration.go
│       ├── transaction.go
│       ├── driver.go
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
- [ ] Business features live directly under `internal/<feature>/`.
- [ ] No `internal/domain/` directory is used.
- [ ] Feature handlers depend on feature services, not directly on storage.
- [ ] Feature services depend on repository interfaces.
- [ ] Repository implementations use GORM for SQL persistence.
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
GORM
    ↓
SQLite / PostgreSQL / MySQL / SQL Server
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

## 3. Database Strategy — GORM

The Go CMS uses **GORM** as the application ORM so repository code can work across multiple SQL databases without duplicating persistence logic.

Default database:

```text
SQLite
```

Supported SQL drivers:

- [ ] SQLite — default, zero external database setup required.
- [ ] PostgreSQL.
- [ ] MySQL / MariaDB.
- [ ] SQL Server.

Required Go dependencies:

```text
gorm.io/gorm
gorm.io/driver/sqlite
gorm.io/driver/postgres
gorm.io/driver/mysql
gorm.io/driver/sqlserver
```

Database configuration contract:

```text
DB_DRIVER=sqlite
DB_DSN=page-builder.db
```

Example PostgreSQL:

```text
DB_DRIVER=postgres
DB_DSN=host=localhost user=pagebuilder password=secret dbname=pagebuilder port=5432 sslmode=disable
```

Example MySQL:

```text
DB_DRIVER=mysql
DB_DSN=user:password@tcp(127.0.0.1:3306)/pagebuilder?charset=utf8mb4&parseTime=True&loc=Local
```

Rules:

- [ ] `sqlite` is the default driver when `DB_DRIVER` is not set.
- [ ] Default SQLite file is local to the Go CMS runtime data directory.
- [ ] Driver selection is centralized in `internal/database/driver.go`.
- [ ] Feature repositories receive `*gorm.DB` through dependency injection.
- [ ] Feature packages must not create their own independent database connections.
- [ ] Repository code should remain database-neutral wherever possible.
- [ ] Driver-specific SQL is isolated and only used when unavoidable.
- [ ] SQL identifiers or syntax that break portability are avoided in shared repository code.
- [ ] Transactions use `db.Transaction(...)` or an application transaction helper.
- [ ] Context is propagated through `db.WithContext(ctx)`.
- [ ] Connection pool configuration is applied through the underlying `database/sql` handle.
- [ ] Database secrets are never written to logs.

## 4. `internal/database/`

Owns GORM bootstrap, driver selection, migrations, health checks, pooling, and transaction infrastructure.

Target layout:

```text
internal/database/
├── database.go
├── driver.go
├── migration.go
├── transaction.go
└── migrations/
```

Responsibilities:

- [ ] Load database configuration.
- [ ] Open the selected GORM dialector.
- [ ] SQLite as default dialector.
- [ ] PostgreSQL dialector.
- [ ] MySQL dialector.
- [ ] SQL Server dialector.
- [ ] Expose one application `*gorm.DB` instance.
- [ ] Obtain and configure underlying `*sql.DB`.
- [ ] Configure max open connections where meaningful.
- [ ] Configure max idle connections where meaningful.
- [ ] Configure connection max lifetime.
- [ ] Health check with `PingContext`.
- [ ] Graceful database close.
- [ ] GORM logger configuration based on environment.
- [ ] Migration runner.
- [ ] Schema version tracking.
- [ ] Transaction helper.
- [ ] Integration tests for SQLite.
- [ ] Compatibility tests for PostgreSQL/MySQL where CI infrastructure allows.

Migration rules:

- [ ] Migrations are deterministic and versioned.
- [ ] Do not rely only on uncontrolled `AutoMigrate` for production schema evolution.
- [ ] `AutoMigrate` may be used for development/bootstrap only if explicitly configured.
- [ ] Production migrations must be forward-safe and testable.
- [ ] Migration state is persisted in the selected SQL database.

Initial tables:

- [ ] `pages`.
- [ ] `media`.
- [ ] `datasources`.
- [ ] `settings`.
- [ ] migration/schema-version table.
- [ ] required indexes for slugs, status, and updated timestamps.

## 5. `internal/config/`

Owns runtime configuration.

- [ ] HTTP host and port.
- [ ] Environment.
- [ ] `DB_DRIVER`, default `sqlite`.
- [ ] `DB_DSN`, default SQLite file path.
- [ ] Database pool settings.
- [ ] Storage path.
- [ ] Block root.
- [ ] Upload limits.
- [ ] Render timeout.
- [ ] CORS policy.
- [ ] Logging configuration.
- [ ] Trusted proxy configuration if needed.
- [ ] Startup configuration validation.
- [ ] Safe production defaults.

## 6. `internal/page/`

Owns CMS page lifecycle.

### Model

- [ ] GORM-compatible page persistence model.
- [ ] Page ID.
- [ ] Title.
- [ ] Slug.
- [ ] Status: draft/published.
- [ ] Canonical universal Page JSON.
- [ ] Created, updated, and published timestamps.
- [ ] Revision/version metadata where needed.
- [ ] JSON content stored without framework-specific fields.

### Repository

- [ ] GORM repository implementation.
- [ ] Create page.
- [ ] Find by ID.
- [ ] Find by slug.
- [ ] List pages.
- [ ] Update page.
- [ ] Delete page.
- [ ] Publish/unpublish.
- [ ] Pagination, filtering, and ordering.
- [ ] Unique slug constraint enforced both in service and database.

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

## 7. `internal/media/`

- [ ] GORM media metadata model.
- [ ] GORM media repository.
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

## 8. `internal/datasource/`

Owns dynamic data resources while remaining compatible with `specification/datasource.schema.json`.

- [ ] GORM-backed datasource definition persistence.
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
- [ ] SQL datasource provider built on GORM where suitable.
- [ ] Structured datasource diagnostics.
- [ ] Editor metadata endpoint.
- [ ] Avoid exposing arbitrary unrestricted SQL through the editor API.

Endpoints:

- [ ] `GET /api/datasources`.
- [ ] `POST /api/datasources/query`.
- [ ] `GET /api/datasources/{resource}/metadata`.

## 9. `internal/block/`

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

## 10. `internal/setting/`

- [ ] GORM settings persistence.
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

## 11. `internal/render/`

- [ ] Render persisted page by ID.
- [ ] Render persisted page by slug.
- [ ] Render unsaved page preview.
- [ ] Render single block preview.
- [ ] Load registry from block services/repositories.
- [ ] Validate page and template input.
- [ ] Produce structured diagnostics.
- [ ] Deduplicate CSS/JS assets.
- [ ] Preserve Laravel/Go universal conformance parity.
- [ ] Public frontend route only exposes published pages.

Endpoints:

- [ ] `POST /api/render/page`.
- [ ] `POST /api/render/block`.
- [ ] `GET /{slug}` for published frontend pages.

## 12. `internal/middleware/`

- [ ] Panic recovery.
- [ ] Request ID.
- [ ] Structured request logging.
- [ ] CORS.
- [ ] Security headers.
- [ ] Body-size limits.
- [ ] Content-Type validation.
- [ ] Request timeout.
- [ ] No CMS business logic.

## 13. `internal/router/`

- [ ] `GET /health`.
- [ ] `GET /ready` verifies database readiness.
- [ ] Page routes.
- [ ] Media routes.
- [ ] Datasource routes.
- [ ] Block routes.
- [ ] Setting routes.
- [ ] Render routes.
- [ ] Published frontend route.
- [ ] Static media route where required.
- [ ] No business logic.

## 14. `internal/pkg/`

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

## 15. Executable

Primary executable:

```text
engine/go/cmd/cms/main.go
```

Responsibilities:

- [ ] Load config.
- [ ] Initialize GORM using selected SQL driver.
- [ ] Run migrations when configured.
- [ ] Create feature repositories using the shared `*gorm.DB`.
- [ ] Create feature services.
- [ ] Create feature handlers.
- [ ] Create router.
- [ ] Start HTTP server.
- [ ] Handle OS termination signals.
- [ ] Graceful HTTP and database shutdown.
- [ ] `--version` support.

`main.go` must contain no CMS business logic.

## 16. Editor Integration

The React editor remains top-level `editor/` and engine-neutral.

- [ ] Block listing works against Go CMS.
- [ ] Page CRUD works against Go CMS.
- [ ] Page preview works against Go CMS.
- [ ] Block preview works against Go CMS.
- [ ] Datasource metadata works against Go CMS.
- [ ] Media browser works against Go CMS.
- [ ] No Laravel endpoint is required by the editor when using Go CMS.
- [ ] Browser E2E covers editor + Go CMS.

## 17. Migration From Current Go Layout

- [ ] Move current renderer request model into `internal/render/model/`.
- [ ] Move current renderer handler into `internal/render/handler/`.
- [ ] Move current registry access into `internal/block/repository/` or `internal/render/repository/` according to responsibility.
- [ ] Move current renderer service into `internal/render/service/`.
- [ ] Remove old top-level `internal/handler`, `internal/model`, `internal/repository`, and `internal/service` after imports are migrated.
- [ ] Keep and expand `internal/config`.
- [ ] Replace current database abstraction with GORM-backed `internal/database`.
- [ ] Keep infrastructure middleware in `internal/middleware`.
- [ ] Replace stdin/stdout router as the primary runtime with HTTP routing.
- [ ] Add `internal/page`, `media`, `datasource`, `block`, `setting`, `render`, and `pkg`.
- [ ] Add `cmd/cms`.
- [ ] Retain compatibility command only if shared renderer conformance still needs it.
- [ ] Add GORM and all supported SQL dialector dependencies.
- [ ] Update CI and release build targets.
- [ ] Update Go documentation.

## 18. Security

- [ ] Validate every persisted canonical document.
- [ ] All queries go through GORM or parameterized SQL.
- [ ] No string-concatenated arbitrary SQL from HTTP/editor input.
- [ ] Upload path traversal blocked.
- [ ] Block root traversal blocked.
- [ ] Template execution remains non-arbitrary.
- [ ] Custom CSS sanitization remains enforced.
- [ ] Request body limits enforced.
- [ ] Render/request timeouts enforced.
- [ ] Panic details hidden in production.
- [ ] Internal filesystem paths not leaked.
- [ ] Database credentials not logged.

## 19. Testing

### Unit

- [ ] Page service/repository/handler tests.
- [ ] Media service/repository/handler tests.
- [ ] Datasource tests.
- [ ] Block discovery tests.
- [ ] Settings tests.
- [ ] Render tests.
- [ ] Middleware tests.
- [ ] Config tests.
- [ ] GORM driver selection tests.

### Integration

- [ ] SQLite database bootstrap with no external service.
- [ ] SQLite migrations.
- [ ] Page CRUD.
- [ ] Publish/unpublish.
- [ ] Media lifecycle.
- [ ] Datasource query lifecycle.
- [ ] Settings lifecycle.
- [ ] Preview rendering.
- [ ] Published frontend rendering.
- [ ] PostgreSQL/MySQL compatibility tests where CI services are enabled.

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

## 20. CI and Distribution

- [ ] `gofmt` enforced.
- [ ] `go vet ./...` passes.
- [ ] `go test ./...` passes.
- [ ] SQLite integration test always runs in CI.
- [ ] Optional PostgreSQL/MySQL matrix validates multi-database portability.
- [ ] CMS executable builds independently.
- [ ] Linux amd64/arm64 binaries.
- [ ] macOS amd64/arm64 binaries.
- [ ] Windows amd64/arm64 binaries.
- [ ] Engine/CMS version embedded at build time.
- [ ] SHA-256 checksums.
- [ ] Migration files included where needed.
- [ ] Portable block/spec compatibility declared.
- [ ] Release workflow identifies Go as standalone CMS executable, not only a renderer library.

## 21. Documentation

- [ ] Go CMS architecture guide.
- [ ] GORM/database configuration reference.
- [ ] SQLite default setup guide.
- [ ] PostgreSQL setup example.
- [ ] MySQL setup example.
- [ ] SQL Server setup example.
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
     ├── internal/page
     ├── internal/media
     ├── internal/datasource
     ├── internal/block
     ├── internal/setting
     └── internal/render
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

Complete only when:

- [ ] Go runs as a standalone HTTP CMS executable.
- [ ] Target feature-first directory structure is in place.
- [ ] GORM is the persistence layer.
- [ ] SQLite works as the zero-configuration default database.
- [ ] Database driver can be changed through configuration without rewriting feature repositories.
- [ ] PostgreSQL, MySQL/MariaDB, and SQL Server dialectors are supported.
- [ ] Page, media, datasource, settings, blocks, and rendering features work end-to-end.
- [ ] React editor works against Go CMS without Laravel.
- [ ] Universal rendering conformance remains green.
- [ ] CI proves SQLite operation and multi-database portability where infrastructure permits.
- [ ] Release builds produce standalone CMS binaries.
