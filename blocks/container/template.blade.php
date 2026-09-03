@php
    $scheme = preg_replace('/[^a-z0-9_-]/i', '', (string) ($attrs['colorScheme'] ?? ''));
    [$borderWidth, $borderStyle, $borderColor, $borderRadius] = array_pad(explode('|', (string) ($attrs['border'] ?? '0|none|currentColor|0'), 4), 4, '');
    [$boxShadow, $opacity] = array_pad(explode('|', (string) ($attrs['effects'] ?? 'none|1'), 2), 2, '');
    $customClass = preg_replace('/[^a-zA-Z0-9 _-]/', '', (string) ($attrs['customClass'] ?? ''));
@endphp
<section
    data-block="core/container"
    data-block-id="{{ $blockId }}"
    class="{{ trim(($scheme ? 'pb-color-scheme--'.$scheme : '').' '.$customClass) }}"
    style="max-width: {{ $attrs['maxWidth'] ?? '1200px' }}; margin-inline: auto; padding: {{ $attrs['padding'] ?? '24px 24px 24px 24px' }}; border: {{ $borderWidth }} {{ $borderStyle }} {{ $borderColor }}; border-radius: {{ $borderRadius }}; box-shadow: {{ $boxShadow }}; opacity: {{ $opacity }};"
>
    {!! $children !!}
</section>
