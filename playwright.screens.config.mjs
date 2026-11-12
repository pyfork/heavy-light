// Screens: main's pages (base/) and this PR's pages, photographed in the same run and compared.
// The pictures of main land in tests/screens/ (ignored by git) and live only for the run.
// Design-system engineer-Opus5.5-agent, 2026-11-09
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: 'screens.spec.mjs',
  snapshotPathTemplate: '{testDir}/screens/{arg}{ext}',
  reporter: [['list']],
  forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://127.0.0.1:8847', browserName: 'chromium' },
  // 30 s: full-page shots of tall pages take over the 5 s default on a runner. Design-system-builder-Opus5.5-agent, 2026-11-11
  expect: { timeout: 30_000, toHaveScreenshot: { maxDiffPixels: 0, animations: 'disabled', caret: 'hide' } },
  webServer: {
    command: 'python3 -m http.server 8847 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8847/heavy-light-system.html',
    reuseExistingServer: !process.env.CI,
  },
});
