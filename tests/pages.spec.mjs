// Every page, at phone and desktop width, light and dark (the projects in playwright.config.mjs):
// no script errors, no sideways scroll, no blocks overlapping, no serious accessibility problems.
// Design-system engineer-Opus5.5-agent, 2026-11-09
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['system', 'landing', 'form', 'blog'];
const WIDTHS = [375, 1280];

// Runs in the page. Blocks that must never touch, compared within each section.
// A box is cut to any scroll box around it (a long table scrolls inside its frame),
// and anything inside a sticky or fixed bar is skipped (it floats over the page on purpose).
function overlaps() {
  const SEL = 'h1,h2,h3,p,figure,.btn,.art-tile,table,.field,.status,.stats > div,.swatches li,.price,.city,.post,.spec-body > *,.cc-row,.sc-row,.choice,.weights li,.mnote,.contact,.stages,.pairfig,.quote,.chips-l,.chips button,.score > *,.foot-in > *,.to-top,.ack';
  const skip = el => el.closest('.badge,.tag,.art-labels,.sr,[hidden],details:not([open]) > :not(summary),.tip,.nav:not(.open),.guide');
  const floats = el => { for (let a = el; a; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === 'sticky' || p === 'fixed') return true; } return false; };
  const box = el => {
    let r = el.getBoundingClientRect(), [l, t, rt, b] = [r.left, r.top, r.right, r.bottom];
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const c = a.getBoundingClientRect();
      [l, t, rt, b] = [Math.max(l, c.left), Math.max(t, c.top), Math.min(rt, c.right), Math.min(b, c.bottom)];
    }
    return { left: l, top: t, right: rt, bottom: b };
  };
  const name = el => el.tagName + '.' + String(el.className.baseVal ?? el.className).slice(0, 24);
  const roots = [...document.querySelectorAll('main > section, main > div:not(.spacer), main > figure, .ds-sec, .prose, .foot')];
  const hits = [];
  for (const root of roots) {
    const items = [...root.querySelectorAll(SEL)].filter(el => !skip(el) && !floats(el))
      .map(el => ({ el, r: box(el) })).filter(x => x.r.right - x.r.left > 0 && x.r.bottom - x.r.top > 0);
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.r.left < b.r.right - 1 && b.r.left < a.r.right - 1 && a.r.top < b.r.bottom - 1 && b.r.top < a.r.bottom - 1)
        hits.push(`${root.id || root.className}: ${name(a.el)} over ${name(b.el)} "${(a.el.textContent || '').trim().slice(0, 30)}"`);
    }
  }
  return { sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth, hits };
}

for (const page of PAGES) for (const width of WIDTHS) {
  test(`${page} at ${width}px`, async ({ page: tab }) => {
    const errors = [];
    tab.on('pageerror', e => errors.push(e.message));
    tab.on('console', m => { if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) errors.push(m.text()); });
    await tab.setViewportSize({ width, height: 900 });
    await tab.goto(`/heavy-light-${page}.html`, { waitUntil: 'load' });

    const { sideways, hits } = await tab.evaluate(overlaps);
    expect(errors, 'script errors').toEqual([]);
    expect(sideways, 'sideways scroll').toBe(false);
    expect(hits, 'overlapping blocks').toEqual([]);

    const { violations } = await new AxeBuilder({ page: tab }).analyze();
    const serious = violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
      .map(v => `${v.id} (${v.nodes.length}): ${v.help}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
    expect(serious, 'accessibility').toEqual([]);
  });
}
