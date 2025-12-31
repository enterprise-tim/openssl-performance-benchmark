import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.vitest.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.js',
        '**/*.config.js',
        'scripts/run-benchmark.js', // Runs actual benchmarks, not unit testable
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});

