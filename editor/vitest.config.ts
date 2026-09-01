import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: { reporter: ['text', 'json-summary'], thresholds: { lines: 70, functions: 70, statements: 70, branches: 60 } },
  },
});
