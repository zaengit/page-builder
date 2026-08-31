# Laravel + React Visual Page Builder

Minimal end-to-end vertical slice for a Gutenberg/Shopify-style page builder.

## Architecture

- **Laravel 12**: API, page storage, block registry, manifest loader, Blade SSR, preview and public rendering.
- **React + TypeScript + Zustand**: visual editor only.
- **Page JSON**: source of truth; draft and published versions are stored separately in PostgreSQL JSONB.
- **block.json**: block contract. The editor builds its inserter and inspector from the manifest.
- **Blade**: SSR source of truth for both preview and production.

## Run

```bash
cp .env.example .env
composer install
php artisan key:generate
# create the PostgreSQL database configured in .env
php artisan migrate
php artisan serve
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

## Next slices

The architecture intentionally leaves the next features incremental: nested container/columns UI, DataProviderRegistry + product-grid, AssetCollector, carousel React Island runtime, undo/redo, dnd-kit sorting, auth/policies, manifest cache, CSP and preview rate limits.
