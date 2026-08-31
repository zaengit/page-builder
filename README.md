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

`commerce/product-grid` declares `data.provider = products`. `DataProviderRegistry` resolves `ProductDataProvider`, builds runtime data, and passes it into Blade. Blade never queries MySQL directly.

### Slice 4 — per-block assets

Blocks can declare CSS/JS in `block.json`. `AssetCollector` gathers only assets used by rendered blocks, deduplicates them, and serves manifest-declared files through `/block-assets/{namespace}/{block}/{asset}` with path validation.

### Slice 5 — SSR carousel + lazy React Island

`core/carousel` renders complete Blade SSR markup first. Its CSS and `frontend.js` load only when the block exists, and each carousel mounts as an independent React 19 island. Multiple instances still emit one CSS URL and one JS URL.

### Slice 6 — undo / redo editor history

All Page JSON mutations use one bounded 100-snapshot history model. Undo/Redo covers attrs, repeaters, add/remove, nested changes, and dnd-kit moves. Save/Publish preserve history, and dirty state is compared against the last saved Page JSON snapshot.

Keyboard shortcuts:

```text
Ctrl/Cmd + Z          Undo
Ctrl/Cmd + Shift + Z  Redo
Ctrl + Y              Redo
```

### Slice 7 — authentication + authorization

The editor uses Laravel's built-in session guard. No external auth package is required.

```text
React login/register
      ↓
Laravel session
      ↓
authenticated builder API
      ↓
Page.user_id
      ↓
PagePolicy
      ↓
view / update / publish / preview authorization
```

Endpoints:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

Builder routes (`/api/blocks`, render endpoints, and page CRUD/publish) require an authenticated session. Session cookies use Laravel cookie encryption, queued-cookie handling, and session middleware. `PagePolicy` only permits the owner to read, update, publish, or preview a draft page. New pages are created through `$request->user()->pages()` so ownership is assigned server-side rather than trusted from client JSON.

Draft preview requires authentication before policy authorization. Published storefront routes remain public and only render `published_content`.

For local development, Vite proxies `/api`, `/preview`, and `/block-assets` to Laravel so the same session cookie works inside the editor and preview iframe.

Existing installations receive a nullable `pages.user_id` migration to avoid breaking old rows. Legacy pages with no owner are intentionally inaccessible from the editor until ownership is assigned.

### Slice 8 — persistent manifest cache + Artisan block commands

`BlockRegistry` now stores validated definitions in Laravel cache under a versioned key. This avoids rescanning and reparsing every `blocks/*/block.json` on every request while keeping the loader as the validation source of truth.

Commands:

```bash
php artisan blocks:list
php artisan blocks:cache
php artisan blocks:clear
php artisan make:block custom/promo-banner
```

`blocks:cache` reloads and validates every manifest before writing the persistent cache. `blocks:clear` invalidates it. `blocks:list` shows the currently registered block name/title/category.

`make:block namespace/block` creates:

```text
blocks/block/
  block.json
  template.blade.php
```

The generated manifest contains one starter string attribute and the generated Blade template escapes it by default. Creating a block clears the existing registry cache so stale definitions are not kept accidentally.

## Security

- Laravel session authentication for builder routes
- encrypted session cookies
- page ownership enforced with `PagePolicy`
- draft previews are owner-only
- ownership assigned server-side
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

Backend tests cover authentication requirements, page ownership, cross-user denial, owner preview/publish behavior, XSS/defaulting, recursive rendering, dynamic product data, asset deduplication, secure asset serving, carousel SSR/lazy React assets, and block registry cache command behavior.

## Next slice

**CSP + preview rate limiting**, followed by CI/build verification and production hardening.
