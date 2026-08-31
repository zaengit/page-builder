<?php

namespace App\Http\Controllers;

use App\Blocks\PageContentValidator;
use App\Models\Page;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

final class PageController
{
    public function show(Page $page): JsonResponse
    {
        Gate::authorize('view', $page);
        return response()->json($page);
    }

    public function store(Request $request, PageContentValidator $validator): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required','string','max:255'],
            'slug' => ['nullable','string','max:255'],
            'content' => ['required','array'],
        ]);
        $content = $validator->validate($data['content']);

        $page = $request->user()->pages()->create([
            'title' => $data['title'],
            'slug' => $data['slug'] ?? Str::slug($data['title']),
            'status' => 'draft',
            'draft_content' => $content,
        ]);

        return response()->json($page, 201);
    }

    public function update(Request $request, Page $page, PageContentValidator $validator): JsonResponse
    {
        Gate::authorize('update', $page);

        $data = $request->validate([
            'title' => ['sometimes','string','max:255'],
            'slug' => ['sometimes','string','max:255'],
            'content' => ['required','array'],
        ]);
        $content = $validator->validate($data['content']);

        $page->fill(array_filter([
            'title' => $data['title'] ?? null,
            'slug' => $data['slug'] ?? null,
        ], fn ($v) => $v !== null));
        $page->draft_content = $content;
        $page->save();

        return response()->json($page->fresh());
    }

    public function publish(Page $page): JsonResponse
    {
        Gate::authorize('publish', $page);

        $page->published_content = $page->draft_content;
        $page->status = 'published';
        $page->published_at = now();
        $page->save();

        return response()->json($page->fresh());
    }
}
