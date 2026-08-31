<?php

namespace App\Http\Controllers;

use App\Blocks\PageRenderer;
use App\Models\Page;
use Illuminate\Contracts\View\View;

final class PreviewController
{
    public function show(Page $page, PageRenderer $renderer): View
    {
        return view('page', [
            'title' => $page->title.' — Preview',
            'content' => $renderer->render($page->draft_content ?? ['blocks' => []], true),
            'preview' => true,
        ]);
    }
}
