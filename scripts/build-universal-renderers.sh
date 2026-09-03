#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist/renderers"
mkdir -p "$DIST"

rm -f \
  "$DIST/page-builder-render-go" \
  "$DIST/page-builder-render-rust" \
  "$DIST/page-builder-render-node" \
  "$DIST/page-builder-render-python"

echo "Building Go renderer..."
(
  cd "$ROOT/renderers/go"
  go build -trimpath -ldflags="-s -w" -o "$DIST/page-builder-render-go" ./cmd/page-builder-render
)

printf '\nBuilt supported external renderer in %s\n' "$DIST"
printf '  %s\n' "$DIST/page-builder-render-go"
