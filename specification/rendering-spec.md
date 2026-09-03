# Page Builder Universal Rendering Specification v1

This specification is the runtime contract for every renderer. Page content, block manifests, bindings, data queries, styles, layout metadata, and templates must not depend on Laravel, Blade, React, Go templates, Jinja, or another host framework.

## Runtime contract

A renderer receives:

- a page document (`version`, `settings`, `blocks`)
- a block registry loaded from `block.json`
- a runtime context (route/current resource/preview context)
- zero or more named data providers

A renderer returns:

- HTML
- collected CSS/JS assets
- diagnostics for unknown blocks, bindings, providers, or invalid templates

## Block template

Portable blocks use `template.html`. `template.blade.php` is a Laravel compatibility fallback only and is not part of the universal format.

Supported portable template syntax:

```html
<h2>{{ product.name ?? "Untitled" }}</h2>

{% if product.available %}
  <span>Available</span>
{% endif %}

{% for item in products %}
  <article>{{ item.name }}</article>
{% endfor %}

<div>{{ children }}</div>
```

### Interpolation

`{{ path.to.value }}` resolves a dot-separated path from the render context. Values are HTML escaped by default.

`{{ path.to.value ?? "fallback" }}` uses the fallback when the path is missing or null.

### Conditions

`{% if path.to.value %}...{% endif %}` renders the body when the resolved value is truthy.

### Loops

`{% for item in path.to.collection %}...{% endfor %}` iterates arrays/collections and injects the loop variable in the local scope.

## Data binding

Bindings are declarative and never contain host-language code:

```json
{
  "title": { "path": "product.name", "fallback": "Untitled" }
}
```

## Data query

Database requests are declarative:

```json
{
  "provider": "database",
  "resource": "products",
  "query": {
    "where": [["status", "=", "published"]],
    "orderBy": [["created_at", "desc"]],
    "limit": 12,
    "page": 1
  }
}
```

Each host adapter translates this contract to its own database layer (Eloquent, SQL builder, SQLAlchemy, Prisma/Drizzle, Diesel/SQLx, etc.). Page JSON must never store Eloquent model classes or executable query code.

## Renderer conformance

A conforming implementation must:

1. accept the same page/block JSON without rewriting it;
2. resolve dot-path bindings and fallbacks consistently;
3. support portable `template.html` syntax above;
4. recurse through `children` and preserve `slot` metadata;
5. implement block styles/layout metadata and responsive output;
6. collect declared CSS/JS assets once per page;
7. isolate host-specific database/model details behind data-provider adapters;
8. treat preview context as runtime input, not persisted page state;
9. escape interpolated output by default;
10. produce deterministic HTML for the same page, registry, and context.

## Host adapters

Official adapters can implement this specification for:

- PHP/Laravel
- Go
- Rust
- Node.js
- Python

The React editor only writes the universal page schema and does not depend on which renderer serves production HTML.
