import { defineConfig, devices } from '@playwright/test';

// Browser tests. Build first (npm run build -w client), then run npm run test:e2e -w client.
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: process.env.BASE_URL || 'http://localhost:3000' },
  projects: [
    {
      name: 'phone-360',
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
