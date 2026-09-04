# Go CMS

`engine/go/` is a standalone full CMS executable. It is not distributed as a public reusable Go renderer package and it does not ship a separate renderer executable. Rendering, datasource contracts, registry loading, validation, and template execution are private CMS implementation details under `internal/render/engine/`.

The Go CMS continues to consume the universal top-level `specification/` and portable `blocks/` contracts, so its rendered output remains covered by the shared cross-engine conformance corpus.

## Architecture

```text
engine/go/
├── cmd/
│   └── cms/
│       └── main.go
├── internal/
│   ├── page/
│   ├── media/
│   ├── datasource/
│   ├── block/
│   ├── setting/
│   ├── render/
│   │   ├── engine/
│   │   ├── handler/
│   │   ├── model/
│   │   └── service/
│   ├── config/
│   ├── database/
│   ├── middleware/
│   ├── router/
│   └── pkg/
├── go.mod
└── go.sum
```

There are intentionally no `.go` files at the root of `engine/go/`. `cmd/cms/main.go` is bootstrap and dependency wiring only. Feature handlers call services, services own business rules, repositories own persistence/discovery, and cross-cutting infrastructure stays in the dedicated internal packages.

`internal/render/engine/` contains the universal rendering implementation used by the CMS itself. Because it is under Go's `internal` boundary, it is not a supported external package API.

## Run

```bash
cd engine/go
go test ./...
go run ./cmd/cms
```

Default configuration requires no external database server:

```text
APP_ENV=production
HTTP_ADDR=:8080
DB_DRIVER=sqlite
DB_DSN=page-builder.db
DB_MIGRATE_ON_START=true
STORAGE_PATH=storage
PUBLIC_STORAGE_PATH=/media
BLOCK_ROOT=../../blocks
MAX_UPLOAD_BYTES=20971520
RENDER_TIMEOUT_MS=5000
HTTP_READ_TIMEOUT_MS=15000
HTTP_WRITE_TIMEOUT_MS=30000
HTTP_IDLE_TIMEOUT_MS=60000
SHUTDOWN_TIMEOUT_MS=10000
CORS_ORIGINS=
```

`DB_DRIVER` supports `sqlite`, `postgres`, `mysql`, and `sqlserver`. GORM is the persistence layer. SQLite uses a pure-Go driver so release binaries do not require CGO or a system SQLite library. PostgreSQL, MySQL/MariaDB, and SQL Server are selected by changing `DB_DRIVER` and `DB_DSN`; feature repositories continue using the same shared `*gorm.DB`.

Example PostgreSQL configuration:

```text
DB_DRIVER=postgres
DB_DSN=host=db.example.internal user=pagebuilder password=... dbname=pagebuilder port=5432 sslmode=require
```

Do not commit DSNs containing credentials. Supply secrets through the deployment platform.

## Database lifecycle

Startup opens the configured database, configures the connection pool, performs a readiness ping, and optionally runs versioned migrations. Schema versions are recorded in `schema_migrations`; re-running startup migrations is idempotent. Set `DB_MIGRATE_ON_START=false` when migrations are managed as a separate deployment phase.

The initial schema persists pages, media metadata, datasource definitions, and global settings. Canonical Page JSON is validated before persistence and remains framework-neutral.

## HTTP API

Health and operations:

```text
GET /health
GET /ready
```

Pages:

```text
GET    /api/pages
POST   /api/pages
GET    /api/pages/{id}
PUT    /api/pages/{id}
PATCH  /api/pages/{id}
DELETE /api/pages/{id}
POST   /api/pages/{id}/publish
POST   /api/pages/{id}/unpublish
```

Portable blocks:

```text
GET /api/blocks
GET /api/blocks/{type}
```

Media:

```text
GET    /api/media
POST   /api/media
GET    /api/media/{id}
DELETE /api/media/{id}
GET    /media/{file}
```

Media uploads are size-limited, use generated storage names, reject active SVG uploads, and verify detected content type against the file extension.

Datasources:

```text
GET  /api/datasources
PUT  /api/datasources/{name}
POST /api/datasources/query
GET  /api/datasources/{resource}/metadata
```

Datasource registrations explicitly allowlist a table and columns. Dynamic queries only use validated identifiers, parameterized values, allowlisted operators, bounded pagination, and allowlisted ordering. Arbitrary SQL from Page JSON or editor requests is not executed.

Settings and rendering:

```text
GET  /api/settings
PUT  /api/settings
POST /api/render/page
POST /api/render/block
GET  /{slug}
```

Only published pages resolve through the public frontend route. Draft pages are available to CMS APIs and preview rendering but are not publicly rendered by slug.

## Editor integration

The engine-neutral React HTTP adapter can point directly at the Go CMS. It uses the CMS HTTP API for page persistence, block discovery, preview rendering, datasource metadata/querying, and media operations. No Laravel endpoint and no renderer subprocess are required when the Go CMS is the host.

## HTTP hardening

The runtime includes panic recovery, generic panic responses, request IDs, structured request logging, explicit CORS handling, content-type sniff protection, frame/referrer/permissions security headers, request body limits on write endpoints, server read/write/idle timeouts, and graceful termination on SIGINT/SIGTERM.

Write APIs intentionally do not implement an identity system in this repository. In an Internet-facing deployment, place CMS `/api/*` write routes behind the deployment's authentication/authorization layer or private control plane. Do not expose administrative write routes anonymously.

## Production deployment

Run one released `page-builder-cms-go-*` binary behind a TLS-terminating reverse proxy or managed ingress. Persist both the database and `STORAGE_PATH`. For SQLite, use a durable local volume and a single-writer deployment topology; for horizontally scaled deployments use PostgreSQL, MySQL/MariaDB, or SQL Server plus shared/object media storage supplied by the deployment integration.

Use `/health` for process liveness and `/ready` for database readiness. Send SIGTERM during rollout and allow at least `SHUTDOWN_TIMEOUT_MS` before forced termination. Back up the database and media storage together according to the application's recovery requirements.

## Validation and release

```bash
cd engine/go
test -z "$(gofmt -l .)"
go mod verify
go vet ./...
go test ./...
cd ../..
bash scripts/build-engines.sh
```

The build produces exactly one Go executable:

```text
dist/engine/page-builder-cms-go
```

CI explicitly rejects root-level Go source files, rejects `cmd/page-builder-render`, and verifies that no `page-builder-renderer-go` artifact is produced.

The release workflow builds the CMS executable for Linux, macOS, and Windows on amd64 and arm64, embeds the release version, includes the CMS source archive, creates a capability manifest, and generates SHA-256 checksums. There is no separately distributed Go renderer library or renderer binary.
