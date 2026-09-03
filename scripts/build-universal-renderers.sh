#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist/engine"
mkdir -p "$DIST"

rm -f "$DIST/page-builder-engine-go"

echo "Building Go engine..."
(
  cd "$ROOT/engine/go"
  go build -trimpath -ldflags="-s -w" -o "$DIST/page-builder-engine-go" ./cmd/page-builder-render
)

printf '\nBuilt supported standalone engine in %s\n' "$DIST"
printf '  %s\n' "$DIST/page-builder-engine-go"
