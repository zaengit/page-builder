<?php

return [
    'block_paths' => [
        dirname(__DIR__).'/blocks',
        env('PAGE_BUILDER_BLOCKS_PATH', base_path('blocks')),
    ],
    'custom_blocks_path' => env('PAGE_BUILDER_BLOCKS_PATH', base_path('blocks')),
    'route_prefix' => env('PAGE_BUILDER_ROUTE_PREFIX', 'page-builder'),
    'api_prefix' => env('PAGE_BUILDER_API_PREFIX', 'api/page-builder'),
];
