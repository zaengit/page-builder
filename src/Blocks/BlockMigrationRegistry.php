<?php

namespace Zaengit\PageBuilder\Blocks;

use RuntimeException;

final class BlockMigrationRegistry
{
    /** @var array<string, array<int, callable>> */
    private array $migrations = [];

    public function register(string $blockType, int $fromVersion, callable $migration): void
    {
        if ($fromVersion < 1) throw new RuntimeException('Block migration version must be at least 1.');
        if (isset($this->migrations[$blockType][$fromVersion])) throw new RuntimeException("Duplicate block migration for {$blockType} v{$fromVersion}.");
        $this->migrations[$blockType][$fromVersion] = $migration;
    }

    public function migrate(array $block, int $targetVersion): array
    {
        $type = (string) ($block['type'] ?? '');
        $version = $block['version'] ?? 1;
        if (!is_int($version) || $version < 1) throw new RuntimeException("Invalid block version for {$type}.");
        if ($version > $targetVersion) throw new RuntimeException("Block {$type} uses future schema v{$version}; current schema is v{$targetVersion}.");

        $attrs = $block['attrs'] ?? [];
        if (!is_array($attrs)) throw new RuntimeException("Invalid block attrs for {$type}.");

        while ($version < $targetVersion) {
            $migration = $this->migrations[$type][$version] ?? null;
            if (!$migration) throw new RuntimeException("Missing migration for {$type} v{$version} to v".($version + 1).'.');
            $nextAttrs = $migration($attrs, $block);
            if (!is_array($nextAttrs)) throw new RuntimeException("Migration for {$type} v{$version} must return an attrs array.");
            $attrs = $nextAttrs;
            $version++;
        }

        $block['attrs'] = $attrs;
        $block['version'] = $targetVersion;
        return $block;
    }
}
