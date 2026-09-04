#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist/engine"
VERSION="${PAGE_BUILDER_VERSION:-dev}"
EDITOR_DIST="$ROOT/editor/dist"
EMBED_DIR="$ROOT/engine/go/internal/web/static"

mkdir -p "$DIST"
rm -f "$DIST/page-builder-cms-go" "$DIST/page-builder-renderer-go"

(
  cd "$ROOT/editor"
  npm ci --no-audit --no-fund
  npm run build
)

test -s "$EDITOR_DIST/go.html"
test -s "$EDITOR_DIST/page-builder.js"
test -s "$EDITOR_DIST/page-builder.css"

rm -rf "$EMBED_DIR"
mkdir -p "$EMBED_DIR"
cp -R "$EDITOR_DIST"/. "$EMBED_DIR"/
mv "$EMBED_DIR/go.html" "$EMBED_DIR/index.html"

(
  cd "$ROOT/engine/go"
  CGO_ENABLED=0 go build -trimpath \
    -ldflags="-s -w -X github.com/zaengit/page-builder/engine/go/internal/render/engine.EngineVersion=$VERSION" \
    -o "$DIST/page-builder-cms-go" ./cmd/cms
)

printf 'Built %s with embedded React editor at /admin/\n' "$DIST/page-builder-cms-go"
