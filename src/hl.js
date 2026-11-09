/* Heavy Light — shared behaviour. Plain script, no library, no network.
   Drawings: window.ART = {name: {w, h, d, fills, labels?}} written by tools/build.py. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem('hl:' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('hl:' + k, v); } catch (e) { /* storage blocked: theme just won't persist */ } }
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const raf = fn => { let on = false; return () => { if (!on) { on = true; requestAnimationFrame(() => { on = false; fn(); }); } }; };
  root.classList.add('js');
  $$('img[data-dup]').forEach(i => { const src = $(`img[data-img="${i.dataset.dup}"]`); if (src) i.src = src.src; });

  /* ---------- theme: light / dark / device ---------- */
  const themeListeners = [];
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
    $$('.theme button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pick === (t === 'light' || t === 'dark' ? t : 'device'))));
    themeListeners.forEach(fn => fn());
  }
  $$('.theme button').forEach(b => b.addEventListener('click', () => { store.set('theme', b.dataset.pick); applyTheme(b.dataset.pick); }));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => themeListeners.forEach(fn => fn()));

  /* ---------- mobile menu ---------- */
  $$('.menu-btn').forEach(btn => {
    const nav = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => btn.setAttribute('aria-expanded', String(nav.classList.toggle('open'))));
    nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  });

  /* ---------- line drawings ---------- */
  const ART = window.ART || {};
  const drawings = [];
  $$('.art[data-art]').forEach(fig => {
    const a = ART[fig.dataset.art];
    if (!a) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${a.w} ${a.h}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'blk');
    if (!fig.hasAttribute('data-noblocks')) a.fills.forEach(f => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', f.d); p.setAttribute('class', 'b' + f.k);
      g.appendChild(p);
    });
    svg.appendChild(g);
    const paths = a.d.split(/(?=M)/).filter(Boolean).map(d => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d); p.setAttribute('class', 'ln');
      svg.appendChild(p);
      return p;
    });
    const pen = document.createElementNS(NS, 'circle');
    pen.setAttribute('class', 'pen'); pen.setAttribute('r', String(a.w / 160));
    svg.appendChild(pen);
    fig.prepend(svg);
    if (a.labels && fig.dataset.labels) { // city names under a composite drawing, at each landmark's centre
      const names = JSON.parse(fig.dataset.labels), row = document.createElement('div');
      row.className = 'art-labels'; row.setAttribute('aria-hidden', 'true');
      a.labels.forEach(l => { const s = document.createElement('span'); s.textContent = names[l.name] || l.name; s.style.left = l.x * 100 + '%'; row.appendChild(s); });
      svg.after(row);
    }
    const lens = paths.map(p => p.getTotalLength());
    const it = { fig, svg, paths, lens, pen, w: a.w, total: lens.reduce((s, v) => s + v, 0), p: -1,
      mode: fig.classList.contains('hero-draw') ? 'hero' : fig.classList.contains('hover-draw') ? 'hover' : fig.classList.contains('manual-draw') ? 'manual' : 'scroll' };
    if (!reduce) paths.forEach((p, i) => { p.style.strokeDasharray = `${lens[i]} ${lens[i]}`; p.style.strokeDashoffset = lens[i]; });
    drawings.push(it);
  });
  function setDraw(it, p) {
    if (Math.abs(it.p - p) < 0.001) return;
    it.p = p;
    it.fig.classList.toggle('shown', p > 0.02);
    if (reduce) return;
    it.fig.classList.toggle('drawing', p > 0.002 && p < 0.998);
    let left = p * it.total, tip = null;
    it.paths.forEach((path, i) => {
      const L = it.lens[i];
      const show = clamp(left, 0, L);
      path.style.strokeDashoffset = L - show;
      if (left > 0 && left <= L) tip = path.getPointAtLength(show);
      left -= L;
    });
    if (tip) {
      const k = it.w / Math.max(1, it.svg.clientWidth); // keep the pen ~5px on screen at any size
      it.pen.setAttribute('cx', tip.x); it.pen.setAttribute('cy', tip.y); it.pen.setAttribute('r', String(5 * k));
    }
  }
  function drawOnScroll() {
    const vh = innerHeight;
    drawings.forEach(it => {
      if (it.mode !== 'scroll') return;
      const r = it.fig.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) { if (it.p < 0) setDraw(it, 0); return; }
      setDraw(it, clamp((vh * 0.98 - r.top) / (vh * 0.62), 0, 1));
    });
  }
  function animate(it, to, dur) {
    const from = Math.max(0, it.p), t0 = performance.now();
    cancelAnimationFrame(it.anim);
    const step = t => {
      const k = Math.min(1, (t - t0) / dur);
      setDraw(it, from + (to - from) * (1 - Math.pow(1 - k, 2.2)));
      if (k < 1) it.anim = requestAnimationFrame(step);
    };
    it.anim = requestAnimationFrame(step);
  }
  drawings.forEach(it => {
    if (reduce) { setDraw(it, 1); return; }
    if (it.mode === 'manual') setDraw(it, 0);
    if (it.mode === 'hero') { setDraw(it, 0); setTimeout(() => animate(it, 1, +(it.fig.dataset.dur || 3600)), 250); }
    if (it.mode === 'hover') {
      setDraw(it, 0);
      const host = it.fig.closest('.hover-host') || it.fig;
      ['mouseenter', 'focusin'].forEach(e => host.addEventListener(e, () => animate(it, 1, 1400)));
      ['mouseleave', 'focusout'].forEach(e => host.addEventListener(e, () => animate(it, 0, 500)));
    }
  });
  if (reduce) $$('.art').forEach(f => f.classList.add('shown'));
  $$('[data-replay]').forEach(b => b.addEventListener('click', () => {
    const fig = b.parentElement.querySelector('.art'), it = drawings.find(d => d.fig === fig);
    if (!it || reduce) return;
    it.mode = 'manual'; setDraw(it, 0); animate(it, 1, 1400);
  }));

  /* ---------- the companion line: one stroke that follows the reader ----------
     Each [data-guide="left|right"] block gets a run down that side, in the page margin; between blocks
     the line crosses (with a loop) through the empty spacer, or curls if it stays on the same side. */
  const guideBlocks = $$('[data-guide]');
  let guide = null;
  if (guideBlocks.length) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'guide'); svg.setAttribute('aria-hidden', 'true');
    const ghost = document.createElementNS(NS, 'path'); ghost.setAttribute('class', 'ghost');
    const path = document.createElementNS(NS, 'path');
    const pen = document.createElementNS(NS, 'circle'); pen.setAttribute('r', '4.5');
    svg.append(ghost, path, pen);
    document.body.prepend(svg);
    guide = { svg, ghost, path, pen, samples: [], len: 0 };
  }
  function layoutGuide() {
    if (!guide) return;
    const W = document.documentElement.clientWidth, sy = scrollY;
    const pts = guideBlocks.map(el => {
      const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const r = { top: b.top, bottom: b.bottom, left: b.left + parseFloat(cs.paddingLeft), right: b.right - parseFloat(cs.paddingRight) };
      const side = el.dataset.guide;
      const margin = side === 'right' ? W - r.right : r.left;
      const x = side === 'right' ? r.right + margin / 2 : margin / 2;
      return { top: r.top + sy, bottom: r.bottom + sy, x, margin, side };
    });
    const H = Math.max(document.body.scrollHeight, pts[pts.length - 1].bottom + 200);
    guide.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    guide.svg.style.height = H + 'px';
    const f = n => n.toFixed(1);
    let d = `M${f(pts[0].x)} ${f(pts[0].top - 24)}`;
    pts.forEach((p, i) => {
      // a run down the margin with a slow hand wobble, never straight like a ruler
      const amp = Math.min(7, p.margin * 0.22), seg = 240;
      const n = Math.max(1, Math.round((p.bottom - p.top) / seg));
      const h = (p.bottom - p.top) / n;
      let y = p.top;
      for (let k = 0; k < n; k++) {
        const s = (k % 2 ? -1 : 1) * amp;
        d += ` C${f(p.x + s)} ${f(y + h * 0.35)} ${f(p.x - s)} ${f(y + h * 0.65)} ${f(p.x)} ${f(y + h)}`;
        y += h;
      }
      const q = pts[i + 1];
      if (!q) { d += ` L${f(p.x)} ${f(p.bottom + 40)}`; return; }
      const g = Math.max(40, q.top - p.bottom), ym = p.bottom + g / 2;
      if (q.side !== p.side) {
        // cross the page through the spacer, with one loop in the middle
        const dir = Math.sign(q.x - p.x), span = Math.abs(q.x - p.x), lx = p.x + (q.x - p.x) / 2;
        const lr = Math.min(g * 0.34, 46);
        d += ` C${f(p.x)} ${f(ym)} ${f(lx - dir * span * 0.18)} ${f(ym + lr * 0.9)} ${f(lx + dir * lr)} ${f(ym)}`;
        d += ` C${f(lx + dir * lr * 1.9)} ${f(ym - lr * 1.3)} ${f(lx - dir * lr * 0.6)} ${f(ym - lr * 1.5)} ${f(lx - dir * lr * 0.2)} ${f(ym - lr * 0.2)}`;
        d += ` C${f(lx + dir * span * 0.12)} ${f(ym + lr * 0.9)} ${f(q.x)} ${f(ym - lr * 0.4)} ${f(q.x)} ${f(q.top)}`;
      } else {
        // stay on this side: a small curl into the margin
        const c = Math.max(6, Math.min(26, p.margin * 0.4)), dir = p.side === 'right' ? -1 : 1;
        d += ` C${f(p.x)} ${f(ym)} ${f(p.x + dir * c * 2)} ${f(ym - c)} ${f(p.x + dir * c)} ${f(ym + c * 0.6)}`;
        d += ` C${f(p.x)} ${f(ym + c * 1.4)} ${f(p.x)} ${f(ym + c)} ${f(p.x)} ${f(q.top)}`;
      }
    });
    guide.path.setAttribute('d', d);
    guide.ghost.setAttribute('d', d);
    guide.len = guide.path.getTotalLength();
    // y for each length step; keep a running max so loops don't make the lookup go backwards
    const N = Math.ceil(guide.len / 6), samples = new Float32Array(N + 1);
    let maxY = -Infinity;
    for (let i = 0; i <= N; i++) { maxY = Math.max(maxY, guide.path.getPointAtLength(guide.len * i / N).y); samples[i] = maxY; }
    guide.samples = samples;
    if (!reduce) guide.path.style.strokeDasharray = `${guide.len} ${guide.len}`;
    drawGuide(true);
  }
  function drawGuide(force) {
    if (!guide || !guide.samples.length) return;
    const target = scrollY + innerHeight * 0.72, s = guide.samples, N = s.length - 1;
    let lo = 0, hi = N;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (s[mid] < target) lo = mid + 1; else hi = mid; }
    const L = reduce ? guide.len : guide.len * lo / N;
    if (!force && Math.abs(L - (guide.drawn || 0)) < 0.5) return;
    guide.drawn = L;
    if (!reduce) guide.path.style.strokeDashoffset = guide.len - L;
    const tip = guide.path.getPointAtLength(L);
    guide.pen.setAttribute('cx', tip.x); guide.pen.setAttribute('cy', tip.y);
    guide.pen.style.opacity = L > 1 && L < guide.len - 1 ? 1 : 0;
  }

  /* ---------- table of contents: current section, a spine that draws, a progress bar ---------- */
  const toc = $('[data-toc]');
  const tocItems = toc ? $$('a[href^="#"]', toc).map(a => ({ a, li: a.closest('li'), el: document.getElementById(a.getAttribute('href').slice(1)) })).filter(x => x.el) : [];
  const spine = toc ? $('.spine', toc) : null;
  const bar = $('.progress');
  const progressEl = $('[data-progress]') || document.body;
  function onReadScroll() {
    const vh = innerHeight;
    if (tocItems.length) {
      let cur = -1;
      tocItems.forEach((x, i) => { if (x.el.getBoundingClientRect().top < vh * 0.32) cur = i; });
      tocItems.forEach((x, i) => { x.li.classList.toggle('on', i === cur); x.li.classList.toggle('done', i < cur); x.a.toggleAttribute('aria-current', i === cur); });
      if (spine) {
        const first = tocItems[0].a, ol = first.closest('ol').getBoundingClientRect();
        let y = 0;
        if (cur >= 0) {
          const a = tocItems[cur].a.getBoundingClientRect();
          const next = tocItems[cur + 1];
          const top = tocItems[cur].el.getBoundingClientRect().top;
          const end = next ? next.el.getBoundingClientRect().top : progressEl.getBoundingClientRect().bottom;
          const frac = clamp((vh * 0.32 - top) / Math.max(1, end - top), 0, 1);
          const nextA = next ? next.a.getBoundingClientRect() : a;
          y = a.top - ol.top + (nextA.top - a.top) * frac;
        }
        spine.style.height = Math.max(0, y) + 'px';
      }
    }
    if (bar) {
      const r = progressEl.getBoundingClientRect();
      bar.style.width = clamp((vh * 0.5 - r.top) / Math.max(1, r.height - vh * 0.5), 0, 1) * 100 + '%';
    }
  }

  /* ---------- FAQ: question tabs, one answer panel ---------- */
  $$('.faq').forEach(faq => {
    const tabs = $$('[role="tab"]', faq);
    const pick = t => tabs.forEach(b => {
      const on = b === t;
      b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
      document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
    });
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => pick(b));
      b.addEventListener('keydown', e => {
        const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (k) { e.preventDefault(); const n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); pick(n); }
      });
    });
  });

  /* ---------- charts ---------- */
  const probe = document.createElement('i');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  document.body.appendChild(probe);
  function rgbOf(token) {
    probe.style.color = `var(${token})`;
    const m = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
    return m.slice(0, 3);
  }
  const lum = ([r, g, b]) => [r, g, b].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); })
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.setAttribute('role', 'status');
  function showTip(host, x, y, html) {
    if (tip.parentNode !== host) host.appendChild(tip);
    tip.innerHTML = html; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on');
  }
  const hideTip = () => tip.classList.remove('on');

  function contrastChart(host) {
    const pairs = JSON.parse(host.dataset.pairs);
    const need = { text: 4.5, large: 3, graphic: 3 };
    const rows = pairs.map(([name, fg, bg, use]) => {
      const r = ratio(rgbOf(fg), rgbOf(bg));
      const grade = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large' : 'Fail';
      return { name, fg, bg, use, r, grade, pass: r >= need[use] };
    }).sort((a, b) => b.r - a.r);
    const x = v => ((clamp(v, 1, 21) - 1) / 20 * 100).toFixed(2) + '%';
    const thr = [[3, '3 · large text and graphics'], [4.5, '4.5 · AA body text'], [7, '7 · AAA']];
    host.innerHTML = `<div class="cc-head"><span></span><span class="cc-track">${thr.map(([v, t]) => `<i style="left:${x(v)}">${t}</i>`).join('')}</span><span class="cc-v">Ratio</span></div>` +
      rows.map((r, i) => `<div class="cc-row" tabindex="0" data-i="${i}">
        <span class="cc-sw${r.use === 'large' ? ' big' : ''}" style="color:var(${r.fg});background:var(${r.bg})">${r.use === 'graphic' ? '<i class="cc-mark"></i>' : 'Aa'}</span>
        <span class="cc-name">${r.name}<small>${r.use === 'text' ? 'body text' : r.use === 'large' ? 'large or bold text' : 'icons, ticks, edges'}</small></span>
        <span class="cc-track">${thr.map(([v]) => `<b style="left:${x(v)}"></b>`).join('')}<span class="cc-stem" style="width:${x(r.r)}"></span><span class="cc-dot${r.pass ? '' : ' fail'}" style="left:${x(r.r)}"></span></span>
        <span class="cc-v"><b>${r.r.toFixed(2)}</b>${r.pass ? r.grade : 'below ' + need[r.use]}</span></div>`).join('') +
      `<div class="cc-axis"><span></span><span class="cc-track">${[1, 5, 10, 15, 21].map(v => `<i style="left:${x(v)}">${v}:1</i>`).join('')}</span><span></span></div>`;
    $$('.cc-row', host).forEach(el => {
      const r = rows[+el.dataset.i];
      const show = () => { const b = el.getBoundingClientRect(), h = host.getBoundingClientRect(), dot = $('.cc-dot', el).getBoundingClientRect();
        showTip(host, dot.left - h.left + dot.width / 2, b.top - h.top, `<b>${r.r.toFixed(2)} : 1</b>${r.name} · needs ${need[r.use]} for ${r.use === 'text' ? 'body text' : r.use === 'large' ? 'large text' : 'graphics'} · ${r.pass ? 'passes' : 'fails'}`); };
      el.addEventListener('mouseenter', show); el.addEventListener('focus', show);
      el.addEventListener('mouseleave', hideTip); el.addEventListener('blur', hideTip);
    });
    const twin = host.parentElement.querySelector('[data-twin]');
    if (twin) twin.innerHTML = `<table class="tbl"><thead><tr><th>Pair</th><th>Use</th><th class="n">Ratio</th><th>Result</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.name}</td><td>${r.use}</td><td class="n">${r.r.toFixed(2)}</td><td>${r.pass ? 'Pass, ' + r.grade : 'Fail'}</td></tr>`).join('')}</tbody></table>`;
  }
  $$('[data-chart="contrast"]').forEach(h => { contrastChart(h); themeListeners.push(() => contrastChart(h)); });

  function statsChart(host) {
    const S = window.STATS || [];
    const cols = [['frames', 'Line length', 'times round its own frame', v => v.toFixed(1)], ['strokes', 'Strokes', 'kept after the graph walk', v => v], ['lifts', 'Pen lifts', 'jumps too long to join', v => v]];
    const rows = S.slice().sort((a, b) => b.frames - a.frames);
    const max = Object.fromEntries(cols.map(([k]) => [k, Math.max(...rows.map(r => r[k]))]));
    host.innerHTML = `<div class="sc-row sc-head"><span>Drawing</span>${cols.map(([, t, s]) => `<span><b>${t}</b>${s}</span>`).join('')}</div>` +
      rows.map((r, i) => `<div class="sc-row${r.hl ? ' hl' : ''}" tabindex="0" data-i="${i}"><span class="sc-name">${r.label}<small>${r.kind}</small></span>${cols.map(([k, , , fmt]) => {
        const label = r.hl || r[k] === max[k];
        return `<span class="sc-cell"><i style="width:${(r[k] / max[k] * 100).toFixed(1)}%"></i>${label ? `<em>${fmt(r[k])}</em>` : ''}</span>`;
      }).join('')}</div>`).join('');
    $$('.sc-row[data-i]', host).forEach(el => {
      const r = rows[+el.dataset.i];
      const show = () => { const b = el.getBoundingClientRect(), h = host.getBoundingClientRect();
        showTip(host, b.left - h.left + b.width * 0.62, b.top - h.top, `<b>${r.label}</b>${r.frames.toFixed(2)} frames of line · ${r.strokes} strokes kept of ${r.raw} · ${r.lifts} pen lifts`); };
      el.addEventListener('mouseenter', show); el.addEventListener('focus', show);
      el.addEventListener('mouseleave', hideTip); el.addEventListener('blur', hideTip);
    });
    const twin = host.parentElement.querySelector('[data-twin]');
    if (twin) twin.innerHTML = `<table class="tbl"><thead><tr><th>Drawing</th><th>Kind</th><th class="n">Line length (frames)</th><th class="n">Raw pieces</th><th class="n">Strokes kept</th><th class="n">Pen lifts</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.label}</td><td>${r.kind}</td><td class="n">${r.frames.toFixed(2)}</td><td class="n">${r.raw}</td><td class="n">${r.strokes}</td><td class="n">${r.lifts}</td></tr>`).join('')}</tbody></table>`;
  }
  $$('[data-chart="stats"]').forEach(statsChart);

  /* ---------- small helpers: copy, filter chips ---------- */
  // click to copy lives in hl-ui.js, with the toast
  $$('[data-filter]').forEach(group => {
    const chips = $$('button', group), items = $$(group.dataset.filter);
    chips.forEach(c => c.addEventListener('click', () => {
      chips.forEach(b => b.setAttribute('aria-pressed', String(b === c)));
      items.forEach(it => { it.hidden = c.dataset.cat !== 'all' && it.dataset.cat !== c.dataset.cat; });
    }));
  });


  /* ---------- form template: steppers, summary, counter, validation, image pair ---------- */
  const form = $('#pass-form');
  if (form) {
    const price = () => +($('input[name="hours"]:checked', form)?.dataset.price || 0);
    const count = n => +$(`output[name="${n}"]`, form).textContent;
    const sum = (k, v) => { const el = $(`[data-sum="${k}"]`); if (el) el.textContent = v; };
    function summarise() {
      const a = count('adults'), c = count('kids'), hours = $('input[name="hours"]:checked', form);
      const locker = $('input[name="locker"]', form).checked;
      sum('city', $('input[name="city"]', form).value || 'Not chosen');
      sum('hours', hours ? hours.value + ' hours' : 'Not chosen');
      sum('people', `${a} adult${a === 1 ? '' : 's'}` + (c ? `, ${c} child${c === 1 ? '' : 'ren'}` : ''));
      sum('extras', locker ? 'Larger locker' : 'None');
      sum('total', '$' + (price() * a + price() * 0.5 * c + (locker ? 6 : 0)).toFixed(0));
    }
    $$('[data-stepper]', form).forEach(st => {
      const out = $('output', st), min = +st.dataset.min, max = +st.dataset.max;
      const sync = () => { const v = +out.textContent; $('[data-step="-1"]', st).disabled = v <= min; $('[data-step="1"]', st).disabled = v >= max; };
      $$('button', st).forEach(b => b.addEventListener('click', () => { out.textContent = clamp(+out.textContent + +b.dataset.step, min, max); sync(); summarise(); }));
      sync();
    });
    const notes = $('#notes'), counter = $('#notes-count span');
    notes.addEventListener('input', () => { counter.textContent = notes.value.length; });
    // the summary drawing becomes the chosen city's landmark and draws itself
    form.addEventListener('pick', e => {
      if (!e.target.closest('[data-for="city"]')) return;
      const v = e.detail;
      $$('.summary [data-city]').forEach(f => { f.hidden = f.dataset.city !== v; });
      const it = drawings.find(d => d.fig.dataset.city === v && d.mode === 'manual');
      if (it) { setDraw(it, 0); animate(it, 1, 1800); }
    });
    form.addEventListener('input', summarise);
    form.addEventListener('change', summarise);
    const rules = {
      city: el => !!el.value,
      date: el => !!el.value,
      name: el => el.value.trim().length > 1,
      email: el => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()),
      terms: el => el.checked
    };
    const fieldOf = id => $(`[data-for="${id}"]`, form);
    // popover fields keep their value in a hidden input; the visible control carries aria-invalid
    const valueOf = id => $('input[type="hidden"]', fieldOf(id)) || $('#' + id);
    function check(id, show) {
      const el = $('#' + id), ok = rules[id](valueOf(id)), f = fieldOf(id);
      if (show) { f.classList.toggle('invalid', !ok); el.setAttribute('aria-invalid', String(!ok)); }
      if (ok && f.classList.contains('invalid')) { f.classList.remove('invalid'); el.removeAttribute('aria-invalid'); }
      if (show && id !== 'terms' && id !== 'city' && id !== 'date') f.classList.toggle('valid', ok);
      return ok;
    }
    Object.keys(rules).forEach(id => {
      const el = valueOf(id);
      el.addEventListener('blur', () => { if (el.value || el.checked) check(id, true); });
      el.addEventListener('input', () => check(id, false));
      el.addEventListener('change', () => check(id, false));
    });
    const errBox = $('#err-summary'), done = $('#done');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = Object.keys(rules).filter(id => !check(id, true));
      done.hidden = true;
      if (bad.length) {
        $('[data-count]', errBox).textContent = bad.length;
        $('ul', errBox).innerHTML = bad.map(id => `<li><a href="#${id}">${fieldOf(id).dataset.name}</a></li>`).join('');
        errBox.hidden = false; errBox.focus();
        return;
      }
      errBox.hidden = true; done.hidden = false; done.focus();
    });
    errBox.addEventListener('click', e => { const a = e.target.closest('a'); if (a) { e.preventDefault(); $(a.getAttribute('href')).focus(); } });
    form.addEventListener('reset', () => setTimeout(() => {
      $$('.field', form).forEach(f => f.classList.remove('invalid', 'valid'));
      $$('[aria-invalid]', form).forEach(el => el.removeAttribute('aria-invalid'));
      $$('output', form).forEach(o => { o.textContent = o.name === 'adults' ? 2 : 0; });
      $$('[data-stepper]', form).forEach(st => $$('button', st).forEach(b => { b.disabled = false; }));
      $('[data-stepper] [data-step="-1"]', form).disabled = false;
      $$('.pick, .dp', form).forEach(p => p.reset && p.reset());
      counter.textContent = 0; errBox.hidden = true; done.hidden = true; summarise();
      $$('.summary [data-city]').forEach(f => { f.hidden = f.dataset.city !== ''; });
    }));
    summarise();
  }
  const pair = $('#pair-card');
  if (pair) {
    const slots = $('.slots', pair), boxes = { a: $('[data-slot="a"]', pair), b: $('[data-slot="b"]', pair) };
    const files = { a: null, b: null };
    let target = 'a';
    const render = () => {
      ['a', 'b'].forEach(k => {
        const box = boxes[k], img = $('img', box);
        box.classList.toggle('target', k === target);
        if (files[k]) { (img || box.appendChild(Object.assign(document.createElement('img'), { alt: '' }))).src = files[k]; $('.ph', box).hidden = true; }
        else { if (img) img.remove(); $('.ph', box).hidden = false; }
      });
      $('[data-target-name]', pair).textContent = target === 'a' ? 'LEFT' : 'RIGHT';
      $('[data-send]', pair).disabled = !(files.a && files.b);
    };
    const take = (k, file) => { if (!file || !file.type.startsWith('image/')) return; files[k] = URL.createObjectURL(file); target = files.a && !files.b ? 'b' : 'a'; render(); };
    ['a', 'b'].forEach(k => {
      const box = boxes[k];
      box.addEventListener('click', e => { if (!e.target.closest('label')) { target = k; render(); } });
      $('input', box).addEventListener('change', e => take(k, e.target.files[0]));
      ['dragenter', 'dragover'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove('drag'); }));
      box.addEventListener('drop', e => take(k, e.dataTransfer.files[0]));
    });
    document.addEventListener('paste', e => { const f = [...(e.clipboardData?.files || [])][0]; if (f && pair.getBoundingClientRect().top < innerHeight) take(target, f); });
    $('.swap', pair).addEventListener('click', () => { [files.a, files.b] = [files.b, files.a]; render(); });
    $$('.mode', pair).forEach(b => b.addEventListener('click', () => {
      $$('.mode', pair).forEach(m => m.setAttribute('aria-pressed', String(m === b)));
      slots.dataset.mode = b.dataset.mode;
    }));
    $('[data-send]', pair).addEventListener('click', () => { $('[data-pair-msg]', pair).textContent = 'Ready. Demo only: nothing was uploaded.'; });
    render();
  }

  /* ---------- page hooks + loop ---------- */
  window.HL = { $, $$, store, reduce, themeListeners };
  const onScroll = raf(() => { drawOnScroll(); drawGuide(false); onReadScroll(); });
  addEventListener('scroll', onScroll, { passive: true });
  const relayout = raf(() => { layoutGuide(); drawOnScroll(); onReadScroll(); });
  addEventListener('resize', relayout);
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(document.body);
  addEventListener('load', relayout);
  applyTheme(store.get('theme'));
  relayout();
})();
