<?php

namespace Tests\Feature;

use Tests\TestCase;
use Zaengit\PageBuilder\Rendering\PortableBlockRegistryLoader;

final class PortableBlockRegistryLoaderTest extends TestCase
{
    public function test_all_builtin_blocks_have_portable_templates(): void
    {
        $registry = app(PortableBlockRegistryLoader::class)->load([base_path('blocks')]);

        foreach (['core/heading', 'core/image', 'core/container', 'core/columns', 'core/carousel'] as $name) {
            $this->assertArrayHasKey($name, $registry);
            $this->assertIsString($registry[$name]['template']);
            $this->assertNotSame('', trim($registry[$name]['template']));
        }
    }
}
