#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { UniversalRenderer, loadRegistry } from './runtime.mjs';

const input = await new Promise((resolve, reject) => {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => resolve(data));
  process.stdin.on('error', reject);
});

try {
  const request = JSON.parse(input || '{}');
  if (request.version !== 1) throw new Error('Unsupported renderer protocol version');
  const registry = request.registry ?? await loadRegistry(request.blockRoot);
  const result = new UniversalRenderer().render({
    page: request.page ?? {},
    registry,
    context: request.context ?? {},
  });
  process.stdout.write(JSON.stringify(result));
} catch (error) {
  process.stderr.write(`${error?.message ?? error}\n`);
  process.exitCode = 1;
}
