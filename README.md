# Laravel + React Visual Page Builder

Runnable Gutenberg/Shopify-style visual page builder with Laravel SSR as the rendering source of truth.

## Current stack

- **PHP 8.5.10**
- **Laravel 13.29**
- **MySQL 26.7.1**
- **React 19.2.8**
- **TypeScript 7.0.2**
- **Vite 8.2.2**
- **Zustand 5.0.15**
- **dnd-kit core 6.3.1 / sortable 10.0.0 / utilities 3.2.2**
- **Node.js 26.8.1**

Only stable production releases are targeted. Beta, RC, canary, and experimental builds are intentionally excluded.

## Architecture

- **Laravel 13**: API, page storage, block registry, manifest loader, Blade SSR, preview and public rendering.
- **React + TypeScript + Zustand**: visual editor only.
- **Page JSON**: source of truth; draft and published versions are stored separately in MySQL JSON columns.
- **block.json**: block contract for schema, runtime data, and optional assets.
- **Blade**: SSR source of truth for preview and production.
- **dnd-kit**: recursive block-tree sorting and movement.
- **DataProviderRegistry**: resolves trusted runtime data before Blade rendering.
- **AssetCollector**: collects only assets used by rendered blocks and deduplicates them.

## Run

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

Editor:

```bash
cd editor
npm install
npm run dev
```

Open `http://localhost:5173`.

## Implemented slices

### Slice 1 — end-to-end publishing

`Heading → React editor → Page JSON → Blade SSR → iframe preview → save → publish → public page`

### Slice 2 — nested layout + drag and drop

Includes `core/container`, `core/columns`, recursive tree editing, nested selection, add/remove child blocks, dnd-kit reorder/move, and unsaved structural preview through `POST /api/render-page`.

### Slice 3 — dynamic data providers

`commerce/product-grid` declares `data.provider = products`. `DataProviderRegistry` resolves `ProductDataProvider`, builds runtime data, and passes it into Blade. Blade never queries MySQL directly.

### Slice 4 — per-block assets

Blocks can declare assets in `block.json`:

```json
{
  "assets": {
    "css": ["style.css"],
    "js": ["frontend.js"]
  }
}
```

During recursive render:

```text
PageRenderer
   ↓
BlockRenderer
   ↓
AssetCollector
   ↓
deduplicated CSS / JS URLs
   ↓
Preview + public HTML
```

Only assets from blocks actually present on the page are returned. Five instances of the same block still produce one CSS/JS URL.

Custom block assets remain outside `public/`. Laravel serves only manifest-declared files through `/block-assets/{namespace}/{block}/{asset}`. Asset names/extensions are validated by `BlockManifestLoader`, real paths are checked against the block directory, and the route rejects undeclared files.

The live editor also receives `assets` from `/api/render-page`. The preview iframe injects missing styles/modules dynamically and deduplicates them, so adding an asset-bearing block does not require an iframe reload.

`commerce/product-grid` now demonstrates this system with its own `style.css`.

## Security

- Blade escaping for user-controlled values
- trusted manifest registry
- path traversal protection
- asset filename + extension whitelist
- only manifest-declared assets can be served
- `X-Content-Type-Options: nosniff`
- same-origin `postMessage` validation
- mutable AssetCollector is request/lifecycle scoped

## Tests

```bash
php artisan test
```

Tests cover XSS/defaulting, recursive rendering, dynamic product data, draft/publish, asset deduplication, and rejection of undeclared block assets.

## Next slice

**Carousel React Island runtime**: SSR carousel markup first, then lazy client-side hydration/mount only when `core/carousel` exists on the page.
