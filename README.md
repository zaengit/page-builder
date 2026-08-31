# Laravel + React Visual Page Builder

Minimal end-to-end vertical slice for a Gutenberg/Shopify-style page builder.

## Current stack

- **PHP 8.5.10**
- **Laravel 13.29**
- **MySQL 26.7.1**
- **React 19.2.8**
- **TypeScript 7.0.2**
- **Vite 8.2.2**
- **Zustand 5.0.15**
- **dnd-kit core 6.3.1 / sortable 10.0.0**
- **Node.js 26.8.1**

Only stable production releases are targeted. Beta, RC, canary, and experimental builds are intentionally excluded.

## Architecture

- **Laravel 13**: API, page storage, block registry, manifest loader, Blade SSR, preview and public rendering.
- **React + TypeScript + Zustand**: visual editor only.
- **Page JSON**: source of truth; draft and published versions are stored separately in MySQL JSON columns.
- **block.json**: block contract. The editor builds its inserter and inspector from the manifest.
- **Blade**: SSR source of truth for both preview and production.

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
# create the MySQL database configured in .env
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

In a second terminal:

```bash
cd editor
npm install
npm run dev
```

Open `http://localhost:5173`. With no `?page=` query, the editor creates a draft page containing one Heading block. Editing the heading calls `POST /api/render-block` and patches the block inside the iframe through `postMessage`. Save writes draft JSON; Publish copies draft JSON to published JSON. The **View page** link opens Laravel SSR production output.

## Implemented vertical slice

```text
Heading block
  → block.json registry
  → React editor + dynamic inspector
  → Page JSON
  → Laravel Blade renderer
  → iframe preview
  → partial block render
  → save draft
  → publish
  → public SSR page
```

Security already present in this slice: Blade escaping, strict block-name/path checks, Laravel request validation, and `postMessage` origin validation.

## Tests

```bash
php artisan test
```

Current tests cover heading defaulting/XSS escaping and draft-to-published flow.

## Dependency policy

The project tracks the latest stable major versions instead of prerelease builds. Composer and npm constraints stay on the current stable release lines so compatible patch/minor releases can be picked up normally.

## Next slices

The architecture intentionally leaves the next features incremental: nested container/columns UI, DataProviderRegistry + product-grid, AssetCollector, carousel React Island runtime, undo/redo, dnd-kit sorting, auth/policies, manifest cache, CSP and preview rate limits.
