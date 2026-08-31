# Zaengit Page Builder

A Gutenberg/Shopify-style **page builder package for Laravel** with a React editor and Laravel Blade SSR.

This package is intentionally **not a CMS**. It does not own users, authentication, authorization, pages, publishing, slugs, statuses, tenancy, database tables, rate limiting, or application CSP. The host Laravel application owns those concerns and decides where Page JSON is stored.

## Package structure

```text
src/
  PageBuilderServiceProvider.php
  Blocks/
  DataProviders/
  Http/Controllers/
config/
  page-builder.php
routes/
  page-builder.php
  console.php
resources/views/
  preview.blade.php
blocks/
  heading/
  container/
  columns/
  carousel/
editor/
```

Composer autoloads:

```text
Zaengit\PageBuilder\ => src/
```

`PageBuilderServiceProvider` is registered through Laravel package discovery. The Laravel application files kept in this repository are only a development/test harness.

## Install in a Laravel application

```bash
composer require zaengit/page-builder
php artisan vendor:publish --tag=page-builder-config
```

The package ships its own core blocks and also reads application-owned custom blocks from `base_path('blocks')` by default.

## Core data contract

The builder only consumes and produces Page JSON:

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

The host application can store this JSON anywhere:

```php
$post->layout = $pageJson;
$post->save();
```

Rendering is independent from persistence:

```php
use Zaengit\PageBuilder\Blocks\PageRenderer;

$html = app(PageRenderer::class)->render($post->layout);
```

## Routes

Defaults:

```text
GET  /api/page-builder/blocks
POST /api/page-builder/render-block
POST /api/page-builder/render-page
GET  /page-builder/preview
GET  /block-assets/{namespace}/{block}/{asset}
```

The host application can configure prefixes and middleware in `config/page-builder.php`:

```php
return [
    'route_prefix' => 'page-builder',
    'api_prefix' => 'api/page-builder',
    'middleware' => ['web', 'auth'],
    'asset_middleware' => [],
];
```

The package does not impose authentication or authorization itself.

## Block discovery

By default manifests are discovered from both:

```text
vendor/zaengit/page-builder/blocks   # package core blocks
base_path('blocks')                  # application custom blocks
```

Paths can be changed through `page-builder.block_paths`.

A custom block can look like:

```text
blocks/testimonial/
  block.json
  template.blade.php
  style.css
  frontend.js        # optional
```

Generate one with:

```bash
php artisan make:block custom/testimonial
```

The generator writes to `page-builder.custom_blocks_path`.

Manifest tooling:

```bash
php artisan blocks:list
php artisan blocks:cache
php artisan blocks:clear
```

## Block contract

`block.json` drives both Laravel rendering and the React inspector. It can define attribute schemas, nested-block support, runtime provider names, and optional CSS/JS assets.

`PageContentValidator` recursively enforces the manifest contract before render:

- globally unique block IDs
- registered block types only
- declared attributes only
- string/textarea/url/image values
- number/range bounds
- booleans
- select options
- nested repeater fields
- `supports.children`
- maximum nesting depth 20
- maximum 1000 blocks per document

## Rendering

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

Only assets belonging to blocks actually present in a document are returned, and repeated assets are deduplicated.

`core/carousel` demonstrates SSR-first interactivity: usable Blade markup exists before its optional React Island enhances it.

## Runtime data providers

The package exposes generic contracts only:

```php
use Zaengit\PageBuilder\DataProviders\BlockDataProvider;
use Zaengit\PageBuilder\DataProviders\DataProviderRegistry;
```

The host application registers domain-specific providers such as products, posts, menus, inventory, or external API data. The package ships no application model or database migration.

## React editor

The editor stores only `PageContent`; it knows nothing about model IDs, users, slugs, draft/published state, or persistence.

A host can send initial content:

```js
editorWindow.postMessage({
  type: 'SET_PAGE_BUILDER_CONTENT',
  content: pageJson
}, location.origin)
```

Changes are emitted as `PAGE_BUILDER_CHANGE` messages and `page-builder:change` browser events. The host decides when/how to persist them.

## Security boundary

The package handles rendering-level concerns:

- Blade escaping
- recursive manifest-driven validation
- asset allowlisting
- filesystem path traversal protection
- same-origin preview messaging

The host application owns authentication, policies, tenant isolation, global CSP/security headers, and rate limiting.

## Development

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

## Next

Package the built React editor assets for direct Laravel integration, add a first-class Blade/editor mount component, and expose extension hooks for custom inspector controls and block categories.
