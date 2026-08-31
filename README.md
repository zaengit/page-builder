# Zaengit Page Builder

Production-oriented Gutenberg/Shopify-style **page builder package for Laravel** with a React editor and Laravel Blade SSR. It is intentionally not a CMS: the host application owns users, authorization, models, persistence, publishing, tenancy and rate limiting.

## Install

```bash
composer require zaengit/page-builder
php artisan vendor:publish --tag=page-builder-config
```

Production tags include the compiled React editor. Mount it directly from Blade:

```blade
<x-page-builder::editor name="layout" :content="$page->layout ?? ['blocks' => []]" />
```

The hidden `layout` input is kept synchronized with Page JSON. You can also omit `name` and listen for the bubbling `page-builder:change` browser event.

## Architecture

```text
Page JSON
  -> PageContentValidator
  -> PageRenderer
  -> BlockRenderer
  -> Blade SSR
  -> lazy/deduplicated block CSS + JS
```

Core package code lives under `src/`; reusable block manifests under `blocks/`; the React editor under `editor/`; compiled release assets under `resources/dist/`.

## Custom blocks

```text
blocks/testimonial/
  block.json
  template.blade.php
  style.css       # optional
  frontend.js     # optional
```

Create one with:

```bash
php artisan make:block custom/testimonial
```

Manifests drive both SSR and the editor inspector. Supported attribute types include string, textarea, URL, image, number, range, boolean, select and nested repeaters. Manifests can declare `category`, `variations`, `supports.children` and `supports.allowedChildren`.

## Editor extension API

Register custom inspector controls after `page-builder:ready`:

```js
window.addEventListener('page-builder:ready', event => {
  event.detail.registerControl('color', ColorControl)
  event.detail.registerCategory('commerce', 'Commerce')
})
```

The editor supports grouped block insertion, presets/variations, nested drag-and-drop, undo/redo, duplicate, copy/paste and multiple editor mounts on one page.

### Media picker bridge

For an `image` control the editor emits `page-builder:media-request` from the editor root and, when embedded, `PAGE_BUILDER_MEDIA_REQUEST` through `postMessage`. The host returns:

```js
editorWindow.postMessage({
  type: 'PAGE_BUILDER_MEDIA_SELECTED',
  url: '/storage/example.jpg'
}, location.origin)
```

The package does not impose a media library.

## Runtime configuration

No editor endpoint is hard-coded when using the Blade component. URLs are generated from named Laravel routes, so custom `route_prefix` and `api_prefix` values work correctly.

```php
return [
    'route_prefix' => 'page-builder',
    'api_prefix' => 'api/page-builder',
    'middleware' => ['web', 'auth'],
    'asset_middleware' => [],
];
```

For local editor development only:

```dotenv
PAGE_BUILDER_EDITOR_DEV_SERVER=http://127.0.0.1:5173
```

## Persistence

The package stores nothing. The host application persists Page JSON wherever it wants:

```php
$page->layout = $request->input('layout');
$page->save();
```

For direct rendering:

```php
$html = app(\Zaengit\PageBuilder\Blocks\PageRenderer::class)->render($page->layout);
```

## Security boundary

The package provides recursive manifest validation, globally unique block IDs, type/bounds/options validation, maximum nesting/document size, Blade escaping, asset allowlisting, path traversal protection and same-origin preview messaging. Authentication, authorization, tenant boundaries and application CSP remain host responsibilities.

## Block tooling

```bash
php artisan blocks:list
php artisan blocks:cache
php artisan blocks:clear
```

## Development

```bash
composer install
cp .env.example .env
php artisan key:generate
vendor/bin/phpunit

cd editor
npm install
npm run build
```

`npm run build` writes deterministic `resources/dist/page-builder.js` and `resources/dist/page-builder.css` files used by Laravel in production.

## Release process

Run the GitHub **Release** workflow from `main` with a SemVer such as `1.0.0`. The workflow builds the editor, commits distributable assets, and only then creates/pushes `v1.0.0`. This guarantees Composer tags contain the compiled editor and production consumers do not need Node.js.

## CI production gate

Every pull request validates Composer metadata, installs dependencies, runs PHPUnit, compiles the React editor, and verifies the expected distributable assets exist. Merge only when both `backend` and `editor` jobs are green.
