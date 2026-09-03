@php
    $items = is_array($attrs['items'] ?? null) ? $attrs['items'] : [];
    $props = [
        'items' => array_values($items),
        'autoplay' => (bool) ($attrs['autoplay'] ?? true),
        'interval' => max(1000, min(30000, (int) ($attrs['interval'] ?? 4000))),
    ];
    $scheme = preg_replace('/[^a-z0-9_-]/i', '', (string) ($attrs['colorScheme'] ?? ''));
    $spacing = (string) ($attrs['spacing'] ?? '0 0 0 0');
    [$borderWidth, $borderStyle, $borderColor, $borderRadius] = array_pad(explode('|', (string) ($attrs['border'] ?? '0|none|currentColor|0'), 4), 4, '');
    [$boxShadow, $opacity] = array_pad(explode('|', (string) ($attrs['effects'] ?? 'none|1'), 2), 2, '');
    $customClass = preg_replace('/[^a-zA-Z0-9 _-]/', '', (string) ($attrs['customClass'] ?? ''));
@endphp
<section
    class="{{ trim('pb-carousel '.($scheme ? 'pb-color-scheme--'.$scheme : '').' '.$customClass) }}"
    data-block="core/carousel"
    data-block-id="{{ $blockId }}"
    data-block-module="/block-assets/core/carousel/frontend.js"
    data-props="{{ json_encode($props, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) }}"
    style="padding:{{ $spacing }};border:{{ $borderWidth }} {{ $borderStyle }} {{ $borderColor }};border-radius:{{ $borderRadius }};box-shadow:{{ $boxShadow }};opacity:{{ $opacity }};"
>
    @if (($attrs['title'] ?? '') !== '')
        <h2 class="pb-carousel__title pb-text-h2">{{ $attrs['title'] }}</h2>
    @endif

    <div class="pb-carousel__island" data-carousel-island>
        <div class="pb-carousel__track" aria-label="Carousel slides">
            @forelse ($items as $item)
                <article class="pb-carousel__slide">
                    @if (($item['image'] ?? '') !== '')
                        <img src="{{ $item['image'] }}" alt="{{ $item['title'] ?? '' }}" loading="lazy">
                    @endif
                    <div class="pb-carousel__copy">
                        <h3 class="pb-text-h3">{{ $item['title'] ?? '' }}</h3>
                        @if (($item['description'] ?? '') !== '')
                            <p>{{ $item['description'] }}</p>
                        @endif
                    </div>
                </article>
            @empty
                <p class="pb-carousel__empty">Add at least one slide in the inspector.</p>
            @endforelse
        </div>
    </div>
</section>
