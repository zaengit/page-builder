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

    // Set this only while developing the React editor, e.g. http://127.0.0.1:5173.
    // Production should leave it null and use the package-built resources/dist assets.
    'editor_dev_server' => env('PAGE_BUILDER_EDITOR_DEV_SERVER'),
    'editor_dist_path' => dirname(__DIR__).'/resources/dist',
    'editor_js' => 'page-builder.js',
    'editor_css' => 'page-builder.css',

    // Host applications may expose their own media picker. The editor emits
    // PAGE_BUILDER_MEDIA_REQUEST and accepts PAGE_BUILDER_MEDIA_SELECTED.
    'media_picker' => true,
];
