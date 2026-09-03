# Go Engine

`engine/go/` is a standalone Go module and public renderer library. Import `github.com/zaengit/page-builder/engine/go`, construct `pagebuilder.New()` or `NewWithProvider`, and pass canonical Page JSON plus a runtime-loaded block registry.

The CLI at `cmd/page-builder-render` implements renderer protocol v1 over stdin/stdout. `--version` reports engine, protocol, and specification versions. Hosts may implement `DatasourceAdapter` to connect SQL, an ORM, HTTP, or another storage system without changing Page JSON.

Run `go test ./...` from `engine/go/`. Release builds are produced for the supported OS/architecture matrix with embedded engine version metadata and SHA-256 checksums.
