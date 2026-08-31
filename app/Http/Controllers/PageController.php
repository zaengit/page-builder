<?php

namespace App\Http\Controllers;

use App\Models\Page;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class PageController
{
    public function show(Page $page): JsonResponse { return response()->json($page); }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['title' => ['required','string','max:255'], 'slug' => ['nullable','string','max:255'], 'content' => ['required','array'], 'content.blocks' => ['present','array']]);
        $page = Page::create([
            'title' => $data['title'],
            'slug' => $data['slug'] ?? Str::slug($data['title']),
            'status' => 'draft',
            'draft_content' => $data['content'],
        ]);
        return response()->json($page, 201);
    }

    public function update(Request $request, Page $page): JsonResponse
    {
        $data = $request->validate(['title' => ['sometimes','string','max:255'], 'slug' => ['sometimes','string','max:255'], 'content' => ['required','array'], 'content.blocks' => ['present','array']]);
        $page->fill(array_filter(['title' => $data['title'] ?? null, 'slug' => $data['slug'] ?? null], fn ($v) => $v !== null));
        $page->draft_content = $data['content'];
        $page->save();
        return response()->json($page->fresh());
    }

    public function publish(Page $page): JsonResponse
    {
        $page->published_content = $page->draft_content;
        $page->status = 'published';
        $page->published_at = now();
        $page->save();
        return response()->json($page->fresh());
    }
}
