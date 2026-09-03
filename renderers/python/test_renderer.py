import json
import unittest
from pathlib import Path

from renderer import RenderRequest, UniversalRenderer


class RendererConformanceTest(unittest.TestCase):
    def test_portable_runtime(self) -> None:
        fixture_path = Path(__file__).resolve().parents[2] / 'specification' / 'conformance' / 'portable-runtime.json'
        fixture = json.loads(fixture_path.read_text())
        result = UniversalRenderer().render(RenderRequest(fixture['page'], fixture['registry'], fixture['context']))
        self.assertEqual(result.html, fixture['expected']['html'])
        self.assertEqual(result.assets, fixture['expected']['assets'])
        self.assertEqual(result.diagnostics, fixture['expected']['diagnostics'])


if __name__ == '__main__':
    unittest.main()
