<?php

namespace Zaengit\PageBuilder\Blocks;

final class LayoutSerializer
{
    public function serialize(array $layout, array $layoutItem, ?array $parentLayout, string $blockId): array
    {
        $base = array_merge($this->containerRules($layout, 'desktop'), $this->itemRules($layoutItem, $parentLayout, 'desktop'));
        $tablet = array_merge($this->containerRules($layout, 'tablet'), $this->itemRules($layoutItem, $parentLayout, 'tablet'));
        $mobile = array_merge($this->containerRules($layout, 'mobile'), $this->itemRules($layoutItem, $parentLayout, 'mobile'));
        $safeId = str_replace(['"', '\\'], ['', ''], $blockId);
        $selector = '[data-pb-style-id="'.$safeId.'"]';
        $css = '';
        if ($tablet !== []) $css .= '@media(max-width:1024px){'.$selector.'{'.implode(';', $tablet).'}}';
        if ($mobile !== []) $css .= '@media(max-width:640px){'.$selector.'{'.implode(';', $mobile).'}}';
        return ['style' => implode(';', $base), 'css' => $css];
    }

    private function containerRules(array $layout, string $breakpoint): array
    {
        if ($layout === []) return [];
        $mode = $this->responsive($layout['mode'] ?? null, $breakpoint, 'block');
        if ($mode === 'flex') {
            $gap = $this->responsive($layout['gap'] ?? null, $breakpoint, '0px');
            return [
                'display:flex',
                'flex-direction:'.$this->clean((string) $this->responsive($layout['flexDirection'] ?? null, $breakpoint, 'row')),
                'flex-wrap:'.$this->clean((string) $this->responsive($layout['flexWrap'] ?? null, $breakpoint, 'nowrap')),
                'justify-content:'.$this->clean((string) $this->responsive($layout['justifyContent'] ?? null, $breakpoint, 'flex-start')),
                'align-items:'.$this->clean((string) $this->responsive($layout['alignItems'] ?? null, $breakpoint, 'stretch')),
                'align-content:'.$this->clean((string) $this->responsive($layout['alignContent'] ?? null, $breakpoint, 'stretch')),
                'gap:'.$this->clean((string) $gap),
                'row-gap:'.$this->clean((string) $this->responsive($layout['rowGap'] ?? null, $breakpoint, $gap)),
                'column-gap:'.$this->clean((string) $this->responsive($layout['columnGap'] ?? null, $breakpoint, $gap)),
            ];
        }
        if ($mode === 'grid') {
            $columns = max(1, (int) $this->responsive($layout['gridColumns'] ?? null, $breakpoint, 1));
            $rows = $this->responsive($layout['gridRows'] ?? null, $breakpoint, 'auto');
            $gap = $this->responsive($layout['gap'] ?? null, $breakpoint, '0px');
            $rules = [
                'display:grid',
                'grid-template-columns:repeat('.$columns.',minmax(0,1fr))',
                'grid-auto-flow:'.$this->clean((string) $this->responsive($layout['gridAutoFlow'] ?? null, $breakpoint, 'row')),
                'gap:'.$this->clean((string) $gap),
                'row-gap:'.$this->clean((string) $this->responsive($layout['rowGap'] ?? null, $breakpoint, $gap)),
                'column-gap:'.$this->clean((string) $this->responsive($layout['columnGap'] ?? null, $breakpoint, $gap)),
            ];
            if ($rows !== 'auto') $rules[] = 'grid-template-rows:repeat('.max(1, (int) $rows).',minmax(0,auto))';
            return $rules;
        }
        return ['display:block'];
    }

    private function itemRules(array $item, ?array $parentLayout, string $breakpoint): array
    {
        if ($item === [] || ! is_array($parentLayout)) return [];
        $parentMode = $this->responsive($parentLayout['mode'] ?? null, $breakpoint, 'block');
        if ($parentMode === 'flex') {
            return [
                'flex-grow:'.max(0, (float) $this->responsive($item['flexGrow'] ?? null, $breakpoint, 0)),
                'flex-shrink:'.max(0, (float) $this->responsive($item['flexShrink'] ?? null, $breakpoint, 1)),
                'flex-basis:'.$this->clean((string) $this->responsive($item['flexBasis'] ?? null, $breakpoint, 'auto')),
                'align-self:'.$this->clean((string) $this->responsive($item['alignSelf'] ?? null, $breakpoint, 'auto')),
                'order:'.(int) $this->responsive($item['order'] ?? null, $breakpoint, 0),
            ];
        }
        if ($parentMode === 'grid') {
            $columnSpan = max(1, (int) $this->responsive($item['columnSpan'] ?? null, $breakpoint, 1));
            $rowSpan = max(1, (int) $this->responsive($item['rowSpan'] ?? null, $breakpoint, 1));
            $columnStart = $this->responsive($item['columnStart'] ?? null, $breakpoint, 'auto');
            $rowStart = $this->responsive($item['rowStart'] ?? null, $breakpoint, 'auto');
            return [
                'grid-column:'.($columnStart === 'auto' ? 'span '.$columnSpan : max(1, (int) $columnStart).' / span '.$columnSpan),
                'grid-row:'.($rowStart === 'auto' ? 'span '.$rowSpan : max(1, (int) $rowStart).' / span '.$rowSpan),
            ];
        }
        return [];
    }

    private function responsive(mixed $value, string $breakpoint, mixed $fallback): mixed
    {
        if (! is_array($value)) return $value ?? $fallback;
        return $value[$breakpoint] ?? $value['desktop'] ?? $fallback;
    }

    private function clean(string $value): string
    {
        return str_replace(['<', '>', '{', '}', ';'], '', trim($value));
    }
}
