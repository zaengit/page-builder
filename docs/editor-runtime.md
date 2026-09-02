# Laravel editor runtime registration

The page builder can receive reusable editor resources from the host Laravel application without owning persistence or CMS models.

## Patterns and templates

Register reusable block trees and full-page templates during application boot:

```php
use Zaengit\PageBuilder\Editor\EditorResourceRegistry;

public function boot(EditorResourceRegistry $editor): void
{
    $editor->pattern(
        'marketing.hero',
        'Marketing hero',
        [
            [
                'id' => 'hero-title',
                'type' => 'core/heading',
                'attrs' => ['text' => 'Build something remarkable'],
            ],
        ],
        'marketing',
    );

    $editor->template(
        'landing.default',
        'Landing page',
        ['blocks' => []],
        'Default landing page starter',
    );
}
```

Registration is in-memory for the current Laravel process. If patterns or templates live in a database, the host can load them and register the resulting Page JSON during boot or pass them directly to the Blade component.

```blade
<x-page-builder::editor
    :content="$page->layout"
    :patterns="$patterns"
    :templates="$templates"
/>
```

Explicit component resources are appended to resources registered through `EditorResourceRegistry`.

## Dynamic data sources

A data provider may expose editor metadata when registered. Provider resolution is still performed server-side immediately before Blade SSR.

```php
use Zaengit\PageBuilder\DataProviders\DataProviderRegistry;

$providers->register(
    'product',
    ProductDataProvider::class,
    'Product',
    ['title', 'price.formatted', 'featured_image.url'],
);
```

The provider class itself is never sent to the browser. The React editor only receives:

```json
{
  "name": "product",
  "title": "Product",
  "paths": ["title", "price.formatted", "featured_image.url"]
}
```

The host remains responsible for authorization and for deciding which provider data may be exposed on a given page.

## Autosave

Autosave only emits `page-builder:save-request`; it never writes to a database itself.

Set a default interval in milliseconds:

```dotenv
PAGE_BUILDER_AUTOSAVE_MS=5000
```

Or override it per editor instance:

```blade
<x-page-builder::editor :content="$page->layout" :autosave-ms="3000" />
```

A value of `0` disables automatic save requests.

## Direct runtime overrides

The Blade component accepts `patterns`, `templates`, `dataSources`, `autosaveMs`, and `mediaPicker`. This is useful when runtime resources vary by tenant, page type, authorization context, or route.

The package only transports these editor resources. Their storage, lifecycle, publishing rules, permissions, and revision history remain host-application concerns.
