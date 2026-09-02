# Custom blocks

Page Builder custom blocks are filesystem modules rendered by Laravel Blade. React is the editor shell; public output remains server rendered.

## Create a block

```bash
php artisan make:block custom/hero
```

The default `basic` preset creates:

```text
blocks/hero/
  block.json
  template.blade.php
  style.css
```

It enables block styles, locking and direct inline editing for its `text` attribute.

## Scaffold presets

### Basic

```bash
php artisan make:block custom/hero --preset=basic
```

Use for text, image, CTA and other normal content blocks. The generated Blade template demonstrates `data-pb-inline` so the SSR preview can edit text directly.

### Interactive

```bash
php artisan make:block custom/carousel --preset=interactive
```

Creates:

```text
blocks/carousel/
  block.json
  template.blade.php
  style.css
  frontend.js
```

The manifest registers CSS and JavaScript as block assets. `frontend.js` uses a per-element initialization guard so the same asset can safely run when the editor refreshes SSR HTML or when multiple instances exist on a page.

Use this preset for carousels, accordions, tabs, sliders and similar browser behavior. Keep persisted state in block attributes; frontend JavaScript should enhance the Blade HTML rather than become a second renderer.

### Container

```bash
php artisan make:block custom/section --preset=container
```

Creates a child-capable layout block with `header` and `body` named slots. Customize `supports.slots` and optional `allowedChildren` rules in `block.json` for your layout contract.

## Validate manifests

Validate all registered manifests without touching the block cache:

```bash
php artisan blocks:validate
```

Validate and warm the production cache:

```bash
php artisan blocks:cache
```

Clear cached manifests:

```bash
php artisan blocks:clear
```

List the current block registry:

```bash
php artisan blocks:list
```

## Block contract

A block manifest controls editor fields and runtime capabilities. Blade remains the frontend renderer.

```json
{
  "name": "custom/hero",
  "version": 1,
  "title": "Hero",
  "category": "custom",
  "attributes": {
    "title": {
      "type": "string",
      "label": "Title",
      "default": "Hello"
    }
  },
  "supports": {
    "styles": true,
    "lock": true,
    "inline": ["title"]
  },
  "assets": {
    "css": ["style.css"],
    "js": ["frontend.js"]
  }
}
```

## Interactive JavaScript rules

Frontend scripts should be idempotent because preview rendering can replace block HTML during editing. Scope queries to each block root and mark initialized elements before binding listeners.

```js
document.querySelectorAll('[data-my-block]').forEach((block) => {
  if (block.dataset.ready === 'true') return
  block.dataset.ready = 'true'

  // Bind this block instance here.
})
```

Do not store application domain data, authentication state or persistence logic in the package block. Those remain responsibilities of the host Laravel application.
