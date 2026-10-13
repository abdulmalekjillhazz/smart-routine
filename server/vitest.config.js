import { defineConfig } from 'vitest/config';

// Integration suites share one test database and wipe it. Run files one at a time.
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
