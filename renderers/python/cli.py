#!/usr/bin/env python3
from __future__ import annotations

import json
import sys

from renderer import RenderRequest, UniversalRenderer, load_registry


def main() -> int:
    try:
        request = json.load(sys.stdin)
        if request.get('version') != 1:
            raise ValueError('Unsupported renderer protocol version')
        registry = request.get('registry')
        if registry is None:
            block_root = request.get('blockRoot')
            if not isinstance(block_root, str) or not block_root:
                raise ValueError('blockRoot or registry is required')
            registry = load_registry(block_root)
        result = UniversalRenderer().render(
            RenderRequest(request.get('page', {}), registry, request.get('context', {}))
        )
        json.dump({
            'html': result.html,
            'assets': result.assets,
            'diagnostics': result.diagnostics,
        }, sys.stdout, separators=(',', ':'))
        return 0
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
