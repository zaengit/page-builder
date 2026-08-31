<?php

namespace Zaengit\PageBuilder\Http\Controllers;

use Illuminate\Contracts\View\View;

final class PreviewController
{
    public function show(): View
    {
        return view('page-builder::preview', [
            'title'=>'Page Builder Preview',
            'content'=>'',
            'assets'=>['css'=>[], 'js'=>[]],
            'preview'=>true,
        ]);
    }
}
