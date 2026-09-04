# Go CMS

`engine/go/` is the production standalone Go CMS implementation of the universal page-builder specification. The primary executable is `cmd/cms`; the legacy `cmd/page-builder-render` command remains only as a renderer-protocol compatibility/conformance executable.

## Run

```bash
cd engine/go
go mod tidy
go run ./cmd/cms
```

Default database is SQLite at `page-builder.db`. The CMS uses GORM and supports SQLite, PostgreSQL, MySQL/MariaDB, and SQL Server through `DB_DRIVER` and `DB_DSN`.

Important environment variables: `HTTP_ADDR`, `APP_ENV`, `DB_DRIVER`, `DB_DSN`, `DB_AUTO_MIGRATE`, `STORAGE_PATH`, `PUBLIC_STORAGE_PATH`, `BLOCK_ROOT`, `MAX_UPLOAD_BYTES`, `CORS_ORIGINS`, and HTTP/render timeout settings.

Production endpoints include `/health`, `/ready`, page CRUD/publish APIs under `/api/pages`, portable block discovery under `/api/blocks`, media under `/api/media`, global settings under `/api/settings`, page preview via `/api/render/page`, and published frontend pages at `/{slug}`.

The renderer remains compatible with the canonical top-level `specification/` and portable `blocks/` contracts.
