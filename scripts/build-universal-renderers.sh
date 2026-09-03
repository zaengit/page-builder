#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist/renderers"
mkdir -p "$DIST"

echo "Building Go renderer..."
(
  cd "$ROOT/renderers/go"
  go build -trimpath -ldflags="-s -w" -o "$DIST/page-builder-render-go" ./cmd/page-builder-render
)

echo "Building Rust renderer..."
(
  cd "$ROOT/renderers/rust"
  cargo build --release --bin page-builder-render
  cp target/release/page-builder-render "$DIST/page-builder-render-rust"
)

cat > "$DIST/page-builder-render-node" <<EOF
#!/usr/bin/env bash
exec node "$ROOT/renderers/node/cli.mjs"
EOF
chmod +x "$DIST/page-builder-render-node"

cat > "$DIST/page-builder-render-python" <<EOF
#!/usr/bin/env bash
exec python3 "$ROOT/renderers/python/cli.py"
EOF
chmod +x "$DIST/page-builder-render-python"

printf '\nBuilt renderers in %s\n' "$DIST"
printf '  %s\n' \
  "$DIST/page-builder-render-go" \
  "$DIST/page-builder-render-rust" \
  "$DIST/page-builder-render-node" \
  "$DIST/page-builder-render-python"
