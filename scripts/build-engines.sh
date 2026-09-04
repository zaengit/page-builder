#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist/engine"
VERSION="${PAGE_BUILDER_VERSION:-dev}"
mkdir -p "$DIST"
rm -f "$DIST/page-builder-cms-go" "$DIST/page-builder-renderer-go"

(
  cd "$ROOT/engine/go"
  CGO_ENABLED=0 go build -trimpath \
    -ldflags="-s -w -X github.com/zaengit/page-builder/engine/go/internal/render/engine.EngineVersion=$VERSION" \
    -o "$DIST/page-builder-cms-go" ./cmd/cms
)

printf 'Built %s\n' "$DIST/page-builder-cms-go"
