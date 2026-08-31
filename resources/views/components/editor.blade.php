@props([
    'content' => ['blocks' => []],
    'name' => null,
    'height' => '720px',
    'mediaPicker' => null,
])

@php
    $id = 'page-builder-'.str()->uuid();
    $devServer = rtrim((string) config('page-builder.editor_dev_server', ''), '/');
    $runtime = [
        'blocksUrl' => route('page-builder.blocks'),
        'renderBlockUrl' => route('page-builder.render-block'),
        'renderPageUrl' => route('page-builder.render-page'),
        'previewUrl' => route('page-builder.preview'),
        'mediaPicker' => $mediaPicker ?? (bool) config('page-builder.media_picker', true),
    ];
    $js = $devServer !== ''
        ? $devServer.'/src/main.tsx'
        : route('page-builder.editor-asset', ['asset' => config('page-builder.editor_js', 'page-builder.js')]);
    $css = $devServer !== ''
        ? null
        : route('page-builder.editor-asset', ['asset' => config('page-builder.editor_css', 'page-builder.css')]);
@endphp

<div
    id="{{ $id }}"
    data-page-builder-root
    data-page-builder-runtime='@json($runtime)'
    data-page-builder-content='@json($content)'
    style="min-height: {{ $height }}"
    {{ $attributes }}
></div>
@if($name)
    <input type="hidden" name="{{ $name }}" value='@json($content)' data-page-builder-input="{{ $id }}">
@endif

@once
    @if($css)<link rel="stylesheet" href="{{ $css }}">@endif
    <script type="module" src="{{ $js }}"></script>
@endonce

<script>
(() => {
    const root = document.getElementById(@js($id));
    if (!root) return;
    root.addEventListener('page-builder:change', (event) => {
        const input = document.querySelector(`[data-page-builder-input="${root.id}"]`);
        if (input) input.value = JSON.stringify(event.detail.content);
    });
})();
</script>
