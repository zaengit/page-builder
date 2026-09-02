<?php

namespace Zaengit\PageBuilder\Editor;

use InvalidArgumentException;

final class EditorResourceRegistry
{
    /** @var array<string, array{id:string,title:string,category?:string,blocks:array}> */
    private array $patterns = [];

    /** @var array<string, array{id:string,title:string,description?:string,content:array}> */
    private array $templates = [];

    public function pattern(string $id, string $title, array $blocks, ?string $category = null): self
    {
        $this->assertIdentifier($id);
        if ($title === '') {
            throw new InvalidArgumentException('Pattern title may not be empty.');
        }
        if (! array_is_list($blocks)) {
            throw new InvalidArgumentException("Pattern [{$id}] blocks must be a list.");
        }

        $pattern = ['id' => $id, 'title' => $title, 'blocks' => $blocks];
        if ($category !== null && $category !== '') {
            $pattern['category'] = $category;
        }
        $this->patterns[$id] = $pattern;

        return $this;
    }

    public function template(string $id, string $title, array $content, ?string $description = null): self
    {
        $this->assertIdentifier($id);
        if ($title === '') {
            throw new InvalidArgumentException('Template title may not be empty.');
        }
        if (! isset($content['blocks']) || ! is_array($content['blocks']) || ! array_is_list($content['blocks'])) {
            throw new InvalidArgumentException("Template [{$id}] content must contain a blocks list.");
        }

        $template = ['id' => $id, 'title' => $title, 'content' => $content];
        if ($description !== null && $description !== '') {
            $template['description'] = $description;
        }
        $this->templates[$id] = $template;

        return $this;
    }

    public function patterns(): array
    {
        return array_values($this->patterns);
    }

    public function templates(): array
    {
        return array_values($this->templates);
    }

    private function assertIdentifier(string $id): void
    {
        if ($id === '' || preg_match('/^[a-zA-Z0-9._-]+$/', $id) !== 1) {
            throw new InvalidArgumentException("Invalid editor resource identifier [{$id}].");
        }
    }
}
