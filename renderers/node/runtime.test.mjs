import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { UniversalRenderer } from './runtime.mjs';

test('portable runtime conformance', async () => {
  const fixture = JSON.parse(await readFile(new URL('../../specification/conformance/portable-runtime.json', import.meta.url), 'utf8'));
  const result = new UniversalRenderer().render({ page: fixture.page, registry: fixture.registry, context: fixture.context });
  assert.deepEqual(result, fixture.expected);
});
