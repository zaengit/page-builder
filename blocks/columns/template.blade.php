<section
    data-block="core/columns"
    data-block-id="{{ $blockId }}"
    style="display:grid; grid-template-columns:repeat({{ (int) $attrs['columns'] }}, minmax(0,1fr)); gap:{{ $attrs['gap'] }};"
>
    {!! $children !!}
</section>
