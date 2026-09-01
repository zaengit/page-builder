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

Manifests drive both SSR and the editor inspector. Supported server-side attribute types are `string`, `textarea`, `url`, `image`, `number`, `range`, `boolean`, `select`, and nested `repeater` fields. Manifests can also declare `category`, `variations`, `supports.children`, and `supports.allowedChildren`.

### Block schema versioning

Every block manifest has a positive integer `version`; omitted versions default to `1`. New blocks created by the React editor are stamped with the current manifest version.

When a manifest changes incompatibly, increment its version and register one migration for each version step in the host application:

```php
use Zaengit\PageBuilder\Blocks\BlockMigrationRegistry;

app(BlockMigrationRegistry::class)->register('custom/testimonial', 1,
    function (array $attrs): array {
        return [
            'quote' => $attrs['text'] ?? '',
            'author' => $attrs['author'] ?? '',
        ];
    }
);
```

The callback migrates **attributes only**. Validation runs after all sequential migrations complete. A missing migration or Page JSON created by a future block schema is rejected with a validation error instead of being rendered with the wrong contract.

For example, moving directly from manifest version `1` to `3` requires registrations for both `1 -> 2` and `2 -> 3`.

## Editor extension API

Custom controls are presentation concerns, while `type` remains the server validation contract. Use the optional `control` key instead of inventing an unsupported attribute type:

```json
{
  "attributes": {
    "accent": {
      "type": "string",
      "control": "color",
      "label": "Accent color",
      "default": "#111111"
    }
  }
}
```

Then register the React control after the editor API becomes ready:

```js
window.addEventListener('page-builder:ready', event => {
  event.detail.registerControl('color', ColorControl)
  event.detail.registerCategory('commerce', 'Commerce')
})
```

The editor supports grouped block insertion, presets/variations, nested drag-and-drop, keyboard DnD sensors, undo/redo, duplicate, copy/paste, accessible inspector controls, and multiple editor mounts on one page.

### Media picker bridge

Image controls—including image fields nested inside repeaters—emit `page-builder:media-request` from the editor root and, when embedded, `PAGE_BUILDER_MEDIA_REQUEST` through `postMessage`.

The request contains the selected `blockId`, the current value, and an attribute `path`, for example `['slides', '0', 'image']`. The host returns the selected URL:

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

The package provides recursive manifest validation, globally unique block IDs, type/bounds/options validation, maximum nesting/document size, Blade escaping, asset allowlisting, path traversal protection, and same-origin preview messaging. Authentication, authorization, tenant boundaries, storage policy, and application CSP remain host responsibilities.

## Block tooling

```bash
php artisan blocks:list
php artisan blocks:cache
php artisan blocks:clear
```

## Development and verification

Backend:

```bash
composer install
cp .env.example .env
php artisan key:generate
vendor/bin/phpstan analyse --memory-limit=1G
vendor/bin/pint --test src routes config
vendor/bin/phpunit
```

Editor dependencies are locked in `editor/package-lock.json`; use `npm ci` rather than `npm install` for deterministic development and CI installs:

```bash
cd editor
npm ci
npm run test:coverage
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run build` writes deterministic `resources/dist/page-builder.js` and `resources/dist/page-builder.css` files used by Laravel in production.

## Release process

Run the GitHub **Release** workflow from `main` with a SemVer such as `1.0.0`. The workflow re-runs backend static analysis, formatting verification, PHPUnit, editor coverage tests, and a deterministic `npm ci` production build before committing distributable assets and creating the tag. Do not create tags manually if you rely on the packaged editor assets.

## CI production gate

Every pull request is read-only from the CI token and must pass all of these gates before merge:

- Composer metadata and dependency installation
- Larastan/PHPStan static analysis
- Laravel Pint formatting verification across `src`, `routes`, and `config`
- PHPUnit backend integration tests
- deterministic `npm ci` install from the committed lockfile
- Vitest unit tests with coverage thresholds
- TypeScript + Vite production build and distributable asset verification
- Playwright Chromium browser E2E covering editing, preview synchronization, history shortcuts, and keyboard-accessible controls
