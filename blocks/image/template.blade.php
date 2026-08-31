<figure data-block-id="{{ $blockId }}" style="margin:0;display:flex;flex-direction:column;align-items:{{ ($attrs['alignment'] ?? 'center') === 'left' ? 'flex-start' : (($attrs['alignment'] ?? 'center') === 'right' ? 'flex-end' : 'center') }}">
    @if(!empty($attrs['src']))
        <img src="{{ $attrs['src'] }}" alt="{{ $attrs['alt'] ?? '' }}" style="display:block;max-width:100%;width:{{ $attrs['width'] ?? '100%' }};height:auto">
    @elseif($preview)
        <div style="width:{{ $attrs['width'] ?? '100%' }};min-height:180px;display:grid;place-items:center;background:#f3f4f6;color:#6b7280;border:1px dashed #d1d5db">Choose an image</div>
    @endif
    @if(!empty($attrs['caption']))
        <figcaption>{{ $attrs['caption'] }}</figcaption>
    @endif
</figure>
