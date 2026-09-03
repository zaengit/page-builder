# Laravel Engine

Install or archive the package from `engine/laravel/`. Its `composer.json`, source, config, routes, resources, static analysis configuration, and tests are self-contained.

The engine consumes portable blocks from configured block roots and renders canonical version-1 Page JSON through the runtime under `Zaengit\PageBuilder\Engine\Laravel\Runtime`. Database bindings use neutral resource names; hosts map those names to Eloquent model classes in `page-builder.data.resources`.

The package supports specification version 1, renderer protocol version 1, and template-language version 1. Run `composer install`, `vendor/bin/phpstan analyse`, `vendor/bin/pint --test src tests routes config`, and `vendor/bin/phpunit` from `engine/laravel/` to verify it independently.
