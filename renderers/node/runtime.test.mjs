import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { UniversalRenderer, loadRegistry } from './runtime.mjs';

test('portable runtime conformance', async () => {
  const fixture = JSON.parse(await readFile(new URL('../../specification/conformance/portable-runtime.json', import.meta.url), 'utf8'));
  const result = new UniversalRenderer().render({ page: fixture.page, registry: fixture.registry, context: fixture.context });
  assert.deepEqual(result, fixture.expected);
});

test('loads and renders built-in portable blocks', async () => {
  const blocksRoot = fileURLToPath(new URL('../../blocks', import.meta.url));
  const registry = await loadRegistry(blocksRoot);
  for (const name of ['core/heading', 'core/image', 'core/container', 'core/columns', 'core/carousel']) {
    assert.ok(registry[name], `${name} should load`);
  }
  const result = new UniversalRenderer().render({
    page: { version: 1, blocks: [{ id: 'h1', type: 'core/heading', attrs: { text: 'Portable <Heading>', level: 2 }, children: [] }] },
    registry,
    context: {},
  });
  assert.match(result.html, /Portable &lt;Heading&gt;/);
  assert.equal(result.diagnostics.length, 0);
});
