import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    coverage: {
      reporter: ['text', 'json-summary'],
      thresholds: { lines: 70, functions: 70, statements: 70, branches: 60 },
    },
  },
});
