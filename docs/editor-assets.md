# Editor asset delivery

Page Builder supports two production delivery modes for the React editor bundle.

## Route mode

This remains the default and requires no deployment step:

```env
PAGE_BUILDER_EDITOR_ASSET_MODE=route
```

The package serves `page-builder.js` and `page-builder.css` through its asset controller. This is the simplest option and preserves existing installs.

## Public/static mode

For direct web-server, CDN, or immutable-cache delivery:

```env
PAGE_BUILDER_EDITOR_ASSET_MODE=public
PAGE_BUILDER_EDITOR_PUBLIC_PATH=vendor/page-builder
```

Publish the built bundle during deployment:

```bash
php artisan page-builder:publish-assets
```

Laravel's standard publish command is also supported:

```bash
php artisan vendor:publish --tag=page-builder-assets --force
```

The editor component emits static URLs with a content hash query string based on the package build, for example:

```text
/vendor/page-builder/page-builder.js?v=1a2b3c4d5e6f
```

For a CDN origin, set an explicit base URL:

```env
PAGE_BUILDER_EDITOR_PUBLIC_URL=https://cdn.example.com/page-builder
```

`PAGE_BUILDER_EDITOR_DEV_SERVER` always takes precedence over either production mode.

Only the editor bundle is published by this feature. Page content persistence, authorization, block data, media storage, and application deployment remain responsibilities of the host Laravel application.
