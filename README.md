# Laravel + React Page Builder

A Gutenberg/Shopify-style **page builder engine** for Laravel with React editor tooling and Laravel Blade SSR.

This project is intentionally **not a CMS**. It does not own users, authentication, authorization, pages, publishing workflows, database tables, slugs, or content lifecycle. The Laravel application that installs the package decides how and where the resulting Page JSON is stored.

## Scope

The package is responsible for:

- block registry and `block.json` manifests
- manifest-driven inspector controls
- nested block editing and dnd-kit ordering
- Page JSON validation
- Blade SSR rendering
- iframe live preview
- per-block CSS/JS asset collection
- optional React Islands for interactive blocks
- generic runtime data-provider contracts
- undo/redo editor history
- block manifest cache and Artisan block tooling

The host Laravel application is responsible for:

- authentication and authorization
- models and database schema
- deciding which entity owns builder content
- save/autosave/versioning workflows
- publishing/status/slugs/routes
- application-level rate limiting and CSP/security policy

## Core data contract

The builder only produces and consumes Page JSON:

```json
{
  "blocks": [
    {
      "id": "block-1",
      "type": "core/heading",
      "attrs": {
        "text": "Hello World",
        "level": 2,
        "alignment": "left"
      }
    }
  ]
}
```

A host application can store that JSON anywhere, for example in its own model:

```php
$model->layout = $pageBuilderJson;
$model->save();
```

Rendering stays independent from persistence:

```php
$html = app(\App\Blocks\PageRenderer::class)->render($model->layout);
```

The namespace is still `App\\...` while this repository is used as the development harness. The next packaging step is extracting the engine to `src/` with a dedicated `PageBuilderServiceProvider` and package namespace.

## Current stack

- PHP 8.5.10
- Laravel 13.29
- React 19.2.8
- TypeScript 7.0.2
- Vite 8.2.2
- Zustand 5.0.15
- dnd-kit core 6.3.1 / sortable 10.0.0 / utilities 3.2.2
- Node.js 26.8.1

Only stable releases are targeted.

## Development harness

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan serve
```

Editor:

```bash
cd editor
npm install
npm run dev
```

Open `http://localhost:5173`.

No login, page record, or publish flow is required.

## Builder endpoints

```text
GET  /api/page-builder/blocks
POST /api/page-builder/render-block
POST /api/page-builder/render-page
GET  /page-builder/preview
GET  /block-assets/{namespace}/{block}/{asset}
```

These endpoints are intentionally builder-only. A host application may wrap them in its own auth, policies, middleware, route prefix, or tenancy rules.

## Editor integration

The editor keeps only `PageContent` in Zustand. It does not know about page IDs, users, slugs, draft/published states, or database models.

Host code can provide content to an embedded editor with same-origin `postMessage`:

```js
editorWindow.postMessage({
  type: 'SET_PAGE_BUILDER_CONTENT',
  content: pageJson
}, location.origin)
```

Changes are emitted as:

```js
{
  type: 'PAGE_BUILDER_CHANGE',
  content: pageJson
}
```

The editor also dispatches a local `page-builder:change` CustomEvent and includes a development-only **Copy JSON** action.

## Blocks

Current core examples:

```text
blocks/
  heading/
  container/
  columns/
  carousel/
```

Typical custom block:

```text
blocks/
  testimonial/
    block.json
    template.blade.php
    style.css
    frontend.js        # optional
```

Generate a starter block:

```bash
php artisan make:block custom/testimonial
```

Manifest tools:

```bash
php artisan blocks:list
php artisan blocks:cache
php artisan blocks:clear
```

## Runtime data providers

`DataProviderRegistry` and `BlockDataProvider` stay generic, but the package registers **no application-specific providers**. The host application can register its own provider for products, posts, inventory, API data, or any other domain model.

## Recursive validation

`PageContentValidator` validates Page JSON using the registered block manifests:

- block IDs are required and globally unique
- block types must exist in `BlockRegistry`
- only manifest-declared attributes are accepted
- string, textarea, URL/image, number/range, boolean, select, and repeater schemas are validated
- select options and numeric limits are enforced
- nested repeater fields are validated recursively
- children are accepted only for blocks with `supports.children=true`
- maximum nesting depth: 20
- maximum blocks per document: 1000

Invalid content returns Laravel 422 errors with dotted paths such as `blocks.1.children.0.attrs.level`.

## Rendering and assets

```text
Page JSON
   ↓
PageContentValidator
   ↓
PageRenderer
   ↓
BlockRenderer
   ↓
Blade SSR
   ↓
AssetCollector
```

Only assets belonging to blocks present in the document are emitted, and repeated block assets are deduplicated.

`core/carousel` demonstrates SSR-first interactivity: its complete content exists in Blade HTML before its optional React Island enhances the block.

## Security boundary

The builder package handles security that belongs to block rendering itself:

- Blade escaping for user-controlled values
- manifest validation
- recursive Page JSON validation
- block asset allowlisting
- filesystem path traversal protection
- same-origin preview messaging

Authentication, authorization, global CSP, security headers, and rate limiting belong to the host application and are deliberately not imposed by the builder package.

## CI

GitHub Actions verifies:

```text
backend
  PHP 8.5
  composer install
  php artisan test

editor
  Node.js 26.8.1
  npm install
  npm run build
```

## Next packaging step

Extract the development-harness implementation into a real Laravel package structure:

```text
src/
  PageBuilderServiceProvider.php
  Blocks/
  DataProviders/
  Http/
resources/
routes/
editor/
```

Then expose configurable route prefixes, block paths, views, editor assets, and extension hooks without shipping CMS concerns.
