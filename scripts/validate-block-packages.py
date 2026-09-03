#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from jsonschema import Draft202012Validator


def validate(root: Path, schema_path: Path) -> None:
    schema = json.loads(schema_path.read_text(encoding='utf-8'))
    validator = Draft202012Validator(schema)
    seen: set[str] = set()
    manifests = sorted(root.glob('*/block.json'))
    if not manifests:
        raise SystemExit(f'no block.json files found under {root}')
    for manifest_path in manifests:
        directory = manifest_path.parent
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        validator.validate(manifest)
        name = manifest['name']
        if name in seen:
            raise SystemExit(f'duplicate block name: {name}')
        seen.add(name)
        template = directory / 'template.html'
        if not template.is_file() or not template.read_text(encoding='utf-8').strip():
            raise SystemExit(f'{name}: template.html is required and must be non-empty')
        if (directory / 'template.blade.php').exists() and not template.exists():
            raise SystemExit(f'{name}: Blade cannot be the portable rendering source')
        assets = manifest.get('assets', {})
        declared: list[str] = []
        if isinstance(assets, dict):
            for values in assets.values():
                if isinstance(values, list):
                    declared.extend(value for value in values if isinstance(value, str))
        for relative in declared:
            asset = (directory / relative).resolve()
            if directory.resolve() not in asset.parents:
                raise SystemExit(f'{name}: asset escapes block directory: {relative}')
            if not asset.is_file():
                raise SystemExit(f'{name}: declared asset does not exist: {relative}')
    print(f'validated {len(manifests)} portable block package(s)')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('root', nargs='?', default='blocks')
    parser.add_argument('--schema', default='specification/block.schema.json')
    args = parser.parse_args()
    validate(Path(args.root), Path(args.schema))


if __name__ == '__main__':
    main()
