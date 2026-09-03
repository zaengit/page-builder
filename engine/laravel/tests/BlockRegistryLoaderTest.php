<?php

namespace Tests\Engine\Laravel;

use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\BlockRegistryLoader;

final class BlockRegistryLoaderTest extends TestCase
{
    public function test_all_builtin_blocks_have_portable_templates(): void
    {
        $registry = app(BlockRegistryLoader::class)->load([$this->blocksPath()]);

        foreach (['core/heading', 'core/image', 'core/container', 'core/columns', 'core/carousel'] as $name) {
            $this->assertArrayHasKey($name, $registry);
            $this->assertIsString($registry[$name]['_template']);
            $this->assertFileExists($registry[$name]['_template']);
        }
    }
}
