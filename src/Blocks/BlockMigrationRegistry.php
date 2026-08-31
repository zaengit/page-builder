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

        while ($version < $targetVersion) {
            $migration = $this->migrations[$type][$version] ?? null;
            if (!$migration) throw new RuntimeException("Missing migration for {$type} v{$version} to v".($version + 1).'.');
            $next = $migration($block);
            if (!is_array($next)) throw new RuntimeException("Migration for {$type} v{$version} must return a block array.");
            $block = $next;
            $version++;
            $block['version'] = $version;
        }

        $block['version'] = $targetVersion;
        return $block;
    }
}
