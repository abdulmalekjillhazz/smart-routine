import { defineConfig } from 'vitest/config';

// Fast tests: no database. Runs on every pull request.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      reporter: ['text', 'lcov'],
      // Measured without the database: about 34% lines. Routes and middleware are covered by the integration
      // job in CI, which measures the full picture. This is a ratchet: raise it as tests grow, never lower it to pass.
      thresholds: { lines: 30, functions: 25, branches: 20, statements: 30 },
    },
  },
});
