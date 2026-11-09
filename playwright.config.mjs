// Page checks: each page served locally, opened in a fresh browser, in Chromium, Firefox and WebKit
// (Safari's engine), light and dark. Screens (pictures) have their own config: playwright.screens.config.mjs.
// Design-system engineer-Opus5.5-agent, 2026-11-09
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testIgnore: 'screens.spec.mjs',
  reporter: [['list']],
  forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://127.0.0.1:8847', reducedMotion: 'reduce' },
  projects: ['chromium', 'firefox', 'webkit'].flatMap(browserName => ['light', 'dark'].map(colorScheme =>
    ({ name: `${browserName}-${colorScheme}`, use: { browserName, colorScheme } }))),
  webServer: {
    command: 'python3 -m http.server 8847 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8847/heavy-light-system.html',
    reuseExistingServer: !process.env.CI,
  },
});
