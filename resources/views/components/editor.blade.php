@props([
    'content' => ['blocks' => []],
    'name' => null,
    'height' => '720px',
    'mediaPicker' => null,
    'patterns' => [],
    'templates' => [],
    'dataSources' => [],
    'autosaveMs' => null,
])

@php
    $id = 'page-builder-'.str()->uuid();
    $devServer = rtrim((string) config('page-builder.editor_dev_server', ''), '/');
    $editorResources = app(\Zaengit\PageBuilder\Editor\EditorResourceRegistry::class);
    $dataProviders = app(\Zaengit\PageBuilder\DataProviders\DataProviderRegistry::class);
    $runtime = [
        'blocksUrl' => route('page-builder.blocks'),
        'renderBlockUrl' => route('page-builder.render-block'),
        'renderPageUrl' => route('page-builder.render-page'),
        'previewUrl' => route('page-builder.preview'),
        'mediaPicker' => $mediaPicker ?? (bool) config('page-builder.media_picker', true),
        'patterns' => array_values(array_merge($editorResources->patterns(), is_array($patterns) ? $patterns : [])),
        'templates' => array_values(array_merge($editorResources->templates(), is_array($templates) ? $templates : [])),
        'dataSources' => array_values(array_merge($dataProviders->definitions(), is_array($dataSources) ? $dataSources : [])),
        'autosaveMs' => max(0, (int) ($autosaveMs ?? config('page-builder.autosave_ms', 0))),
    ];
    $runtimeJson = e(json_encode($runtime, JSON_THROW_ON_ERROR));
    $contentJson = e(json_encode($content, JSON_THROW_ON_ERROR));
    $inputJson = e(json_encode($content, JSON_THROW_ON_ERROR));
    $js = $devServer !== '' ? $devServer.'/src/main.tsx' : route('page-builder.editor-asset', ['asset' => config('page-builder.editor_js', 'page-builder.js')]);
    $css = $devServer !== '' ? null : route('page-builder.editor-asset', ['asset' => config('page-builder.editor_css', 'page-builder.css')]);
@endphp

<div id="{{ $id }}" data-page-builder-root data-page-builder-runtime="{!! $runtimeJson !!}" data-page-builder-content="{!! $contentJson !!}" style="min-height: {{ $height }}" {{ $attributes }}></div>
@if($name)<input type="hidden" name="{{ $name }}" value="{!! $inputJson !!}" data-page-builder-input="{{ $id }}">@endif

@once
    @if($css)<link rel="stylesheet" href="{{ $css }}">@endif
    <script type="module" src="{{ $js }}"></script>
@endonce

<script>
(() => {
    const root = document.getElementById(@js($id));
    if (!root) return;
    root.addEventListener('page-builder:change', event => {
        const input = document.querySelector(`[data-page-builder-input="${root.id}"]`);
        if (input) input.value = JSON.stringify(event.detail.content);
    });
})();
</script>
