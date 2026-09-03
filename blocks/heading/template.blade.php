@php
    $level = max(1, min(6, (int) ($attrs['level'] ?? 2)));
    $alignment = in_array(($attrs['alignment'] ?? 'left'), ['left', 'center', 'right'], true) ? $attrs['alignment'] : 'left';
    $typography = in_array(($attrs['typography'] ?? 'h'.$level), ['h1','h2','h3','h4','h5','h6','body','bodySmall','caption','label','button'], true)
        ? $attrs['typography']
        : 'h'.$level;
    $typographyClass = 'pb-text-'.str_replace('bodySmall', 'body-small', $typography);
    $scheme = preg_replace('/[^a-z0-9_-]/i', '', (string) ($attrs['colorScheme'] ?? ''));
    $spacing = (string) ($attrs['spacing'] ?? '0 0 0 0');
    [$borderWidth, $borderStyle, $borderColor, $borderRadius] = array_pad(explode('|', (string) ($attrs['border'] ?? '0|none|currentColor|0'), 4), 4, '');
    [$boxShadow, $opacity] = array_pad(explode('|', (string) ($attrs['effects'] ?? 'none|1'), 2), 2, '');
    $customClass = preg_replace('/[^a-zA-Z0-9 _-]/', '', (string) ($attrs['customClass'] ?? ''));
@endphp
<{{ 'h'.$level }}
    data-block="core/heading"
    data-block-id="{{ $blockId }}"
    @if($preview) data-pb-inline="text" contenteditable="true" spellcheck="true" @endif
    class="{{ trim($typographyClass.' '.($scheme ? 'pb-color-scheme--'.$scheme : '').' '.$customClass) }}"
    style="text-align: {{ $alignment }}; padding: {{ $spacing }}; border: {{ $borderWidth }} {{ $borderStyle }} {{ $borderColor }}; border-radius: {{ $borderRadius }}; box-shadow: {{ $boxShadow }}; opacity: {{ $opacity }};"
>{{ $attrs['text'] ?? '' }}</{{ 'h'.$level }}>
