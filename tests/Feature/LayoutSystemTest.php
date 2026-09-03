<?php

namespace Tests\Feature;

use Tests\TestCase;
use Zaengit\PageBuilder\Engine\Laravel\Runtime\LayoutSerializer;

class LayoutSystemTest extends TestCase
{
    public function test_layout_serializer_outputs_responsive_grid_and_item_css(): void
    {
        $serializer = app(LayoutSerializer::class);
        $result = $serializer->serialize(
            [
                'mode' => ['desktop' => 'grid', 'tablet' => 'grid', 'mobile' => 'flex'],
                'gridColumns' => ['desktop' => 4, 'tablet' => 2],
                'flexDirection' => ['mobile' => 'column'],
                'gap' => ['desktop' => '24px', 'tablet' => '16px', 'mobile' => '12px'],
            ],
            ['columnSpan' => ['desktop' => 2, 'tablet' => 1]],
            ['mode' => ['desktop' => 'grid', 'tablet' => 'grid', 'mobile' => 'flex']],
            'block-1',
        );

        $this->assertStringContainsString('display:grid', $result['style']);
        $this->assertStringContainsString('grid-template-columns:repeat(4,minmax(0,1fr))', $result['style']);
        $this->assertStringContainsString('grid-column:span 2', $result['style']);
        $this->assertStringContainsString('@media(max-width:1024px)', $result['css']);
        $this->assertStringContainsString('@media(max-width:640px)', $result['css']);
        $this->assertStringContainsString('display:flex', $result['css']);
        $this->assertStringContainsString('flex-direction:column', $result['css']);
    }

    public function test_render_page_preserves_and_renders_layout_schema(): void
    {
        $response = $this->postJson('/api/page-builder/render-page', [
            'blocks' => [[
                'id' => 'grid-1',
                'type' => 'core/container',
                'attrs' => [],
                'layout' => [
                    'mode' => ['desktop' => 'grid', 'tablet' => 'grid', 'mobile' => 'flex'],
                    'gridColumns' => ['desktop' => 4, 'tablet' => 2],
                    'flexDirection' => ['mobile' => 'column'],
                    'gap' => ['desktop' => '20px', 'mobile' => '10px'],
                ],
                'children' => [[
                    'id' => 'heading-1',
                    'type' => 'core/heading',
                    'attrs' => [],
                    'layoutItem' => [
                        'columnSpan' => ['desktop' => 2, 'tablet' => 1],
                        'rowSpan' => ['desktop' => 1],
                    ],
                ]],
            ]],
        ])->assertOk();

        $html = $response->json('html');
        $this->assertStringContainsString('grid-template-columns:repeat(4,minmax(0,1fr))', $html);
        $this->assertStringContainsString('grid-column:span 2', $html);
        $this->assertStringContainsString('@media(max-width:640px)', $html);
    }

    public function test_invalid_grid_span_is_rejected(): void
    {
        $this->postJson('/api/page-builder/render-page', [
            'blocks' => [[
                'id' => 'heading-1',
                'type' => 'core/heading',
                'attrs' => [],
                'layoutItem' => ['columnSpan' => ['desktop' => 0]],
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['blocks.0.layoutItem.columnSpan.desktop']);
    }
}
