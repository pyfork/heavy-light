// Screens: does this PR change how any page looks, compared with main?
// screens.yml runs this twice on the same machine: SCREENS_SIDE=base photographs main's pages
// (checked out in base/), then SCREENS_SIDE=head photographs this PR's pages and compares,
// pixel for pixel. Nothing is stored in the repo: main is the approved look.
// Fixed clock (the date picker marks today), reduced motion (every drawing finished),
// photos masked (they are content, not design).
// Design-system engineer-Opus5.5-agent, 2026-11-09
import { test, expect } from '@playwright/test';

const PAGES = ['system', 'landing', 'form', 'blog'];
const side = process.env.SCREENS_SIDE;

for (const page of PAGES) for (const width of [375, 1280]) for (const theme of ['light', 'dark']) {
  test(`${page}-${width}-${theme}`, async ({ page: tab }) => {
    test.skip(side !== 'base' && side !== 'head', 'Run by screens.yml: SCREENS_SIDE=base, then SCREENS_SIDE=head');
    await tab.clock.install({ time: new Date('2026-11-09T09:00:00Z') });
    await tab.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await tab.setViewportSize({ width, height: 900 });
    await tab.goto(`${side === 'base' ? '/base/' : '/'}heavy-light-${page}.html`, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    await expect(tab).toHaveScreenshot(`${page}-${width}-${theme}.png`, { fullPage: true, mask: [tab.locator('img')], maskColor: '#9a9a9a' });
  });
}
