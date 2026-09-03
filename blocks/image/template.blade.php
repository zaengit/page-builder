@php
    $alignment = in_array(($attrs['alignment'] ?? 'center'), ['left','center','right'], true) ? $attrs['alignment'] : 'center';
    $alignItems = $alignment === 'left' ? 'flex-start' : ($alignment === 'right' ? 'flex-end' : 'center');
    $width = in_array(($attrs['width'] ?? '100%'), ['25%','50%','75%','100%'], true) ? $attrs['width'] : '100%';
    $scheme = preg_replace('/[^a-z0-9_-]/i', '', (string) ($attrs['colorScheme'] ?? ''));
    $spacing = (string) ($attrs['spacing'] ?? '0 0 0 0');
    [$borderWidth, $borderStyle, $borderColor, $borderRadius] = array_pad(explode('|', (string) ($attrs['border'] ?? '0|none|currentColor|0'), 4), 4, '');
    [$boxShadow, $opacity] = array_pad(explode('|', (string) ($attrs['effects'] ?? 'none|1'), 2), 2, '');
    $customClass = preg_replace('/[^a-zA-Z0-9 _-]/', '', (string) ($attrs['customClass'] ?? ''));
@endphp
<figure data-block="core/image" data-block-id="{{ $blockId }}" class="{{ trim(($scheme ? 'pb-color-scheme--'.$scheme : '').' '.$customClass) }}" style="margin:0;padding:{{ $spacing }};display:flex;flex-direction:column;align-items:{{ $alignItems }};">
    @if(!empty($attrs['src']))
        <img src="{{ $attrs['src'] }}" alt="{{ $attrs['alt'] ?? '' }}" style="display:block;max-width:100%;width:{{ $width }};height:auto;border:{{ $borderWidth }} {{ $borderStyle }} {{ $borderColor }};border-radius:{{ $borderRadius }};box-shadow:{{ $boxShadow }};opacity:{{ $opacity }};">
    @elseif($preview)
        <div style="width:{{ $width }};min-height:180px;display:grid;place-items:center;background:var(--pb-color-muted,#f3f4f6);color:var(--pb-color-mutedForeground,#6b7280);border:1px dashed var(--pb-color-border,#d1d5db)">Choose an image</div>
    @endif
    @if(!empty($attrs['caption']))
        <figcaption class="pb-text-caption">{{ $attrs['caption'] }}</figcaption>
    @endif
</figure>
