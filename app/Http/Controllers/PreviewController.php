<?php

namespace App\Http\Controllers;

use App\Blocks\PageRenderer;
use App\Models\Page;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;

final class PreviewController
{
    public function show(Page $page, PageRenderer $renderer): View
    {
        Gate::authorize('preview', $page);
        $content = $renderer->render($page->draft_content ?? ['blocks' => []], true);

        return view('page', [
            'title' => $page->title.' — Preview',
            'content' => $content,
            'assets' => $renderer->assets(),
            'preview' => true,
        ]);
    }
}
