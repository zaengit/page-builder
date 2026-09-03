import json
import unittest
from pathlib import Path

from renderer import RenderRequest, UniversalRenderer, load_registry


class RendererConformanceTest(unittest.TestCase):
    def test_portable_runtime(self) -> None:
        fixture_path = Path(__file__).resolve().parents[2] / 'specification' / 'conformance' / 'portable-runtime.json'
        fixture = json.loads(fixture_path.read_text())
        result = UniversalRenderer().render(RenderRequest(fixture['page'], fixture['registry'], fixture['context']))
        self.assertEqual(result.html, fixture['expected']['html'])
        self.assertEqual(result.assets, fixture['expected']['assets'])
        self.assertEqual(result.diagnostics, fixture['expected']['diagnostics'])

    def test_loads_and_renders_builtin_portable_blocks(self) -> None:
        root = Path(__file__).resolve().parents[2] / 'blocks'
        registry = load_registry(root)
        for name in ['core/heading', 'core/image', 'core/container', 'core/columns', 'core/carousel']:
            self.assertIn(name, registry)

        page = {
            'version': 1,
            'blocks': [
                {'id': 'h1', 'type': 'core/heading', 'attrs': {'text': 'Portable <Heading>', 'level': 2}, 'children': []},
            ],
        }
        result = UniversalRenderer().render(RenderRequest(page, registry, {}))
        self.assertIn('Portable &lt;Heading&gt;', result.html)
        self.assertEqual([], result.diagnostics)


if __name__ == '__main__':
    unittest.main()
