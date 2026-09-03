<?php

namespace Zaengit\PageBuilder\Engine\Laravel\Runtime;

final class StyleSerializer
{
    public const ALLOWED = [
        'background' => 'background',
        'color' => 'color',
        'padding' => 'padding',
        'margin' => 'margin',
        'gap' => 'gap',
        'width' => 'width',
        'textAlign' => 'text-align',
        'fontSize' => 'font-size',
        'borderRadius' => 'border-radius',
        'boxShadow' => 'box-shadow',
    ];

    public const BREAKPOINTS = ['tablet' => 1024, 'mobile' => 640];

    /** @return array{style:string,css:string} */
    public function serialize(array $styles, string $blockId): array
    {
        $base = [];
        $responsive = ['tablet' => [], 'mobile' => []];

        foreach (self::ALLOWED as $key => $property) {
            if (! array_key_exists($key, $styles)) {
                continue;
            }

            $value = $styles[$key];
            if (is_array($value)) {
                if (isset($value['desktop']) && is_scalar($value['desktop'])) {
                    $base[] = $property.':'.$this->clean((string) $value['desktop']);
                }
                foreach (array_keys(self::BREAKPOINTS) as $breakpoint) {
                    if (isset($value[$breakpoint]) && is_scalar($value[$breakpoint])) {
                        $responsive[$breakpoint][] = $property.':'.$this->clean((string) $value[$breakpoint]);
                    }
                }
            } elseif (is_scalar($value)) {
                $base[] = $property.':'.$this->clean((string) $value);
            }
        }

        if (($styles['hidden']['desktop'] ?? false) === true) {
            $base[] = 'display:none';
        }
        foreach (array_keys(self::BREAKPOINTS) as $breakpoint) {
            if (($styles['hidden'][$breakpoint] ?? false) === true) {
                $responsive[$breakpoint][] = 'display:none';
            }
        }

        $selector = '[data-pb-style-id="'.$this->identifier($blockId).'"]';
        $css = '';
        foreach (self::BREAKPOINTS as $breakpoint => $width) {
            if ($responsive[$breakpoint] !== []) {
                $css .= '@media(max-width:'.$width.'px){'.$selector.'{'.implode(';', $responsive[$breakpoint]).'}}';
            }
        }

        return ['style' => implode(';', $base), 'css' => $css];
    }

    public function clean(string $value): string
    {
        return str_replace(['<', '>', '{', '}', ';'], '', trim($value));
    }

    public function identifier(string $value): string
    {
        return str_replace(['"', '\\'], '', $value);
    }
}
