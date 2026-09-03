# Page Builder Universal Rendering Specification v1

This specification is the runtime contract for every renderer. Page content, block manifests, bindings, data queries, styles, layout metadata, and templates must not depend on Laravel, Blade, React, Go templates, Jinja, or another host framework.

The current machine-readable compatibility versions live in `version.json`. Compatibility rules live in `compatibility-policy.md`.

## Runtime contract

A renderer receives a canonical page document (`version`, optional `settings`, and `blocks`), a block registry loaded from `block.json` or a block root, a runtime context, and zero or more named data providers. It returns deterministic HTML, collected CSS/JS assets, and structured diagnostics.

Persisted Page JSON is authoritative input. Engines must not require engine-private persisted fields or mutate the document into a framework-specific representation before it can render.

## Block template

Portable blocks use `template.html`. Framework-specific templates are not part of the universal block format.

```html
<h2>{{ product.name ?? "Untitled" }}</h2>

{% if product.available %}
  <span>Available</span>
{% endif %}

{% for item in products %}
  <article>{{ item.name }}</article>
{% endfor %}

<div>{{{ children }}}</div>
```

### Path resolution

Paths are dot-separated object/map keys. A missing key, null intermediate value, or traversal into a non-container value resolves as missing. Array indexing is not part of the v1 template path grammar.

### Interpolation

`{{ path.to.value }}` resolves a path and HTML escapes the scalar value.

`{{ path.to.value ?? "fallback" }}` uses the fallback only when the path is missing or resolves to null. False, zero, and the empty string are present values and do not trigger fallback.

Scalar serialization is deterministic: strings are emitted as strings, numbers use their ordinary base-10 representation, `true` becomes `1`, `false` becomes an empty string, and null/missing becomes an empty string unless a fallback is present. Objects and arrays are not implicitly JSON-encoded into templates.

`{{{ children }}}` is the only raw interpolation in v1. It exists solely for renderer-generated nested block HTML. Arbitrary attributes, context values, and datasource values must never be emitted raw.

### Conditions and truthiness

`{% if path.to.value %}...{% endif %}` renders the body when the resolved value is truthy.

The v1 truthiness contract is: missing, null, `false`, numeric zero, empty string, and empty array/list are false; every other value is true.

### Loops

`{% for item in path.to.collection %}...{% endfor %}` iterates arrays/lists in source order and injects the loop variable in a local scope. Missing, null, scalar, and object/map values yield zero iterations. Nested loops must not mutate outer scope values.

## Data binding

Bindings are declarative and never contain host-language code. Persisted bindings use the datasource provider and resource names defined by the universal contract.

```json
{
  "title": {
    "source": "database",
    "resource": "products",
    "mode": "single",
    "contextKey": "currentProduct.id",
    "path": "name",
    "fallback": "Untitled"
  }
}
```

A resource is a portable name such as `products`, `posts`, or `projects`. It must never be a PHP class, Go type, SQL statement, or executable expression.

## Data query

Database requests are declarative and follow `datasource.schema.json`:

```json
{
  "provider": "database",
  "resource": "products",
  "mode": "collection",
  "query": {
    "where": [
      {"column": "status", "operator": "=", "value": "published"}
    ],
    "orderBy": [
      {"column": "created_at", "direction": "desc"}
    ],
    "with": ["category", "images"],
    "limit": 12,
    "offset": 0
  }
}
```

`limit`/`offset` and `perPage` pagination are mutually exclusive. `page` only has meaning with `perPage`. Hosts translate resource names and declarative queries to their own database layer. Page JSON must never store Eloquent model classes, raw SQL, or executable query code.

## Layout and responsive serialization

The canonical responsive keys are `desktop`, `tablet`, and `mobile`. Desktop is the base rule. Tablet and mobile are override rules. If a responsive property omits a tablet or mobile value, the engine inherits that property's desktop value. All official engines must preserve the same semantic order and must not introduce persisted engine-specific breakpoint names.

The v1 output breakpoints are `tablet = max-width:1024px` and `mobile = max-width:640px`. Desktop rules are emitted inline/base-first, then tablet rules, then mobile rules.

`layout.mode` supports `block`, `flex`, and `grid`. Flex and grid properties only affect layout when their matching mode is active at that breakpoint. `layoutItem` belongs to a child block and describes how that child participates in its parent layout.

Flex mode serializes `display`, `flex-direction`, `flex-wrap`, `justify-content`, `align-items`, `align-content`, `gap`, `row-gap`, and `column-gap`. A flex child serializes `flex-grow`, `flex-shrink`, `flex-basis`, `align-self`, and `order`.

Grid mode serializes `display`, `grid-template-columns`, optional `grid-template-rows`, `grid-auto-flow`, `gap`, `row-gap`, and `column-gap`. A grid child serializes `grid-column` and `grid-row` from `columnStart`, `columnSpan`, `rowStart`, and `rowSpan`. Span values are clamped to at least `1`; explicit starts are also clamped to at least `1`.

Styles and layout output must be deterministic for identical Page JSON. Engines may use different internal serializers, but shared conformance fixtures define the observable HTML/CSS contract.

## Block style contract

The portable v1 style allowlist is fixed to the following persisted keys and CSS properties:

| Persisted key | CSS property |
| --- | --- |
| `background` | `background` |
| `color` | `color` |
| `padding` | `padding` |
| `margin` | `margin` |
| `gap` | `gap` |
| `width` | `width` |
| `textAlign` | `text-align` |
| `fontSize` | `font-size` |
| `borderRadius` | `border-radius` |
| `boxShadow` | `box-shadow` |

Each style value may be a scalar or a responsive object. A scalar is a desktop/base declaration. For responsive objects, only explicitly supplied style values are emitted at tablet/mobile; unlike layout properties, style values do not implicitly create responsive overrides when omitted.

`styles.hidden.desktop = true` emits `display:none` in the base rule. Tablet/mobile hidden values emit `display:none` only at their respective breakpoint.

Before a persisted style value is inserted into a declaration, v1 removes `<`, `>`, `{`, `}`, and `;` after trimming surrounding whitespace. This sanitization rule is intentionally narrow and deterministic; implementations must not accept raw declaration separators from persisted style values.

## Design tokens

`settings.tokens`, `settings.colorSchemes`, `settings.typography`, and block `colorSchemeId` are universal persisted data. Engines must consume those values without requiring host-framework metadata. Missing referenced tokens or schemes must degrade deterministically and may emit diagnostics; they must not cause framework-specific exceptions.

Page tokens are exposed as `--pb-<token-name>` custom properties on `.pb-page`. Color schemes are exposed as `.pb-color-scheme--<id>` and `--pb-color-<name>` variables. A block with `colorSchemeId` receives the corresponding scheme class and `data-pb-color-scheme` attribute.

Typography defines three universal family slots (`primary`, `secondary`, `monospace`) and named styles. Typography output is scoped under `.pb-page`. Supported text-style properties are `family`, `size`, `weight`, `lineHeight`, `letterSpacing`, and `textTransform`.

`settings.customCss` is page-scoped raw CSS input and must be guarded against closing the generated style element or injecting script openings. At minimum, engines remove case-insensitive `</style` and `<script` sequences before emitting it. Shared conformance fixtures define the observable sanitized output.

## Assets

A block may declare portable `style.css` and `frontend.js`. Assets are collected once per page in first-use order. Rendering the same block multiple times must not duplicate its asset entry.

## Diagnostics

Diagnostics use stable `code`, `severity`, `path`, and `message` fields. An implementation must use diagnostics for recoverable rendering problems such as unknown blocks and unsupported versions. Engine exceptions, process failures, and timeouts exposed through the renderer protocol must be converted to stable diagnostics rather than leaking framework stack traces into the protocol response.

## Renderer conformance

A conforming implementation must:

1. accept the same page/block JSON without rewriting persisted data;
2. resolve dot-path bindings and fallbacks consistently;
3. implement the v1 template grammar and truthiness rules exactly;
4. recurse through `children` and preserve `slot` metadata;
5. implement block styles, flex/grid layout metadata, design tokens, and responsive output;
6. collect declared CSS/JS assets once per page in deterministic order;
7. isolate host-specific database/model details behind datasource adapters;
8. treat preview context as runtime input, not persisted page state;
9. escape ordinary interpolated output by default;
10. only allow renderer-produced nested child HTML through the raw `children` slot;
11. produce deterministic output for the same page, registry, context, and datasource results;
12. return stable structured diagnostics for unsupported or recoverable inputs;
13. declare and enforce supported specification/protocol versions.

## Host adapters

Official adapters can implement this specification in any language. The React editor writes only the universal page schema and must not depend on which compatible engine serves production HTML.
