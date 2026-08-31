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
- **React Islands**: optional per-block storefront interactivity; non-interactive pages do not load carousel React code.

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

### Slice 5 — SSR carousel + lazy React Island

`core/carousel` demonstrates optional storefront React:

```text
Page JSON
   ↓
Blade SSR carousel markup
   ↓
HTML + CSS works without JavaScript
   ↓
AssetCollector sees frontend.js
   ↓
frontend.js loads only on pages using carousel
   ↓
React mounts each carousel independently
```

The block manifest contains `title`, `autoplay`, `interval`, and a schema-driven `items` repeater. The editor now supports repeater fields generically, so slide add/remove/title/description/image controls are generated from `block.json` rather than hard-coded for carousel.

Blade prints all slide content before JavaScript executes. `frontend.js` then mounts a React 19 island into each `[data-carousel-island]`, adding previous/next controls, dots, and autoplay. A `MutationObserver` discovers carousel blocks inserted by live preview updates, so structural edits do not require an iframe reload.

Multiple carousel instances have independent state while AssetCollector emits only one copy of:

```text
/block-assets/core/carousel/style.css
/block-assets/core/carousel/frontend.js
```

A heading-only page resets to an empty JS asset list, so the visitor storefront does not download carousel React code when no interactive block exists.

## Security

- Blade escaping for user-controlled values
- React renders slide text as text nodes, not raw HTML
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

Tests cover XSS/defaulting, recursive rendering, dynamic product data, draft/publish, asset deduplication, rejection of undeclared block assets, carousel SSR output, lazy React asset loading, and carousel asset deduplication.

## Next slice

**Undo/redo editor history**, followed by authentication/policies, manifest cache + Artisan block commands, CSP, and preview rate limiting.
