#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist/engine"
VERSION="${PAGE_BUILDER_VERSION:-dev}"
mkdir -p "$DIST"
rm -f "$DIST/page-builder-cms-go" "$DIST/page-builder-renderer-go"

(
  cd "$ROOT/engine/go"
  CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X github.com/zaengit/page-builder/engine/go.EngineVersion=$VERSION" -o "$DIST/page-builder-cms-go" ./cmd/cms
  CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X github.com/zaengit/page-builder/engine/go.EngineVersion=$VERSION" -o "$DIST/page-builder-renderer-go" ./cmd/page-builder-render
)

printf 'Built %s\n' "$DIST/page-builder-cms-go"
printf 'Built %s\n' "$DIST/page-builder-renderer-go"
