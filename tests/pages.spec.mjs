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

// The quiz from first click to result: reasons, faded options, focus, the result after the last card.
test('quiz shows the result after the last answer', async ({ page: tab }) => {
  await tab.setViewportSize({ width: 375, height: 900 });
  await tab.goto('/heavy-light-blog.html', { waitUntil: 'load' });
  const box = tab.locator('[data-quiz="blog"]'), end = box.locator('.quiz-end');
  const Q = JSON.parse(await box.locator('script[type="application/json"]').textContent());
  await expect(box.locator('[data-total]')).toHaveText('4 questions');
  await expect(end).toBeHidden();
  for (const [i, q] of Q.entries()) {
    const pick = i === 0 ? (q.a + 1) % q.o.length : q.a; // miss question 1 only
    await box.locator(`.q[data-i="${i}"] button.o`).nth(pick).click();
    if (i === 0) {
      const card = box.locator('.q[data-i="0"]');
      await expect(card.locator('.why .lead')).toContainText('Not quite.');
      await expect(card.locator('.why b')).toHaveText(['Not quite.', ...(q.a < pick ? ['Right.', 'Your answer.'] : ['Your answer.', 'Right.'])]); // only two reasons keep a verdict
      await expect(card.locator('button.o:disabled')).toHaveCount(q.o.length);
      await expect(card.locator('.why')).toBeFocused();
      await expect(end.locator('.l')).toHaveText('1 of 4 answered');
    }
  }
  await expect(end).toBeFocused();
  await expect(end.locator('.l')).toHaveText('Your result');
  await expect(end.locator('.n')).toHaveText('3 of 4 right');
  await expect(end.locator('.m')).toHaveText('You missed question 1.');
  const { violations } = await new AxeBuilder({ page: tab }).include('[data-quiz="blog"]').analyze();
  expect(violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id), 'accessibility when finished').toEqual([]);
  await end.locator('[data-reset]').click();
  await expect(end).toBeHidden();
  await expect(box.locator('button.o:disabled')).toHaveCount(0);
});
