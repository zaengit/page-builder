@php
    $items = is_array($attrs['items'] ?? null) ? $attrs['items'] : [];
    $props = [
        'items' => array_values($items),
        'autoplay' => (bool) ($attrs['autoplay'] ?? true),
        'interval' => max(1000, min(15000, (int) ($attrs['interval'] ?? 4000))),
    ];
@endphp
<section
    class="pb-carousel"
    data-block="core/carousel"
    data-block-id="{{ $blockId }}"
    data-block-module="/block-assets/core/carousel/frontend.js"
    data-props="{{ json_encode($props, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) }}"
>
    @if (($attrs['title'] ?? '') !== '')
        <h2 class="pb-carousel__title">{{ $attrs['title'] }}</h2>
    @endif

    <div class="pb-carousel__island" data-carousel-island>
        <div class="pb-carousel__track" aria-label="Carousel slides">
            @forelse ($items as $item)
                <article class="pb-carousel__slide">
                    @if (($item['image'] ?? '') !== '')
                        <img src="{{ $item['image'] }}" alt="{{ $item['title'] ?? '' }}" loading="lazy">
                    @endif
                    <div class="pb-carousel__copy">
                        <h3>{{ $item['title'] ?? '' }}</h3>
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
