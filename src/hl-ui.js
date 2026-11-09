/* Heavy Light — interactive components: toast, click to copy, popover select, two-month date picker,
   search filter, quiz, pick list, sortable table, Arabic font pick, skyline horizon.
   Runs after hl.js and uses window.HL. Plain script, no library, no network. */
(() => {
  const { $, $$, store, reduce } = window.HL;
  const NS = 'http://www.w3.org/2000/svg';
  const icon = n => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const phone = () => matchMedia('(max-width: 760px)').matches;
  // icons the script draws, listed so the build inlines them: icon('check-circle') icon('information-circle') icon('x-mark') icon('check')

  /* ---------- toast: closes itself after 8 s unless the reader presses Stay ---------- */
  const toasts = document.createElement('div');
  toasts.className = 'toasts';
  document.body.appendChild(toasts);
  function toast(msg, { ico = 'check-circle', ms = 8000 } = {}) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.innerHTML = `${icon(ico)}<span class="toast-msg">${esc(msg)}</span>
      <span class="toast-acts"><button type="button" class="toast-stay" aria-pressed="false">Stay</button><span class="toast-left" aria-hidden="true">${ms / 1000}s</span>
      <button type="button" class="toast-x" aria-label="Dismiss">${icon('x-mark')}</button></span><i class="toast-bar" style="animation-duration:${ms}ms"></i>`;
    toasts.appendChild(t);
    let left = ms, last = performance.now(), stay = false, paused = false, raf;
    const close = () => { cancelAnimationFrame(raf); t.classList.add('out'); setTimeout(() => t.remove(), reduce ? 0 : 200); };
    const tick = now => {
      if (!stay && !paused) left -= now - last;
      last = now;
      $('.toast-left', t).textContent = Math.max(0, Math.ceil(left / 1000)) + 's';
      if (left <= 0) close(); else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    $('.toast-stay', t).addEventListener('click', e => {
      stay = !stay;
      e.currentTarget.setAttribute('aria-pressed', String(stay));
      e.currentTarget.textContent = stay ? 'Staying' : 'Stay';
      t.classList.toggle('pinned', stay);
    });
    $('.toast-x', t).addEventListener('click', close);
    t.addEventListener('mouseenter', () => { paused = true; t.classList.add('paused'); });
    t.addEventListener('mouseleave', () => { paused = false; t.classList.remove('paused'); });
    t.addEventListener('focusin', () => { paused = true; t.classList.add('paused'); });
    t.addEventListener('focusout', () => { paused = false; t.classList.remove('paused'); });
    while (toasts.children.length > 3) toasts.firstElementChild.remove();
    return t;
  }

  /* ---------- click to copy: chips, code blocks, fields ----------
     Two ways to say so: the note (toast), or, when an empty <span class="ack" role="status"> sits
     right after the button, the same words next to it. */
  function say(trigger, msg, ico) {
    const ack = trigger && trigger.nextElementSibling;
    if (!ack || !ack.classList.contains('ack')) return toast(msg, { ico });
    ack.textContent = ''; // empty first, so a second copy is announced again
    ack.classList.toggle('info', ico !== 'check-circle');
    setTimeout(() => { ack.innerHTML = `${icon(ico)}<span>${esc(msg)}</span>`; }, 60);
  }
  async function copy(text, selectEl, trigger) {
    try { await navigator.clipboard.writeText(text); say(trigger, 'Copied to the clipboard.', 'check-circle'); }
    catch (e) {
      if (selectEl) { const r = document.createRange(); r.selectNodeContents(selectEl); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      say(trigger, 'Text selected. Press Ctrl+C or Cmd+C to copy.', 'information-circle');
    }
  }
  document.addEventListener('click', e => {
    const chip = e.target.closest('[data-copy-text]');
    if (chip) { copy(chip.dataset.copyText, chip, chip); return; }
    const btn = e.target.closest('[data-copy]');
    if (btn) { const el = document.getElementById(btn.dataset.copy); copy(el.value ?? el.textContent, el, btn); }
  });

  /* ---------- back to top, option B: the arrow shows once the reader is a screen down ---------- */
  $$('body > .to-top-fab').forEach(a => {
    const on = () => a.classList.toggle('on', scrollY > innerHeight);
    addEventListener('scroll', on, { passive: true }); on();
  });

  /* ---------- floating panels: position under the trigger, or a bottom sheet on phones ---------- */
  let openPanel = null;
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.hidden = true;
  document.body.appendChild(scrim);
  function place(panel, trigger) {
    if (phone()) { panel.classList.add('sheet'); panel.style.cssText = ''; return; }
    panel.classList.remove('sheet');
    const r = trigger.getBoundingClientRect(), pw = panel.offsetWidth, ph = panel.offsetHeight;
    const below = innerHeight - r.bottom, up = below < ph + 16 && r.top > ph + 16;
    let left = Math.min(r.left, innerWidth - pw - 16);
    panel.style.left = Math.max(16, left) + 'px';
    panel.style.top = (up ? r.top - ph - 8 : r.bottom + 8) + 'px';
    panel.style.minWidth = r.width + 'px';
  }
  function openP(panel, trigger, onClose) {
    if (openPanel) openPanel.close(false);
    // lift the panel to <body> while open: sections are stacking contexts (z-index 1) and would trap it
    const home = panel.parentNode, next = panel.nextSibling;
    document.body.appendChild(panel);
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    place(panel, trigger);
    if (phone()) scrim.hidden = false;
    const close = (refocus = true) => {
      panel.hidden = true; scrim.hidden = true;
      home.insertBefore(panel, next);
      trigger.setAttribute('aria-expanded', 'false');
      openPanel = null;
      if (refocus) trigger.focus();
      onClose && onClose();
    };
    openPanel = { panel, trigger, close };
    return close;
  }
  document.addEventListener('pointerdown', e => {
    if (openPanel && !openPanel.panel.contains(e.target) && !openPanel.trigger.contains(e.target)) openPanel.close(false);
  });
  addEventListener('resize', () => { if (openPanel) place(openPanel.panel, openPanel.trigger); });
  addEventListener('scroll', () => { if (openPanel && !phone()) place(openPanel.panel, openPanel.trigger); }, { passive: true });

  /* ---------- popover select (listbox), not the native dropdown ---------- */
  $$('.pick[data-times]').forEach(p => {
    const ul = $('.pick-list', p);
    for (let m = 0; m < 24 * 60; m += 30) {
      const v = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
      ul.insertAdjacentHTML('beforeend', `<li role="option" data-value="${v}">${icon('check')}<span>${v}</span></li>`);
    }
  });
  let uid = 0;
  $$('.pick').forEach(p => {
    const btn = $('.pick-btn', p), list = $('.pick-list', p), val = $('.pick-val', btn), input = $('input[type="hidden"]', p);
    const opts = () => $$('[role="option"]', list);
    opts().forEach(o => { o.id = o.id || `pk${++uid}`; o.setAttribute('aria-selected', String(o.dataset.value === input.value)); });
    const pre = opts().find(o => o.dataset.value === input.value && input.value);
    if (pre) { val.textContent = $('span', pre)?.textContent || pre.dataset.value; p.classList.add('has-value'); }
    let active = -1, typed = '', typedAt = 0;
    const setActive = i => {
      const os = opts(); active = Math.max(0, Math.min(os.length - 1, i));
      os.forEach((o, k) => o.classList.toggle('active', k === active));
      list.setAttribute('aria-activedescendant', os[active].id);
      os[active].scrollIntoView({ block: 'nearest' });
    };
    const choose = o => {
      opts().forEach(x => x.setAttribute('aria-selected', String(x === o)));
      input.value = o.dataset.value;
      val.textContent = o.dataset.label || $('span', o)?.textContent || o.dataset.value;
      p.classList.add('has-value');
      p.dispatchEvent(new CustomEvent('pick', { bubbles: true, detail: input.value }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    let close = null;
    const open = () => {
      close = openP(list, btn, () => { close = null; });
      const sel = opts().findIndex(o => o.getAttribute('aria-selected') === 'true');
      setActive(sel >= 0 ? sel : 0);
      list.focus({ preventScroll: true });
    };
    btn.addEventListener('click', () => (close ? close() : open()));
    btn.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); } });
    list.addEventListener('click', e => { const o = e.target.closest('[role="option"]'); if (o) { choose(o); close && close(); } });
    list.addEventListener('pointermove', e => { const o = e.target.closest('[role="option"]'); if (o) setActive(opts().indexOf(o)); });
    list.addEventListener('keydown', e => {
      const n = opts().length;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(n - 1); }
      else if (e.key === 'PageDown') { e.preventDefault(); setActive(active + 8); }
      else if (e.key === 'PageUp') { e.preventDefault(); setActive(active - 8); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(opts()[active]); close && close(); }
      else if (e.key === 'Escape') { e.preventDefault(); close && close(); }
      else if (e.key === 'Tab') { close && close(false); }
      else if (e.key.length === 1) { // type-ahead
        const now = performance.now(); typed = (now - typedAt > 700 ? '' : typed) + e.key.toLowerCase(); typedAt = now;
        const k = opts().findIndex(o => o.textContent.trim().toLowerCase().startsWith(typed));
        if (k >= 0) setActive(k);
      }
    });
    const initial = input.value;
    p.reset = () => { input.value = initial; const o = opts().find(x => x.dataset.value === initial && initial); val.textContent = o ? ($('span', o)?.textContent || initial) : (p.dataset.placeholder || ''); p.classList.toggle('has-value', !!o); opts().forEach(x => x.setAttribute('aria-selected', String(x === o))); };
  });

  /* ---------- date picker: two months side by side (one on phones), arrows step a month ---------- */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const nice = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  $$('.dp').forEach(dp => {
    const btn = $('.dp-btn', dp), pop = $('.dp-pop', dp), months = $('.dp-months', dp), input = $('input[type="hidden"]', dp), val = $('.dp-val', btn);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let view = new Date(today.getFullYear(), today.getMonth(), 1), focus = new Date(today), close = null;
    const sel = () => (input.value ? fromIso(input.value) : null);
    function month(first) {
      const y = first.getFullYear(), m = first.getMonth(), days = new Date(y, m + 1, 0).getDate(), lead = (first.getDay() + 6) % 7;
      let cells = '';
      for (let i = 0; i < lead; i++) cells += '<span></span>';
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d), k = iso(date), s = sel();
        const past = date < today, isSel = s && iso(s) === k, isToday = iso(today) === k, isFocus = iso(focus) === k;
        cells += `<button type="button" data-d="${k}" class="${isToday ? 'today' : ''}" ${past ? 'disabled' : ''} aria-pressed="${!!isSel}" tabindex="${isFocus ? 0 : -1}" aria-label="${nice(date)}${isToday ? ', today' : ''}">${d}</button>`;
      }
      return `<div class="dp-month"><p class="dp-cap"><b>${MONTHS[m]}</b> <span class="thin">${y}</span></p><div class="dp-grid" role="grid">${DAYS.map(x => `<span class="dp-dow" aria-hidden="true">${x}</span>`).join('')}${cells}</div></div>`;
    }
    function render(focusDay) {
      const n = phone() ? 1 : 2;
      months.innerHTML = Array.from({ length: n }, (_, i) => month(new Date(view.getFullYear(), view.getMonth() + i, 1))).join('');
      $('.dp-prev', pop).disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
      if (focusDay) $(`[data-d="${iso(focus)}"]`, months)?.focus();
    }
    function moveFocus(d) {
      const n = phone() ? 1 : 2;
      if (d < today) d = new Date(today);
      focus = d;
      const last = new Date(view.getFullYear(), view.getMonth() + n, 0);
      if (d < view) view = new Date(d.getFullYear(), d.getMonth(), 1);
      else if (d > last) view = new Date(d.getFullYear(), d.getMonth() - n + 1, 1);
      render(true);
    }
    function pickDay(k) {
      input.value = k; val.textContent = nice(fromIso(k)); dp.classList.add('has-value');
      input.dispatchEvent(new Event('change', { bubbles: true }));
      dp.dispatchEvent(new CustomEvent('pick', { bubbles: true, detail: k }));
      close && close();
    }
    btn.addEventListener('click', () => {
      if (close) { close(); return; }
      const s = sel(); focus = s || new Date(today); view = new Date(focus.getFullYear(), focus.getMonth(), 1);
      render(false);
      close = openP(pop, btn, () => { close = null; });
      $(`[data-d="${iso(focus)}"]`, months)?.focus();
    });
    $('.dp-prev', pop).addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(false); });
    $('.dp-next', pop).addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(false); });
    $('.dp-today', pop).addEventListener('click', () => pickDay(iso(today)));
    $('.dp-close', pop).addEventListener('click', () => close && close());
    months.addEventListener('click', e => { const b = e.target.closest('button[data-d]'); if (b && !b.disabled) pickDay(b.dataset.d); });
    pop.addEventListener('keydown', e => {
      const b = e.target.closest('button[data-d]');
      if (e.key === 'Escape') { e.preventDefault(); close && close(); return; }
      if (!b) return;
      const d = fromIso(b.dataset.d), step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (step) { e.preventDefault(); d.setDate(d.getDate() + step); moveFocus(d); }
      else if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); d.setMonth(d.getMonth() + (e.key === 'PageDown' ? 1 : -1)); moveFocus(d); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() + (e.key === 'Home' ? -wd : 6 - wd)); moveFocus(d); }
    });
    addEventListener('resize', () => { if (close) render(false); });
    dp.reset = () => { input.value = ''; val.textContent = dp.dataset.placeholder || 'Choose a date'; dp.classList.remove('has-value'); };
  });

  /* ---------- search: filter a list as you type, mark the matches, "/" jumps to the box ---------- */
  $$('[data-search]').forEach(inp => {
    const list = $(inp.dataset.search), items = $$(':scope > *', list), count = document.getElementById(inp.dataset.count), empty = document.getElementById(inp.dataset.empty);
    const noun = inp.dataset.noun || 'items';
    items.forEach(it => { it._html = it.innerHTML; it._text = it.textContent.toLowerCase(); });
    const re = q => new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    function mark(el, q) { // wrap matches in text nodes only, so markup stays intact
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(n => {
        if (!n.nodeValue.toLowerCase().includes(q)) return;
        const span = document.createElement('span');
        span.innerHTML = esc(n.nodeValue).replace(re(esc(q)), m => `<mark>${m}</mark>`);
        n.replaceWith(...span.childNodes);
      });
    }
    function run() {
      const q = inp.value.trim().toLowerCase();
      let n = 0;
      items.forEach(it => {
        it.innerHTML = it._html;
        const hit = !q || it._text.includes(q);
        it.hidden = !hit;
        if (hit) { n++; if (q) mark(it, q); }
      });
      if (count) count.textContent = q ? `${n} of ${items.length} ${noun}` : `${items.length} ${noun}`;
      if (empty) { empty.hidden = n > 0; empty.querySelector('q').textContent = inp.value.trim(); }
    }
    inp.addEventListener('input', run);
    inp.addEventListener('keydown', e => { if (e.key === 'Escape' && inp.value) { e.preventDefault(); inp.value = ''; run(); } });
    run();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.target.closest('input, textarea, [contenteditable], [role="listbox"]')) return;
    const box = $('[data-search]');
    if (box) { e.preventDefault(); box.focus(); box.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
  });

  /* ---------- quiz: pick an answer, then read why each option is right or wrong ---------- */
  $$('[data-quiz]').forEach(host => {
    const Q = JSON.parse($('script[type="application/json"]', host).textContent);
    const key = 'quiz-' + host.dataset.quiz, L = 'ABCD';
    let ans = {}; try { ans = JSON.parse(store.get(key) || '{}'); } catch (e) { ans = {}; }
    const topics = [...new Set(Q.map(q => q.topic))];
    let only = 'all';
    const list = $('.quiz', host), score = $('[data-score]', host), bar = $('[data-bar]', host), chips = $('.chips', host);
    if (chips && topics.length > 1) {
      chips.innerHTML = '<span class="chips-l" aria-hidden="true">Show:</span>' + ['all', ...topics].map(t => `<button type="button" aria-pressed="${t === 'all'}" data-t="${esc(t)}">${t === 'all' ? 'All' : esc(t)}</button>`).join('');
      chips.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; only = b.dataset.t; $$('button', chips).forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); });
    }
    function render() {
      const shown = Q.map((q, i) => ({ ...q, i })).filter(q => only === 'all' || q.topic === only);
      list.innerHTML = shown.map(q => {
        const got = ans[q.i], done = got != null;
        return `<article class="q${done ? ' done' : ''}" data-i="${q.i}"><p class="qh"><span class="tag line">${esc(q.topic)}</span><span>${q.i + 1} / ${Q.length}</span></p>
          <h4 class="h3">${esc(q.q)}</h4>
          <div class="opts" role="group" aria-label="Answers">${q.o.map((o, k) => `<button type="button" class="o${done && k === q.a ? ' right' : ''}${done && k === got && k !== q.a ? ' wrong' : ''}" data-k="${k}" ${done ? 'aria-disabled="true"' : ''}><span class="l">${L[k]}</span><span>${esc(o[0])}</span>${done && k === q.a ? icon('check') : done && k === got ? icon('x-mark') : ''}</button>`).join('')}</div>
          ${done ? `<div class="why" tabindex="-1">${q.o.map((o, k) => `<p class="${k === q.a ? 'ok' : ''}"><span class="l">${L[k]}</span><span><b>${k === q.a ? 'Right.' : 'Wrong.'}</b> ${esc(o[1])}</span></p>`).join('')}</div>` : ''}</article>`;
      }).join('');
      const answered = Q.filter((q, i) => ans[i] != null), right = answered.filter(q => ans[Q.indexOf(q)] === q.a).length;
      score.textContent = `${right} / ${Q.length}`;
      bar.style.width = (answered.length / Q.length) * 100 + '%';
    }
    list.addEventListener('click', e => {
      const b = e.target.closest('button.o'); if (!b) return;
      const q = b.closest('.q'), i = +q.dataset.i;
      if (ans[i] != null) return;
      ans[i] = +b.dataset.k; store.set(key, JSON.stringify(ans)); render();
      $(`.q[data-i="${i}"] .why`, list)?.focus({ preventScroll: true });
      $(`.q[data-i="${i}"]`, list)?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    });
    $('[data-reset]', host).addEventListener('click', () => { ans = {}; store.set(key, '{}'); render(); });
    render();
  });

  /* ---------- pick list: tick items, progress kept in this browser ---------- */
  $$('[data-picklist]').forEach(host => {
    const key = 'pick-' + host.dataset.picklist, boxes = $$('input[type="checkbox"]', host);
    let done = {}; try { done = JSON.parse(store.get(key) || '{}'); } catch (e) { done = {}; }
    boxes.forEach((b, i) => { b.dataset.k = b.dataset.k || String(i); b.checked = !!done[b.dataset.k]; });
    const bar = $('[data-bar]', host), txt = $('[data-count]', host);
    const prog = () => {
      const n = boxes.filter(b => b.checked).length;
      bar.style.width = (n / boxes.length) * 100 + '%';
      txt.textContent = n === boxes.length ? `All ${n} done` : `${n} of ${boxes.length} done`;
      $$('.pl-col', host).forEach(c => { const bs = $$('input', c); c.classList.toggle('complete', bs.length && bs.every(b => b.checked)); });
    };
    host.addEventListener('change', e => { const b = e.target; if (!b.dataset.k) return; done[b.dataset.k] = b.checked; store.set(key, JSON.stringify(done)); prog(); });
    $('[data-reset]', host)?.addEventListener('click', () => { done = {}; store.set(key, '{}'); boxes.forEach(b => { b.checked = false; }); prog(); });
    prog();
  });

  /* ---------- sortable table: buttons in the header, aria-sort on the column ---------- */
  $$('table[data-sort]').forEach(t => {
    const ths = $$('thead th', t), body = t.tBodies[0];
    ths.forEach((th, ci) => {
      const b = $('button', th); if (!b) return;
      b.addEventListener('click', () => {
        const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        ths.forEach(x => { if (x !== th && x.hasAttribute('aria-sort')) x.setAttribute('aria-sort', 'none'); });
        th.setAttribute('aria-sort', dir);
        const v = r => { const c = r.cells[ci]; const s = c.dataset.v ?? c.textContent.trim(); return isNaN(+s) ? s.toLowerCase() : +s; };
        const rows = [...body.rows].sort((a, b2) => (v(a) > v(b2) ? 1 : v(a) < v(b2) ? -1 : 0) * (dir === 'ascending' ? 1 : -1));
        rows.forEach(r => body.appendChild(r));
        const live = (t.closest('section') || document).querySelector('[data-sort-status]');
        if (live) live.textContent = `Sorted by ${b.textContent.trim()}, ${dir}.`;
      });
    });
  });

  /* ---------- Arabic font pick: Kufi is built in (inlined Noto Kufi Arabic); Sans and Naskh are the machine's own ---------- */
  const arPick = $('.ar-pick');
  if (arPick) {
    const set = (id) => {
      const b = $(`button[data-id="${id}"]`, arPick) || $('button', arPick);
      document.documentElement.style.setProperty('--arabic', b.dataset.stack);
      $$('button', arPick).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const out = $('[data-stack-out]'); if (out) out.textContent = b.dataset.stack;
      store.set('arabic', b.dataset.id);
    };
    arPick.addEventListener('click', e => { const b = e.target.closest('button'); if (b) set(b.dataset.id); });
    set(store.get('arabic') || 'kufi');
  } else {
    const id = store.get('arabic'); // carry the choice to other pages
    const stacks = { sans: '"Geeza Pro", "Segoe UI", "Noto Sans Arabic", Tahoma, sans-serif', naskh: '"Damascus", "Noto Naskh Arabic", "Traditional Arabic", "Times New Roman", serif', kufi: '"HL Kufi", "Geeza Pro", "Segoe UI", sans-serif' };
    if (id && stacks[id]) document.documentElement.style.setProperty('--arabic', stacks[id]);
  }

  /* ---------- skyline horizon: solid skylines on one ground line, rising as you scroll ----------
     The silhouettes are SVG; the pins and city names are HTML so they stay a readable size at any width. */
  const ART = window.ART || {};
  $$('.horizon[data-skylines]').forEach(h => {
    const names = h.dataset.skylines.split(','), labels = JSON.parse(h.dataset.labels || '{}'), pins = JSON.parse(h.dataset.pins || '[]');
    const parts = names.map(n => ART[n]).filter(Boolean);
    if (!parts.length) return;
    const W = parts.reduce((s, a) => s + a.w, 0), H = Math.max(...parts.map(a => a.h));
    let x = 0, g = '', cities = '';
    parts.forEach((a, i) => {
      g += `<g transform="translate(${x} ${H - a.h})">${a.fills.map(f => `<path d="${f.d}"/>`).join('')}</g>`;
      cities += `<span style="left:${(x / W) * 100}%">${esc(labels[names[i]] || names[i])}</span>`;
      x += a.w;
    });
    const stems = pins.map(p => `<line x1="${p.x * W}" y1="0" x2="${p.x * W}" y2="${H}"/>`).join('');
    const pinsHtml = pins.map((p, i) => `<span class="hz-pin${p.x > 0.6 ? ' flip' : ''}" style="left:${p.x * 100}%;top:${(i % 2) * 34}px;--i:${i}"><b>${esc(p.t)}</b><small>${esc(p.s || '')}</small><em>${esc(p.c || '')}</em></span>`).join('');
    h.innerHTML = (pins.length ? `<div class="hz-pins" aria-hidden="true">${pinsHtml}</div>` : '') +
      `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" preserveAspectRatio="none"><g class="hz-stems">${stems}</g><g class="hz-rise">${g}</g></svg>` +
      `<div class="hz-ground" aria-hidden="true">${cities}</div>`;
    const rise = $('.hz-rise', h);
    const update = () => {
      const r = h.getBoundingClientRect(), vh = innerHeight;
      const p = reduce ? 1 : Math.max(0, Math.min(1, (vh * 0.95 - r.top) / (vh * 0.4)));
      rise.style.transform = `translateY(${(1 - p) * (H + 10)}px)`;
      h.classList.toggle('pins-on', p > 0.9);
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  });

  window.HL.toast = toast;
})();
