<?php

namespace Zaengit\PageBuilder\Blocks;

use Illuminate\Support\Facades\File;
use InvalidArgumentException;

final class BlockScaffolder
{
    /** @return list<string> */
    public function presets(): array
    {
        return ['basic', 'interactive', 'container'];
    }

    public function scaffold(string $name, string $preset = 'basic'): string
    {
        if (! BlockName::isValid($name)) {
            throw new InvalidArgumentException('Block name must use namespace/block format, for example custom/button.');
        }

        if (! in_array($preset, $this->presets(), true)) {
            throw new InvalidArgumentException('Unknown block preset ['.$preset.']. Available presets: '.implode(', ', $this->presets()).'.');
        }

        [, $slug] = explode('/', $name, 2);
        $root = rtrim((string) config('page-builder.custom_blocks_path', base_path('blocks')), DIRECTORY_SEPARATOR);
        $directory = $root.DIRECTORY_SEPARATOR.$slug;

        if (File::exists($directory)) {
            throw new InvalidArgumentException("Block directory already exists: {$directory}");
        }

        File::makeDirectory($directory, 0755, true);

        foreach ($this->files($name, $slug, $preset) as $file => $contents) {
            File::put($directory.DIRECTORY_SEPARATOR.$file, $contents);
        }

        return $directory;
    }

    /** @return array<string, string> */
    private function files(string $name, string $slug, string $preset): array
    {
        return match ($preset) {
            'interactive' => $this->interactiveFiles($name, $slug),
            'container' => $this->containerFiles($name, $slug),
            default => $this->basicFiles($name, $slug),
        };
    }

    /** @return array<string, string> */
    private function basicFiles(string $name, string $slug): array
    {
        return [
            'block.json' => $this->manifest([
                'name' => $name,
                'version' => 1,
                'title' => $this->title($slug),
                'category' => 'custom',
                'icon' => 'block',
                'description' => 'Custom content block.',
                'attributes' => [
                    'text' => ['type' => 'string', 'label' => 'Text', 'default' => 'New block'],
                ],
                'supports' => [
                    'styles' => true,
                    'lock' => true,
                    'inline' => ['text'],
                ],
            ]),
            'template.blade.php' => <<<'BLADE'
<section data-block-id="{{ $blockId }}">
    <div
        @if($preview) data-pb-inline="text" contenteditable="true" @endif
    >{{ $attrs['text'] ?? '' }}</div>
</section>
BLADE.PHP_EOL,
            'style.css' => <<<'CSS'
/* Styles are loaded once when this block is rendered. */
CSS.PHP_EOL,
        ];
    }

    /** @return array<string, string> */
    private function interactiveFiles(string $name, string $slug): array
    {
        return [
            'block.json' => $this->manifest([
                'name' => $name,
                'version' => 1,
                'title' => $this->title($slug),
                'category' => 'custom',
                'icon' => 'block',
                'description' => 'Interactive custom block with frontend JavaScript.',
                'attributes' => [
                    'title' => ['type' => 'string', 'label' => 'Title', 'default' => 'Interactive block'],
                    'autoplay' => ['type' => 'boolean', 'label' => 'Autoplay', 'default' => false],
                    'interval' => [
                        'type' => 'number',
                        'label' => 'Interval (ms)',
                        'default' => 4000,
                        'min' => 1000,
                        'max' => 30000,
                        'visibleWhen' => ['attribute' => 'autoplay', 'truthy' => true],
                    ],
                ],
                'supports' => [
                    'styles' => true,
                    'lock' => true,
                    'inline' => ['title'],
                ],
                'assets' => [
                    'css' => ['style.css'],
                    'js' => ['frontend.js'],
                ],
            ]),
            'template.blade.php' => <<<'BLADE'
<section
    data-block-id="{{ $blockId }}"
    data-pb-interactive
    data-autoplay="{{ ($attrs['autoplay'] ?? false) ? 'true' : 'false' }}"
    data-interval="{{ (int) ($attrs['interval'] ?? 4000) }}"
>
    <h2 @if($preview) data-pb-inline="title" contenteditable="true" @endif>{{ $attrs['title'] ?? '' }}</h2>
    <button type="button" data-pb-action>Toggle</button>
    <div data-pb-panel hidden>Interactive content</div>
</section>
BLADE.PHP_EOL,
            'style.css' => <<<'CSS'
[data-pb-interactive] [data-pb-panel] {
    margin-top: 0.75rem;
}
CSS.PHP_EOL,
            'frontend.js' => <<<'JS'
document.querySelectorAll('[data-pb-interactive]').forEach((block) => {
  if (block.dataset.pbReady === 'true') return
  block.dataset.pbReady = 'true'

  const button = block.querySelector('[data-pb-action]')
  const panel = block.querySelector('[data-pb-panel]')
  if (!(button instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return

  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden
  })
})
JS.PHP_EOL,
        ];
    }

    /** @return array<string, string> */
    private function containerFiles(string $name, string $slug): array
    {
        return [
            'block.json' => $this->manifest([
                'name' => $name,
                'version' => 1,
                'title' => $this->title($slug),
                'category' => 'layout',
                'icon' => 'columns',
                'description' => 'Container block with named header and body slots.',
                'attributes' => [],
                'supports' => [
                    'children' => true,
                    'styles' => true,
                    'lock' => true,
                    'slots' => [
                        ['name' => 'header', 'title' => 'Header'],
                        ['name' => 'body', 'title' => 'Body'],
                    ],
                ],
            ]),
            'template.blade.php' => <<<'BLADE'
<section data-block-id="{{ $blockId }}">
    {!! $children !!}
</section>
BLADE.PHP_EOL,
            'style.css' => <<<'CSS'
/* Use [data-pb-slot="header"] and [data-pb-slot="body"] to style named slot children. */
CSS.PHP_EOL,
        ];
    }

    /** @param array<string, mixed> $manifest */
    private function manifest(array $manifest): string
    {
        return json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).PHP_EOL;
    }

    private function title(string $slug): string
    {
        return str($slug)->replace('-', ' ')->title()->toString();
    }
}
