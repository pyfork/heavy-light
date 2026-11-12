# Heavy Light: a reusable design system

<a id="top"></a>

Thin words next to heavy ones, square grey panels, one green for action, orange ticks, mint labels, a yellow sticker for good news, and pictures made of one continuous line that draw themselves as you scroll.

## Contents

- [1. What's in the box](#1-whats-in-the-box)
- [2. Principles](#2-principles)
- [3. Colour tokens](#3-colour-tokens)
- [4. Type](#4-type)
- [5. Space, shape, depth](#5-space-shape-depth)
- [6. Motion](#6-motion)
- [7. Icons](#7-icons)
- [8. Components](#8-components)
- [9. Line art](#9-line-art)
- [10. The companion line](#10-the-companion-line)
- [11. Data and diagrams](#11-data-and-diagrams)
- [12. Tables](#12-tables)
- [13. Click to copy](#13-click-to-copy)
- [14. Mobile](#14-mobile)
- [15. Dark](#15-dark)
- [16. The three contexts](#16-the-three-contexts)
- [17. Rebuild](#17-rebuild)
- [18. Checks done and known limits](#18-checks-done-and-known-limits)

## 1. What's in the box

| File | What it is |
|---|---|
| `heavy-light-system.html` | The reference: principles, colour with a live contrast chart, type with an Arabic font pick, space, motion, icons, components, line art (two options), data and diagrams, tables, click to copy, mobile, dark, contexts, copyable tokens |
| `heavy-light-landing.html` | Landing page template (made-up layover city pass "Halfway") |
| `heavy-light-form.html` | Form template: two-step checkout, every field state, an image pair |
| `heavy-light-blog.html` | Blog template: filterable index, long article with a contents rail whose spine draws as you read |
| `docs-public/heavy-light-design-system.md` | This spec |

Every page is one self-contained HTML file: system fonts, inlined Heroicons, photos as WebP data, no network calls. Open any of them straight from the folder.

[Back to top](#top)

## 2. Principles

1. **Weight carries the hierarchy.** One system font, six weights. Every line that matters puts a 200 next to a 900 ("Seven cities. **One pass**").
2. **Square, flat, quiet.** Corner radius 0. No gradients. One soft shadow, on the main button only. Light grey panels on white.
3. **Each colour has one job.** Green acts. Orange confirms (the tick). Mint labels. Yellow celebrates. Status colours always come with an icon and a word.
4. **One line per picture.** Illustrations are one continuous stroke over flat colour blocks set 14px / 10px off register, traced from real photographs.
5. **Motion follows the reader.** Lines draw at your scroll speed; a companion line walks down the margin. Reduced motion shows everything finished.

[Back to top](#top)

## 3. Colour tokens

Each token is set once with `light-dark()`; `:root[data-theme]` sets `color-scheme` for the switch.

| Token | Light | Dark | Job |
|---|---|---|---|
| `--paper` | `#ffffff` | `#101511` | Page |
| `--panel` | `#f6f6f6` | `#1a211c` | Panels, cards |
| `--panel-2` | `#ebebeb` | `#222a24` | Second tier |
| `--field` | `#ffffff` | `#121813` | Inputs |
| `--deep` | `#323237` | `#0a0d0b` | Footer |
| `--ink` | `#222222` | `#eeeeee` | Text, the line |
| `--ink-2` | `#555555` | `#b0b0b0` | Second text |
| `--muted` | `#6b6b6b` | `#8f978f` | Hints, meta |
| `--edge` | `#d6d6d6` | `#3a443d` | Hairlines |
| `--edge-hi` | `#888888` | `#7a857d` | Control edges |
| `--act` | `#2f7d58` | `#5cbf8f` | Buttons (text `--on-act`: `#fff` / `#0b140e`) |
| `--link` | `#2c622c` | `#6cc196` | Links, focus |
| `--tick` | `#d9681f` | `#f0a060` | The orange tick |
| `--mint` | `#d4e4dc` | `#23382c` | Tags (text `--on-mint`) |
| `--cheer` | `#ffcd2e` | `#ffcd2e` | Celebrates: the badge, the cheer tag and the closing band. Sticker yellow in both themes, with ink on it (`--on-cheer`, `#101511`, 12.3:1). It sits on a photo or a band: on plain paper its edge is faint (1.5:1). The ochre block is its soft partner in the drawings; keep the two apart |
| `--blk-1…4` | `#bfdccb` `#f3b4ab` `#f0cf8a` `#b9d2de` | `#2c4a3a` `#6a3a35` `#5e4f26` `#2b4654` | Blocks under drawings: sea glass, coral, ochre, harbour |
| `--ok` `--warn` `--bad` | `#2f7d58` `#9a5b00` `#c23b32` | `#6cc196` `#e0a54a` `#f0857c` | Status |

**Why this green:** `#2f7d58` under white text is 5.01:1, over the 4.5 body-text line, so the main button passes AA. The system page measures every text and mark pair live in the current theme; all pass their threshold.

[Back to top](#top)

## 4. Type

- **Stack:** `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Nothing to download; every weight exists on macOS.
- **Long reads:** body paragraphs switch to `"Iowan Old Style", Charter, "Palatino Linotype", Georgia, serif` at 20/32.
- **Weights:** 200 thin half of a heading, wordmark, nav · 300 hints, choices at rest, meta · 400 body · 700 tick lists, chosen option · 800 uppercase labels (14px, +0.06em) · 900 headings, buttons, tags.

| Role | Size / line | Weight | Class |
|---|---|---|---|
| Display | clamp(48, 8vw, 104) / 0.95 | 900 + 200 | `.display` |
| Heading 1 | clamp(40, 5.2vw, 64) / 1.02 | 900 + 200 | `.h1` |
| Heading 2 | 44 / 48 (32 / 36 on phones) | 900 + 200 | `.h2` |
| Heading 3 | 24 / 30 | 900 + 200 | `.h3` |
| Kicker | 13 / 18, +0.12em, uppercase | 900 | `.kicker` |
| Label | 14 / 20, +0.06em, uppercase | 800 | `.label` |
| Dek | 20 / 30 | 300 | `.dek` |
| Body | 18 / 28 | 400 | default |
| Hint | 15 / 22 italic | 300 | `.hint` |

**The rule:** split a heading where the meaning turns, light before heavy: `<span class="thin">Pay for the hours,</span> not the week.`

**Arabic beside English:** the default face is **Noto Kufi Arabic, built into every page**, so Arabic looks the same on every machine. It is cut to the Arabic alphabet, its marks, Arabic punctuation and Arabic digits, keeps every weight from 100 to 900, and adds 24 KB (32 KB as base64) per page; no network call. The family is named `HL Kufi` so an installed copy never takes over. Sans and Naskh stay on the system page's picker as the machine's own faces; the pick is kept per browser.

| Pick | Stack |
|---|---|
| Kufi, built in (default) | `"HL Kufi", "Geeza Pro", "Segoe UI", sans-serif` |
| Sans | `"Geeza Pro", "Segoe UI", "Noto Sans Arabic", Tahoma, sans-serif` |
| Naskh | `"Damascus", "Noto Naskh Arabic", "Traditional Arabic", "Times New Roman", serif` |

Arabic sits in its own `<span class="ar" lang="ar">` (right to left, isolated), at 400 and one size up, never uppercase or letter-spaced.

Font licence: SIL Open Font License 1.1, (c) 2022 The Noto Project Authors; the full text ships in `src/fonts/OFL.txt` and the notice sits in the CSS. A letter outside the cut (Persian or Urdu letters, for example) falls back to the system face: widen `--unicodes` in the subset command under Rebuild.

[Back to top](#top)

## 5. Space, shape, depth

- **Space:** 4px grid, `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 · `--s7` 40 · `--s8` 48 · `--s9` 64 · `--s10` 96 · `--s11` 140 (the gap between landing sections, where the companion line crosses).
- **Layout:** `.wrap` max 1200 with 40px gutters (16px under 760px). Reading column 640px plus a 180px margin for notes.
- **Corners:** 0 everywhere. Circles only where round means something: the badge, the swap button, radios.
- **Depth:** one shadow, `0 4px 4px rgba(0,0,0,.1)`, on the main button.
- **Edges:** 1px at rest, 2px for the target or chosen card, 3px focus outline in `--focus`.

[Back to top](#top)

## 6. Motion

| Token | Value | Use |
|---|---|---|
| `--t-fast` | 150ms | Hover colour, a tick appearing |
| `--t-base` | 300ms | Switch thumb, arrow nudge, tile fade |
| `--t-slow` | 900ms | Colour blocks sliding into register |
| `--ease` | `cubic-bezier(.65,.05,.36,1)` | Things that travel |
| `--ease-out` | `cubic-bezier(.2,.7,.2,1)` | Things that arrive |

- **Scroll draw:** progress = (98% of viewport − figure top) / 62% of viewport, clamped 0–1.
- **Hero draw:** the first drawing only, 3.6–5.2s, ease-out.
- **Hover draw:** 1.4s in, 0.5s out (city cards).
- **Reduced motion:** every drawing and the companion line show finished; no transitions.

[Back to top](#top)

## 7. Icons

Heroicons 2.2.0 outline only (MIT). 24px grid, 1.5 stroke, shown at 20px; ticks and button arrows go to 2–3 stroke. The build inlines only the icons a page uses, as `<symbol>`s referenced with `<use href="#i-name">`. No icon font, no emoji, no unicode arrows.

[Back to top](#top)

## 8. Components

| Component | Class | Notes |
|---|---|---|
| Main button | `.btn` | Green, uppercase 900, square, one drop, arrow nudges 4px |
| Second button | `.btn.line` | Never two green buttons side by side |
| Small / cheer / deep | `.btn.small` `.btn.cheer` `.btn.deep` | Cheer and deep only on coloured bands. Deep (charcoal) is the action on the yellow band: 8:1 against it, where green would drop to 1.5:1 in dark |
| Text link | `.link-up` | Uppercase 900 green with a long arrow |
| Tick list | `.ticks` | Heroicon check in `--tick`, 3 stroke, bold text |
| Tag | `.tag` `.tag.line` `.tag.cheer` | Mint by default; LEFT / RIGHT in the image pair |
| Badge | `.badge` | Yellow sticker, tilted 9°, thin + heavy ink text, one per page, on a photo or a band |
| Field | `.field` + `.label` + `.input` / `.select` / `.textarea` | Label above, light italic placeholder, error bar + icon + sentence |
| Checkbox / radio | `.check` `.check.radio` | Square box with the orange tick |
| Switch | `.switch` | Square track, green when on |
| Choice cards | `.choices` > `.choice` | Radio cards; chosen card gets mint, green edge, 900 title |
| Stepper | `.stepper` | Minus / count / plus, bounds disable the buttons |
| Image pair | `.slots` > `.slot` + `.swap` | LEFT / RIGHT tags, round swap, paste target in green |
| Status | `.status.ok/.warn/.bad/.info` | Left bar, icon, bold title, plain sentence |
| Split block | `.split` `.split.flip` | Text panel + photo, alternating |
| Stats | `.stats` | Big 900 numbers over 300 captions, rules between |
| Q / A | `.faq` | Tab list of questions, green selected bar, big Q: and A: |
| Figure | `.fig` + `figcaption` + `.credit` | Caption bold lead, credit in small light text |
| Pull quote | `.quote` | Thin + heavy, rules above and below |
| Contents rail | `.rail` + `.toc` + `.spine` | Sticky; current item green, read items ink, spine draws |
| Theme switch | `.theme` | Light / dark / device, square buttons |
| Popover select | `.pick` > `.pick-btn` + `.pick-list` + hidden input | Replaces native `<select>`: arrows, Home/End, type to jump, Enter, Esc; orange tick on the chosen row; `data-times` fills half-hour slots |
| Date picker | `.dp` > `.dp-btn` + `.dp-pop` + hidden input | Two months side by side, arrows step a month; past days struck through, today marked with an orange dot; arrow keys, PageUp/PageDown, Home/End |
| Search | `.search-box` + `input[data-search]` | Filters a list as you type, marks matches in ochre, counts what's left, plain empty state; `/` jumps to the box, Esc clears; Arabic is searchable |
| Quiz | `[data-quiz]` + JSON | Lettered options, then "Right." / "Wrong." with a reason for every option; solid green edge and tick vs dashed red edge and cross; score bar, Start again, topic chips behind a visible "Show:" label (all, or one topic); kept per browser |
| Pick list | `[data-picklist]` | After "Your first ninety days": columns are phases, rows are tasks; ticked rows strike through, a finished column says "done", a bar counts the lot; kept per browser |
| The note (toast) | `HL.toast(msg)` | "Copied to the clipboard." Pops up bottom centre, closes after 8 s with a countdown bar; Stay pins it; hover or focus pauses; X closes |
| Ack next to the button | `<span class="ack" role="status">` straight after the button | An orange tick and "Copied to the clipboard." beside the button that was pressed; stays until the next copy. For the one main action on a page |
| Back to top, A | `p.to-top` > `a[href="#top"]` | A link closing every section. For reference pages with a contents list at the top (the system page) |
| Back to top, B | `a.to-top-fab`, last child of `body` | Square 48px ink arrow, bottom right, no shadow, green on hover; shows once the reader is one screen down; on phones hides while a note shows. For long read-through pages (landing, journal) |
| Wordmark | `.wordmark` | Uppercase stack, name in 900, words around in 200 |

[Back to top](#top)

## 9. Line art

Two options, side by side on the system page:

- **Option A, one stroke, flat colour:** for one subject. Described below.
- **Option B, skyline horizon:** optional, off by default. Trace and show a skyline only when the brief asks for one. For a row of places. Solid ink skyline silhouettes (Riyadh, Abu Dhabi, Dubai) on one ground strip with the city names reversed out in white, rising from the ground as you scroll. Pins are a green square on a dashed stem with a 900 label and a 300 line, on two alternating heights, flipped to the left near the right edge, airport code only on phones. Markup: `<div class="horizon" data-skylines="riyadh,abudhabi,dubai" data-labels="{...}" data-pins="[...]">`. The silhouettes are SVG; pins and names are HTML so they stay readable at any width.

Option A: every picture is one continuous stroke over offset blocks of flat colour, traced from a real photo with OpenCV (`tools/trace.py`):

1. **Separate the subject.** Landmarks against sky: GrabCut seeded from a box, top rows forced to sky (seven-hearings tuning). Objects on a plain backdrop: backdrop colour from the border, Otsu + GrabCut, shadow removal; dark objects use a brightness threshold; a clear lens adds a Hough circle. Skylines: Otsu on brightness, the top edge of the dark part, cut just under the lowest roof.
2. **Edges.** Canny inside the silhouette (or fast line detection and tone contours for facades), keeping only long edges.
3. **Skeleton.** Zhang–Suen thinning (`cv2.ximgproc.thinning`) to one-pixel centre lines.
4. **Strokes.** Walk the skeleton graph between ends and junctions; a diagonal step is not a junction when a straight neighbour already joins the two pixels.
5. **One pen path.** Nearest loose end first, then 2-opt on the joins; short jumps are drawn, long ones lift the pen.
6. **Ink.** Douglas–Peucker, Chaikin corner-cutting, rounded corners as quadratic curves, normalised to a 1000-wide viewBox.

On the page: `<figure class="art" data-art="name">` gets the drawing; `--b1/--b2/--b3` pick block colours; `data-noblocks` drops the blocks; `.hero-draw`, `.hover-draw`, `.manual-draw` change the timing. Line 2.1px, round caps, `vector-effect: non-scaling-stroke`; a 5px green pen dot rides the tip while drawing.

**The drawings (16 in use):** Doha, Kuala Lumpur, Jakarta, Singapore, Bangkok, Riyadh, Dubai (landmarks); suitcase, telephone, magnifier, laptop, padlock, handshake (objects); Dubai and Riyadh skylines; and the seven landmarks on one ground line. The hourglass was traced and dropped (624 raw pieces, unreadable). Photos are from Wikimedia Commons under CC licences, credited on each page.

[Back to top](#top)

## 10. The companion line

Mark page blocks with `data-guide="left"` or `data-guide="right"`. One stroke runs down that side's margin (centre of the gutter, with a slow wobble), loops once as it crosses the 140px spacer to the other side, or curls when it stays on the same side. It draws to 72% of the way down the screen, with a green pen dot at the tip, and is recomputed on resize. On pages with a contents rail, the rail's spine plays the same part, ending in the same green dot.

[Back to top](#top)

## 11. Data and diagrams

- **Charts** (dataviz rules): one measure per chart, side-by-side columns instead of two axes; ink marks, one green highlight; text in text tokens; label the extremes and the highlight only; hover or focus tooltips; every chart has a "Show as a table" twin.
- **Contrast chart** (system page): dot plot of 16 colour pairs, measured live from computed styles, with dashed WCAG thresholds at 3, 4.5 and 7.
- **Tracing chart** (blog): line length in "frames" (1.0 = once round the drawing's own box, so tall and wide drawings compare fairly), strokes kept, pen lifts. Real numbers from `art/art.json`: skylines about 1.0 with no stray joins; the seven-landmark row 3.7 (193 strokes, 25 lifts); the laptop 3.4 (1,697 raw pieces cut to 132 strokes).
- **Diagrams** (diagram-design skill), both passing the skill's `self_check.py`:
  - the tracing pipeline as a 9-node flowchart (`diagrams/pipeline.html`);
  - "A disciplinary case, from first report to outcome" as a swimlane (`diagrams/swimlane.html`): manager, HR / investigator, employee lanes; six steps each in its owner's lane; the hearing as the one focal step and the charge-to-hearing handoff as the one accent edge; masked labels on the handoffs; legend strip. It is a generic pattern, not legal advice for any country.

[Back to top](#top)

## 12. Tables

Hairlines, not boxes: one 2px rule above, a 1px rule under the sticky header, hairlines between rows, panel-grey row hover, no zebra stripes. Text left, numbers right in tabular figures, units in the header. Header cells hold buttons; the column carries `aria-sort` and a live line says the current sort. A search box above filters rows. Under 760px each row folds into a card, labels taken from `data-label`. The system page's example is every traced drawing with its real tracing numbers.

[Back to top](#top)

## 13. Click to copy

Copy chips (dashed edge, copy cursor, solid and mint on hover), a read-only field with a Copy button, and copy buttons on code blocks. Every copy says "Copied to the clipboard.", in one of two ways:

| Option | Where the words appear | Use it for |
|---|---|---|
| **The note** | A toast at the bottom centre; closes after 8 seconds with a countdown bar, Stay keeps it, hover pauses it, X closes it | Chips, small icons, anything with no room beside it |
| **Next to the button** | Right beside the button that was pressed, with an orange tick; stays until the next copy | The one main action on a page, such as copying a letter or a pass code |

To get the second one, put an empty `<span class="ack" role="status"></span>` straight after the button; the script finds it and writes there instead of raising the note. If the browser blocks the clipboard, the text is selected and the same place says "Text selected. Press Ctrl+C or Cmd+C to copy." with an info icon. Swatch token names on the system page are copy chips.

[Back to top](#top)

## 14. Mobile

| Part | Desk, 761px and up | Phone, 760px and under |
|---|---|---|
| Navigation | Links in the masthead | Menu button, full-width list |
| Popover select | Panel under the field | Bottom sheet over a scrim, 52px rows |
| Date picker | Two months, arrows | One month in a bottom sheet |
| Form actions | In the flow | Sticky bar at the bottom |
| Tables | Sticky header, sort buttons | Each row a labelled card |
| Contents rail | Sticky left rail, spine draws | Panel above the article |
| Margin notes | Right margin | Inline |
| Companion line | Centre of each margin | 8px from the edge |
| Toast | Bottom centre | Full width, actions on a second row |
| Ack next to the button | Right of the button | Wraps under the button |
| Back to top arrow | 24px from the bottom right | 16px from the corner; hides while a note shows |
| Touch targets | 40px or more | 44px or more |

Gutter 16px; type never below 15px; inputs at 18px so phones don't zoom; decoration hides before type shrinks. Open panels are lifted to `<body>` while open so no section's stacking context can trap them.

[Back to top](#top)

## 15. Dark

Not an inverted page: every token has a chosen dark value, and `color-scheme` on any container switches it, so the system page shows one card forced light beside the same card forced dark. Page and panels go green-black (#101511 / #1a211c), ink #eeeeee, the green button lightens to #5cbf8f with dark text, the line turns light while blocks deepen, orange steps lighter while the yellow stays as it is, status colours lighten to pass 4.5, photos are never inverted (process plates are), and the theme is set before first paint so nothing flashes.

[Back to top](#top)

## 16. The three contexts

- **Landing** (`heavy-light-landing.html`): split hero with photo and yellow badge, the seven-hub drawing with city labels, three steps with object drawings, a "you'll save" split with stats, city cards that turn into drawings on hover or focus, three prices, Q: / A: tabs, a yellow CTA band, charcoal footer, and the companion line weaving down both margins.
- **Form** (`heavy-light-form.html`): "Get your pass" with a step bar, popover city select, two-month date picker, popover time slots, choice cards, steppers, name, email with live validation, phone with country code, switch, checkbox, textarea with counter, terms; error summary that links to each field; success message; a live summary whose drawing becomes the chosen city's landmark. Phone number takes a popover country code. On phones the action bar sticks to the bottom. Then every field state and the four status messages, a "Plan your layover" pick list, and an image pair (Horizontal / Vertical, LEFT / RIGHT, swap, paste, browse; nothing is uploaded).
- **Blog** (`heavy-light-blog.html`): journal index with filter chips and a lead story, then the article "One line through seven cities" with a sticky contents rail and drawing spine, a top progress bar, a LEFT / RIGHT photo-and-line pair, a drop cap, margin notes, process plates (photo, silhouette, edges, skeleton, line), the pipeline diagram, the tracing chart, a four-question self-check, searchable key terms with Arabic, credits, and "More from the journal".

Back to top: the system page closes every section with a "Back to top" link (option A); the landing page and the journal use the arrow in the bottom right (option B). The form uses neither: its phone action bar owns the bottom edge.

All content is made up for the demo ("Halfway" is not a real product); prices and savings are sample values and say so on the page.

[Back to top](#top)

## 17. Rebuild

Source:

```
src/hl.css  src/hl.js  src/hl-ui.js  src/page-*.html  src/icons/*.svg
tools/trace.py  tools/stages.py  tools/diagrams.py  tools/build.py
art/src/*.jpg + SOURCES.json   art/art.json   art/diagrams.json   art/_stages/
```

Tracing needs `opencv-contrib-python-headless`, `numpy`, `pillow` (a throwaway venv works):

```bash
python tools/trace.py && python tools/stages.py my && python tools/diagrams.py && python tools/build.py
```

The Arabic face (needs `fonttools` and `brotli`), only when the letters it must cover change. Source: `NotoKufiArabic[wght].ttf` from github.com/google/fonts, `ofl/notokufiarabic`:

```bash
pyftsubset src/fonts/NotoKufiArabic-wght.ttf --unicodes='U+0020,U+060C,U+061B,U+061F,U+0621-063A,U+0640-0652,U+0660-066C,U+200C-200D' --layout-features='*' --flavor=woff2 --output-file=src/fonts/hl-kufi.woff2
```

[Back to top](#top)

## 18. Checks done and known limits

**On every pull request (CI):** the pages must match their source; each page in Chromium, Firefox and WebKit, at 375 and 1280, light and dark, must have no script errors, no sideways scroll, no overlapping blocks and no serious or critical axe findings. Each page at 375 and 1280, light and dark (photos masked), must look the same as on `main`, pixel for pixel, unless the owner approves the change with the `looks-ok` label.

**Checked (Chrome):** all four pages at 1280 and 375 wide: no sideways scroll, no overlapping blocks in any section (box-collision script; the only hits are the table rows inside their scroll box and the form's sticky phone bar, both intended), no console errors; light and dark; contrast pairs measured live; both diagrams pass the self-check. Driven by hand: popover select by keyboard, date picker on desk (two months) and phone (one-month sheet), form validation with the new controls, toast Stay and the 8 s close, the ack next to the button (copied, and blocked with the select-and-copy fallback), the back-to-top arrow (hidden at the top, shown after one screen, hidden on phones while a note shows), quiz, search, pick list, table sort.

**Not checked:** a real iPhone. CI runs WebKit, the engine inside Safari, on Linux: it catches what the engine supports and how it lays out pages, not the iPhone's own fonts, touch scrolling or its shrinking address bar. Also not checked: Windows (Segoe UI lacks weights 200 and 800, so those fall back to the nearest weight), screen readers beyond the markup (roles, labels, live regions are in place), the clipboard success path (the test browser blocks the clipboard, so only the select-and-copy fallback ran), and a native reader on the Arabic terms.

**Limits:** pages are 0.3–1.2 MB because photos are inlined; the drawings are traced, not hand-drawn, so a few carry small stray strokes; the city-card drawing appears on hover or focus only, so touch users see the photo.

[Back to top](#top)
