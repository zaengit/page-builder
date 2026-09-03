@php
    $columns = max(1, min(4, (int) ($attrs['columns'] ?? 2)));
    $gap = (string) ($attrs['gap'] ?? '24px');
    $scheme = preg_replace('/[^a-z0-9_-]/i', '', (string) ($attrs['colorScheme'] ?? ''));
    $spacing = (string) ($attrs['spacing'] ?? '0 0 0 0');
    [$borderWidth, $borderStyle, $borderColor, $borderRadius] = array_pad(explode('|', (string) ($attrs['border'] ?? '0|none|currentColor|0'), 4), 4, '');
    [$boxShadow, $opacity] = array_pad(explode('|', (string) ($attrs['effects'] ?? 'none|1'), 2), 2, '');
    $customClass = preg_replace('/[^a-zA-Z0-9 _-]/', '', (string) ($attrs['customClass'] ?? ''));
@endphp
<section
    data-block="core/columns"
    data-block-id="{{ $blockId }}"
    class="{{ trim(($scheme ? 'pb-color-scheme--'.$scheme : '').' '.$customClass) }}"
    style="display:grid;grid-template-columns:repeat({{ $columns }},minmax(0,1fr));gap:{{ $gap }};padding:{{ $spacing }};border:{{ $borderWidth }} {{ $borderStyle }} {{ $borderColor }};border-radius:{{ $borderRadius }};box-shadow:{{ $boxShadow }};opacity:{{ $opacity }};"
>
    {!! $children !!}
</section>
