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
- **block.json**: block contract. The editor builds its inserter and inspector from the manifest.
- **Blade**: SSR source of truth for both preview and production.
- **dnd-kit**: recursive block-tree sorting and movement.

## Run

Requirements:

```text
PHP >= 8.5
Composer 2.x
Node.js >= 26.8.1
MySQL >= 26.7.1
```

Backend:

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

Default local database configuration:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=page_builder
DB_USERNAME=root
DB_PASSWORD=
```

Editor:

```bash
cd editor
npm install
npm run dev
```

Open `http://localhost:5173`. With no `?page=` query, the editor creates a draft page containing one Heading block.

## Implemented slices

### Slice 1 — end-to-end publishing

```text
Heading block
  → block.json registry
  → React editor + dynamic inspector
  → Page JSON
  → Laravel Blade renderer
  → iframe preview
  → save draft
  → publish
  → public SSR page
```

### Slice 2 — nested layout + drag and drop

Included blocks:

```text
core/heading
core/container
core/columns
```

Nested page JSON is rendered recursively by the existing Laravel `PageRenderer`. The editor has a recursive block tree with dnd-kit, supports selecting nested blocks, adding children to blocks whose manifest declares `supports.children`, removing blocks, reordering siblings, and moving blocks between populated parents.

Structural changes are previewed without saving: the editor posts the current draft JSON to `POST /api/render-page`, Laravel renders the same Blade block tree used by production, and the iframe replaces `#pb-canvas` through same-origin `postMessage`.

Example:

```json
{
  "blocks": [
    {
      "id": "container-1",
      "type": "core/container",
      "attrs": {"maxWidth": "1200px", "padding": "24px"},
      "children": [
        {
          "id": "heading-1",
          "type": "core/heading",
          "attrs": {"text": "Nested heading", "level": 2, "alignment": "left"}
        }
      ]
    }
  ]
}
```

Security already present: Blade escaping for user attributes, strict block-name/path checks, Laravel request validation, and `postMessage` origin validation. Layout templates output `$children` as trusted renderer-generated HTML; arbitrary database HTML is not executed.

## Tests

```bash
php artisan test
```

Tests cover heading defaulting/XSS escaping, recursive nested rendering, render-page preview, and draft-to-published flow.

## Dependency policy

The project tracks the latest stable major versions instead of prerelease builds. Composer and npm constraints stay on the current stable release lines so compatible patch/minor releases can be picked up normally.

## Next slices

Next implementation target: **DataProviderRegistry + commerce/product-grid**, followed by AssetCollector, carousel React Island runtime, undo/redo, auth/policies, manifest cache, CSP, and preview rate limits.
