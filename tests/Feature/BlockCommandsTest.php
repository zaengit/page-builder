<?php

namespace Tests\Feature;

use App\Blocks\BlockRegistry;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class BlockCommandsTest extends TestCase
{
    public function test_block_manifest_cache_can_be_warmed_and_cleared(): void
    {
        Cache::forget(BlockRegistry::CACHE_KEY);

        $this->assertSame(0, Artisan::call('blocks:cache'));
        $this->assertTrue(Cache::has(BlockRegistry::CACHE_KEY));

        $this->assertSame(0, Artisan::call('blocks:clear'));
        $this->assertFalse(Cache::has(BlockRegistry::CACHE_KEY));
    }

    public function test_block_management_commands_are_registered(): void
    {
        $commands = Artisan::all();

        $this->assertArrayHasKey('blocks:cache', $commands);
        $this->assertArrayHasKey('blocks:clear', $commands);
        $this->assertArrayHasKey('blocks:list', $commands);
        $this->assertArrayHasKey('make:block', $commands);
    }
}
