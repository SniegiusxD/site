import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3210)

/**
 * The public pages, in a real browser. The audit's point was that nothing
 * caught a page that renders in development and breaks in a production build,
 * and nothing checked the accessibility gate we claim to hold. These run
 * against `next build && next start`, with whatever database is configured —
 * the pages are written to render without live data, and that is part of what
 * is being tested.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  // In CI the list reporter prints each test as it runs; the github reporter
  // alone stays silent until the end, which made a stalled run unreadable.
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // In CI the build is its own workflow step and the server runs as one
    // process: `pnpm build && pnpm start` left next-server alive after the
    // tests, so every run passed in 90 s and then hung until the job timeout.
    command: process.env.CI
      ? `node node_modules/next/dist/bin/next start --port ${PORT}`
      : `pnpm build && pnpm start --port ${PORT}`,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
