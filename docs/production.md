# Production deployment

Page Builder is a rendering and editor package. The host Laravel application remains responsible for authentication, authorization, persistence, revisions, publishing, media storage, tenancy, and application-level rate limiting.

## Required host controls

Before exposing the editor in production:

1. Protect the Page Builder API and preview routes with middleware appropriate to the host application. The package intentionally ships with an empty middleware list because it cannot know the host's authorization model.
2. Apply host-level throttling to editor render and preview traffic when these routes are reachable by untrusted or large user populations.
3. Register only trusted dynamic data providers. Providers execute server-side application code and must enforce any domain-specific authorization required by the host.
4. Treat custom block manifests, Blade templates, block JavaScript, and page-level custom CSS as trusted extension/editor capabilities. Do not allow arbitrary untrusted users to install or write server-side block templates.
5. Keep the configured Page Builder resource limits enabled. Increase them only when the application has measured requirements for larger pages.
6. Use HTTPS and the host application's normal secure-session and CSRF configuration for authenticated editor flows.

## Recommended package configuration

Publish the configuration when the defaults need to be customized:

```bash
php artisan vendor:publish --tag=page-builder-config
```

Configure route middleware in `config/page-builder.php` for the host's editor role, authentication scheme, and throttle policy.

Review the `limits` section for maximum nesting depth, block count, string length, repeater size, custom CSS size, and token count.

## Deployment commands

Validate custom block manifests during deployment:

```bash
php artisan blocks:validate
```

For applications that cache block manifests:

```bash
php artisan blocks:cache
```

If `PAGE_BUILDER_EDITOR_ASSET_MODE=public` is used, publish the compiled editor assets after installing/updating the package:

```bash
php artisan page-builder:publish-assets
```

Route-based asset delivery requires no publishing step.

After deployment, run the production diagnostics command:

```bash
php artisan page-builder:doctor
```

It verifies block manifests, editor asset delivery, payload resource limits, asset mode, and whether route middleware has been configured. Missing runtime assets or invalid configuration fail the command. Missing route protection is reported as a warning because the package cannot know whether the host intentionally isolates those routes elsewhere.

For CI/CD environments where every warning must block deployment:

```bash
php artisan page-builder:doctor --strict
```

## Persistence and autosave

The package emits save/autosave lifecycle events but does not write page data. The host must validate authorization, persist the received page JSON transactionally, and implement revisions or optimistic concurrency if required by the product.

Persist the validated page document, not rendered HTML. Rendered HTML is derived output and can be regenerated using the package renderer.

## Caching

Editor assets can be served either through Laravel or from public/CDN storage. Block CSS and JavaScript URLs include a content hash and receive immutable caching only when the hash matches the current file. Unversioned block asset requests use a shorter cache lifetime.

The editor preview response is deliberately private/no-store and restricted to same-origin framing.

## Release verification

Official releases are expected to pass PHP static analysis, formatting, backend tests, editor unit tests, production build, browser E2E, and package archive verification before a version tag is created.

The release ZIP must contain at minimum:

- `composer.json`
- `src/PageBuilderServiceProvider.php`
- `config/page-builder.php`
- `resources/dist/page-builder.js`
- `resources/dist/page-builder.css`
- package views, routes, and built-in blocks
- `LICENSE`

Development-only application shell, tests, editor source dependencies, and CI files are excluded from the release archive.
