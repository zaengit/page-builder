<section
    class="product-grid-block"
    data-block="commerce/product-grid"
    data-block-id="{{ $blockId }}"
>
    @if(($attrs['title'] ?? '') !== '')
        <h2>{{ $attrs['title'] }}</h2>
    @endif

    @if($data->isEmpty())
        <p>No products found.</p>
    @else
        <div class="product-grid" style="--product-columns: {{ max(2, min((int) ($attrs['columns'] ?? 4), 6)) }}">
            @foreach($data as $product)
                <article class="product-card">
                    @if($product->image_url)
                        <img src="{{ $product->image_url }}" alt="{{ $product->name }}" loading="lazy">
                    @endif
                    <h3>{{ $product->name }}</h3>
                    <p>{{ number_format((float) $product->price, 2) }}</p>
                </article>
            @endforeach
        </div>
    @endif
</section>
