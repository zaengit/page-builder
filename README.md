# Zaengit Page Builder

Production-oriented Gutenberg/Shopify-style **page builder package for Laravel** with a React editor and Laravel Blade SSR. It is intentionally not a CMS: the host application owns users, authorization, models, persistence, publishing, tenancy, media storage, revisions and rate limiting.

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
  -> dynamic data bindings
  -> Blade SSR
  -> responsive block styles
  -> lazy/deduplicated block CSS + JS
```

Core package code lives under `src/`; reusable block manifests under `blocks/`; the React editor under `editor/`; compiled release assets under `resources/dist/`.

The Laravel application shell in this repository (`artisan`, `bootstrap/`, `public/`, and framework config files) is a development/CI harness. The public package contract remains the service provider, `src/`, package routes/views/config, block manifests and compiled editor assets; the package does not become a CMS or own the host application's domain models.

## Page JSON

A page can carry global settings and each block can carry presentation, binding and locking metadata without changing the block's server-side attribute contract:

```json
{
  "schemaVersion": 1,
  "settings": {
    "contentWidth": "1200px",
    "background": "#ffffff",
    "tokens": { "brand": "#2563eb" }
  },
  "blocks": [
    {
      "id": "hero-title",
      "type": "core/heading",
      "version": 1,
      "attrs": { "text": "Hello", "level": 1, "alignment": "left" },
      "styles": {
        "fontSize": { "desktop": "56px", "tablet": "42px", "mobile": "34px" },
        "padding": { "desktop": "48px", "mobile": "24px" }
      },
      "bindings": {
        "text": { "source": "product", "path": "title", "fallback": "Hello" }
      },
      "lock": { "move": false, "remove": false, "edit": false }
    }
  ]
}
```

Responsive values use `desktop`, `tablet` and `mobile`. The renderer only serializes allowlisted style properties; block attributes remain validated by their manifests.

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

Manifests drive both SSR and the editor inspector. Supported server-side attribute types are `string`, `textarea`, `url`, `image`, `number`, `range`, `boolean`, `select`, `color`, `date`, `code`, and nested `repeater` fields.

Attributes may additionally declare:

```json
{
  "padding": {
    "type": "string",
    "label": "Padding",
    "responsive": true,
    "default": { "desktop": "32px", "mobile": "16px" }
  },
  "autoplaySpeed": {
    "type": "number",
    "visibleWhen": { "attribute": "autoplay", "truthy": true },
    "default": 4000
  }
}
```

Manifests can declare `category`, `variations`, `supports.children`, `supports.allowedChildren`, named `supports.slots`, `supports.inline`, `supports.styles`, `supports.lock`, and `supports.reusable`.

### Named slots

Container-style blocks may constrain children to named regions:

```json
{
  "supports": {
    "children": true,
    "slots": [
      { "name": "header", "allowedChildren": ["core/heading"] },
      { "name": "body" }
    ]
  }
}
```

A child Page JSON node stores its target as `"slot": "header"`. The server validator rejects unknown slots and disallowed child types.

### Inline SSR editing

The preview remains server rendered. A Blade template can expose a text attribute for direct editing in the canvas:

```blade
<h2
    data-block-id="{{ $blockId }}"
    @if($preview) data-pb-inline="text" contenteditable="true" @endif
>{{ $attrs['text'] ?? '' }}</h2>
```

The preview sends the edit back to React through a same-origin `postMessage`, so WYSIWYG editing uses the same Blade output as the frontend instead of maintaining a second React renderer.

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

## Editor capabilities

The editor provides SSR iframe preview, direct inline text editing, desktop/tablet/mobile preview widths, responsive block design values, page settings, nested drag-and-drop, keyboard DnD sensors, named-slot-aware insertion contracts, undo/redo, duplicate, copy/paste, block locking, conditional controls, dynamic bindings, patterns, templates, JSON import/export, a compact canvas toolbar and accessible inspector controls.

Undo/redo history is intentionally editor-local. Persistent revisions remain a host concern and can be created whenever the host receives save lifecycle events.

### Patterns and templates

Patterns are reusable block trees. Templates are full Page JSON documents. A host can provide both in editor runtime configuration, or extensions can register patterns dynamically. Inserting a pattern renews block IDs to keep the document globally unique.

### Editor extension API

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

Register editor extensions after the editor API becomes ready:

```js
window.addEventListener('page-builder:ready', event => {
  const api = event.detail

  api.registerControl('color', ColorControl)
  api.registerCategory('commerce', 'Commerce')
  api.registerBlockEditor('commerce/product-grid', ProductGridEditor)
  api.registerTransform('core/heading', {
    name: 'heading-to-hero-title',
    title: 'Convert to hero title',
    to: 'marketing/hero-title'
  })
  api.registerToolbarAction({
    id: 'custom-action',
    title: 'Custom action',
    run: block => console.log(block)
  })
  api.registerInspectorPanel({
    id: 'seo',
    title: 'SEO',
    render: SeoInspectorPanel
  })
  api.registerPattern({
    id: 'hero-centered',
    title: 'Centered hero',
    blocks: []
  })
})
```

This separates SSR output from editor-specific React UX: complex carousel, tabs, commerce or data blocks can have a dedicated React inspector/editor while the public page still renders from Blade.

## Dynamic data binding

Register host-owned data providers through `DataProviderRegistry`. The editor can expose provider names as data sources; a block binding selects the provider and optional dot-path. `DynamicBindingResolver` resolves the value immediately before Blade SSR and supports a fallback value when the provider does not return data.

The package never assumes products, posts or users exist. Those data contracts belong to the host application.

## Save, autosave and revisions

The package does not persist pages itself. The editor emits lifecycle events so the host can choose normal save, autosave and revision behavior:

- `page-builder:change` — Page JSON changed.
- `page-builder:dirty` — editor has unsaved changes.
- `page-builder:save-request` — host should persist the current Page JSON. `detail.autosave` distinguishes autosave from an explicit save.
- `page-builder:save` — explicit save action was requested.

Embedded editors mirror the same lifecycle through `PAGE_BUILDER_CHANGE`, `PAGE_BUILDER_SAVE_REQUEST` and `PAGE_BUILDER_SAVE` same-origin messages.

A host can implement revisions without coupling them to this package:

```js
editor.addEventListener('page-builder:save-request', event => {
  savePage(event.detail.content)
  createRevision(event.detail.content)
})
```

Set `autosaveMs` in the editor runtime when automatic save requests are desired. A value of `0` leaves autosave disabled.

## Media picker bridge

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

The package provides recursive manifest validation, globally unique block IDs, schema migration checks, type/bounds/options validation, responsive-value validation, named-slot validation, style allowlisting, maximum nesting/document size, Blade escaping, asset allowlisting, path traversal protection, same-origin preview messaging, and guarded dynamic-provider resolution. Authentication, authorization, tenant boundaries, storage policy, revision retention, data-provider authorization and application CSP remain host responsibilities.

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
- Playwright Chromium browser E2E covering editing, preview synchronization, history shortcuts and keyboard-accessible controls
