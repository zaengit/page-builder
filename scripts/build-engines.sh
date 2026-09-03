#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist/engine"
VERSION="${PAGE_BUILDER_VERSION:-dev}"
mkdir -p "$DIST"
rm -f "$DIST/page-builder-engine-go"

(
  cd "$ROOT/engine/go"
  go build -trimpath -ldflags="-s -w -X github.com/zaengit/page-builder/engine/go.EngineVersion=$VERSION" -o "$DIST/page-builder-engine-go" ./cmd/page-builder-render
)

printf 'Built %s\n' "$DIST/page-builder-engine-go"
