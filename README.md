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
- **React + TypeScript + Zustand**: authenticated visual editor only.
- **Page JSON**: source of truth; draft and published versions are stored separately in MySQL JSON columns.
- **block.json**: block contract for schema, runtime data, and optional assets.
- **Blade**: SSR source of truth for preview and production.
- **dnd-kit**: recursive block-tree sorting and movement.
- **DataProviderRegistry**: resolves trusted runtime data before Blade rendering.
- **AssetCollector**: collects only assets used by rendered blocks and deduplicates them.
- **React Islands**: optional per-block storefront interactivity; non-interactive pages do not load carousel React code.
- **Editor history**: immutable Page JSON snapshots back undo/redo across attrs, repeaters, nested add/remove, and drag/drop.
- **Laravel session auth + PagePolicy**: editor API and draft preview are owner-restricted while published storefront routes remain public.
- **Persistent block manifest cache**: validated block manifests can be warmed once and reused across requests.
- **SecurityHeaders + RateLimiter**: CSP/security headers and named throttles protect storefront, preview, render, and auth traffic.
- **PageContentValidator**: recursively enforces page structure and `block.json` attribute contracts before preview rendering or persistence.

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

Open `http://localhost:5173`. Create an account or sign in from the editor. New pages are automatically owned by the authenticated user.

## Implemented slices

### Slice 1 — end-to-end publishing
`Heading → React editor → Page JSON → Blade SSR → iframe preview → save → publish → public page`

### Slice 2 — nested layout + drag and drop
Includes `core/container`, `core/columns`, recursive tree editing, nested selection, add/remove child blocks, dnd-kit reorder/move, and unsaved structural preview through `POST /api/render-page`.

### Slice 3 — dynamic data providers
`commerce/product-grid` declares `data.provider = products`. `DataProviderRegistry` resolves `ProductDataProvider`, builds runtime data, and passes it into Blade.

### Slice 4 — per-block assets
`AssetCollector` loads only manifest-declared CSS/JS for blocks actually rendered and deduplicates repeated block assets.

### Slice 5 — SSR carousel + lazy React Island
`core/carousel` renders complete Blade SSR markup first. Its CSS and `frontend.js` load only when the block exists, and each carousel mounts as an independent React 19 island.

### Slice 6 — undo / redo editor history
All Page JSON mutations use one bounded 100-snapshot history model. Save/Publish preserve history and dirty state compares against the last saved Page JSON snapshot.

### Slice 7 — authentication + authorization
Laravel session auth protects builder APIs. `Page.user_id` plus `PagePolicy` enforce owner-only read/update/publish/preview while published storefront routes remain public.

### Slice 8 — persistent manifest cache + Artisan block commands

```bash
php artisan blocks:list
php artisan blocks:cache
php artisan blocks:clear
php artisan make:block custom/promo-banner
```

`make:block` scaffolds a validated `block.json` plus an escaped Blade template and clears stale manifest cache.

### Slice 9 — CSP, rate limiting, and CI

Public pages, preview pages, and block assets pass through `SecurityHeaders` with CSP, referrer policy, content-type protection, frame policy, and permissions policy. Named rate limiters protect auth, render, and preview traffic.

GitHub Actions CI contains independent backend and editor jobs. The latest verified run completed successfully: backend Composer install + `php artisan test`, and editor TypeScript + Vite production build both passed.

### Slice 10 — recursive Page JSON validation

`PageContentValidator` is shared by live render and page persistence, so the payload accepted by preview is the same payload allowed into `draft_content`.

It validates recursively:

```text
Page JSON
  blocks[]
    id      → required, <=100 chars, globally unique
    type    → must exist in BlockRegistry
    attrs   → object, known keys only
      ↓
    block.json attribute schema
      string / textarea / url / image
      number / range + min/max
      boolean
      select + allowed options
      repeater + nested field schemas
    children[]
      → list
      → only when supports.children=true
      → recursively validated
```

Safety bounds:

```text
maximum nesting depth: 20
maximum blocks/page:    1000
```

Unknown block types, duplicate IDs, unknown attributes/repeater fields, invalid select values, invalid attribute types, and unsupported children return Laravel 422 validation errors with dotted paths such as `blocks.1.children.0.attrs.level`.

## Security

- Laravel session authentication for builder routes
- encrypted session-cookie handling
- page ownership enforced with `PagePolicy`
- owner-only draft previews
- named rate limits on auth/render/preview
- CSP and standard browser security headers
- recursive manifest-driven Page JSON validation
- Blade escaping for user-controlled values
- React renders slide text as text nodes, not raw HTML
- trusted manifest registry
- path traversal protection
- asset filename + extension whitelist
- only manifest-declared assets can be served
- same-origin `postMessage` validation
- mutable AssetCollector is request/lifecycle scoped

## Tests

```bash
php artisan test
```

Backend tests cover authentication, ownership/policies, recursive rendering, recursive payload validation, dynamic data, asset deduplication, carousel SSR/lazy assets, secure asset serving, and block-registry cache commands. GitHub Actions also compiles the React/TypeScript editor.

## Next slice

**Local storefront bundling + nonce-based CSP**, followed by page management UI, autosave/versioning, and richer Gutenberg-style controls.
