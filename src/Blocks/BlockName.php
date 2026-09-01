<?php

namespace Zaengit\PageBuilder\Blocks;

final class BlockName
{
    private const PATTERN = '/^[a-z0-9-]+\/[a-z0-9-]+$/';

    public static function isValid(mixed $name): bool
    {
        return is_string($name) && preg_match(self::PATTERN, $name) === 1;
    }
}
