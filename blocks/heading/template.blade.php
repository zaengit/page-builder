@php($level = max(1, min(6, (int) ($attrs['level'] ?? 2))))
<{{ 'h'.$level }}
    data-block="core/heading"
    data-block-id="{{ $blockId }}"
    @if($preview) data-pb-inline="text" contenteditable="true" spellcheck="true" @endif
    style="text-align: {{ in_array(($attrs['alignment'] ?? 'left'), ['left','center','right'], true) ? $attrs['alignment'] : 'left' }}"
>{{ $attrs['text'] ?? '' }}</{{ 'h'.$level }}>
