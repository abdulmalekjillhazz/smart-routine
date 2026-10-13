import { defineConfig } from 'vitest/config';

// Tests against a real MongoDB (MONGODB_URI_TEST). CI starts one as a service container.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
