<?php

namespace Tests\Engine\Laravel;

use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\TemplateRenderer;

final class TemplateRendererTest extends TestCase
{
    public function test_it_renders_bindings_fallbacks_conditions_and_loops(): void
    {
        $renderer = app(TemplateRenderer::class);

        $html = $renderer->render(<<<'HTML'
<h1>{{ product.name ?? "Untitled" }}</h1>
{% if product.available %}<strong>Available</strong>{% endif %}
{% for item in products %}<span>{{ item.name }}</span>{% endfor %}
HTML, [
            'product' => ['name' => '<Phone>', 'available' => true],
            'products' => [
                ['name' => 'One'],
                ['name' => 'Two'],
            ],
        ]);

        $this->assertStringContainsString('&lt;Phone&gt;', $html);
        $this->assertStringContainsString('<strong>Available</strong>', $html);
        $this->assertStringContainsString('<span>One</span><span>Two</span>', $html);
    }

    public function test_it_uses_fallback_for_missing_values(): void
    {
        $renderer = app(TemplateRenderer::class);

        $this->assertSame(
            '<h1>Untitled</h1>',
            $renderer->render('<h1>{{ product.name ?? "Untitled" }}</h1>', []),
        );
    }
}
