<?php

return [
    'block_paths' => [
        dirname(__DIR__).'/blocks',
        env('PAGE_BUILDER_BLOCKS_PATH', base_path('blocks')),
    ],
    'custom_blocks_path' => env('PAGE_BUILDER_BLOCKS_PATH', base_path('blocks')),
    'route_prefix' => env('PAGE_BUILDER_ROUTE_PREFIX', 'page-builder'),
    'api_prefix' => env('PAGE_BUILDER_API_PREFIX', 'api/page-builder'),
    'middleware' => [],
    'asset_middleware' => [],

    'limits' => [
        'max_depth' => max(1, (int) env('PAGE_BUILDER_MAX_DEPTH', 20)),
        'max_blocks' => max(1, (int) env('PAGE_BUILDER_MAX_BLOCKS', 1000)),
        'max_string_length' => max(1, (int) env('PAGE_BUILDER_MAX_STRING_LENGTH', 100000)),
        'max_repeater_items' => max(1, (int) env('PAGE_BUILDER_MAX_REPEATER_ITEMS', 500)),
        'max_custom_css_length' => max(1, (int) env('PAGE_BUILDER_MAX_CUSTOM_CSS_LENGTH', 200000)),
        'max_tokens' => max(1, (int) env('PAGE_BUILDER_MAX_TOKENS', 500)),
    ],

    'editor_dev_server' => env('PAGE_BUILDER_EDITOR_DEV_SERVER'),
    'editor_dist_path' => dirname(__DIR__).'/resources/dist',
    'editor_js' => 'page-builder.js',
    'editor_css' => 'page-builder.css',
    'editor_asset_mode' => env('PAGE_BUILDER_EDITOR_ASSET_MODE', 'route'),
    'editor_public_path' => env('PAGE_BUILDER_EDITOR_PUBLIC_PATH', 'vendor/page-builder'),
    'editor_public_url' => env('PAGE_BUILDER_EDITOR_PUBLIC_URL'),
    'autosave_ms' => max(0, (int) env('PAGE_BUILDER_AUTOSAVE_MS', 0)),

    'media_picker' => true,
    'media' => [
        'disk' => env('PAGE_BUILDER_MEDIA_DISK', 'public'),
        'directory' => trim((string) env('PAGE_BUILDER_MEDIA_DIRECTORY', 'page-builder/media'), '/'),
        'max_upload_kb' => max(1, (int) env('PAGE_BUILDER_MEDIA_MAX_UPLOAD_KB', 10240)),
        'max_items' => max(1, (int) env('PAGE_BUILDER_MEDIA_MAX_ITEMS', 250)),
    ],

    // Database/Eloquent bindings are allowlisted. Publish this config in the host app
    // and expose only models that should be queryable by page-builder content.
    'data' => [
        'models' => [
            // 'Product' => App\Models\Product::class,
            // 'Post' => App\Models\Post::class,
        ],
        'max_results' => max(1, (int) env('PAGE_BUILDER_DATA_MAX_RESULTS', 100)),
    ],
];
