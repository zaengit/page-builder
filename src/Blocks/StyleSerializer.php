<?php

namespace Zaengit\PageBuilder\Blocks;

final class StyleSerializer
{
    private const ALLOWED = [
        'background' => 'background', 'color' => 'color', 'padding' => 'padding', 'margin' => 'margin',
        'gap' => 'gap', 'width' => 'width', 'textAlign' => 'text-align', 'fontSize' => 'font-size',
        'borderRadius' => 'border-radius', 'boxShadow' => 'box-shadow',
    ];

    public function serialize(array $styles, string $blockId): array
    {
        $base = [];
        $responsive = ['tablet' => [], 'mobile' => []];
        foreach (self::ALLOWED as $key => $property) {
            if (! array_key_exists($key, $styles)) continue;
            $value = $styles[$key];
            if (is_array($value)) {
                if (isset($value['desktop']) && is_scalar($value['desktop'])) $base[] = $property.':'.$this->clean((string) $value['desktop']);
                foreach (['tablet', 'mobile'] as $breakpoint) if (isset($value[$breakpoint]) && is_scalar($value[$breakpoint])) $responsive[$breakpoint][] = $property.':'.$this->clean((string) $value[$breakpoint]);
            } elseif (is_scalar($value)) $base[] = $property.':'.$this->clean((string) $value);
        }
        if (($styles['hidden']['desktop'] ?? false) === true) $base[] = 'display:none';
        foreach (['tablet', 'mobile'] as $breakpoint) if (($styles['hidden'][$breakpoint] ?? false) === true) $responsive[$breakpoint][] = 'display:none';

        $selector = '[data-pb-style-id="'.addcslashes($blockId, '"\\').'"]';
        $css = '';
        if ($responsive['tablet'] !== []) $css .= '@media(max-width:1024px){'.$selector.'{'.implode(';', $responsive['tablet']).'}}';
        if ($responsive['mobile'] !== []) $css .= '@media(max-width:640px){'.$selector.'{'.implode(';', $responsive['mobile']).'}}';
        return ['style' => implode(';', $base), 'css' => $css];
    }

    private function clean(string $value): string
    {
        return str_replace(['<', '>', '{', '}', ';'], '', trim($value));
    }
}
