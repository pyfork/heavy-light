# Heavy Light

A design system of thin words next to heavy ones: square grey panels, one green for action, orange ticks, mint labels, a yellow sticker for good news, and pictures made of one continuous line, traced from photographs, that draw themselves as you scroll.

Full spec: [docs-public/heavy-light-design-system.md](docs-public/heavy-light-design-system.md).

| Open | What |
|---|---|
| [heavy-light-system.html](heavy-light-system.html) | The reference page: tokens, type, components, line art, data, tables, mobile, dark |
| [heavy-light-landing.html](heavy-light-landing.html) | Landing template |
| [heavy-light-form.html](heavy-light-form.html) | Form template |
| [heavy-light-blog.html](heavy-light-blog.html) | Blog with index and contents |

Each page is one self-contained file: system fonts for Latin, a built-in Arabic face, inlined Heroicons, photos as data, no network calls. Download and open it.

| Path | Contents |
|---|---|
| `src/hl.css`, `src/hl.js` | Tokens, components, line drawing, companion line, contents rail, charts, form logic |
| `src/hl-ui.js` | Toast, click to copy, popover select, two-month date picker, search, quiz, pick list, sortable table, Arabic font pick, skyline horizon |
| `src/page-*.html` | Page markup with build placeholders |
| `src/icons/` | The Heroicons 2.2.0 outline icons used (MIT, licence included) |
| `src/fonts/` | Noto Kufi Arabic (OFL, licence included) and the 24 KB subset the build inlines |
| `art/src/` | Source photos (Wikimedia Commons) with credits in `SOURCES.json` |
| `art/art.json`, `art/diagrams.json`, `art/_stages/` | Traced drawings, diagrams and process plates, ready for the build |
| `tools/` | `trace.py` (OpenCV tracing), `stages.py` (process plates), `diagrams.py`, `build.py` (writes the four pages) |
| `diagrams/` | The pipeline and swimlane diagrams as standalone pages |

## Checks

Every pull request runs `.github/workflows/checks.yml` and `.github/workflows/screens.yml`:

- **Rebuild check:** `python tools/check_build.py` rebuilds the pages and fails if the committed ones are out of date.
- **Page check:** `npx playwright test` opens each page in Chromium, Firefox and WebKit (Safari's engine), at 375 and 1280 wide, light and dark, and fails on a script error, sideways scroll, overlapping blocks, or a serious accessibility problem (axe).
- **Screens:** photographs `main`'s pages and the PR's pages in the same run (4 pages × 375 and 1280 × light and dark) and compares them pixel for pixel. Same look: green. Changed look: red, with before, after and difference in the run's `screens-diff` download, until the owner adds the `looks-ok` label. A new push clears the label. No pictures are stored: `main` is the approved look. Photos are masked, the clock is fixed and motion reduced.

To run the page check locally:

```bash
npm install --no-save --no-package-lock @playwright/test@1.63.0 @axe-core/playwright@4.14.0
npx playwright install chromium firefox webkit
npx playwright test
```

When a PR changes the look on purpose, the owner checks `screens-diff` and adds the `looks-ok` label. The check runs again and passes. A label added by anyone else doesn't count.

## Who reviews what

The owner reviews risky files only; every other PR merges on three green checks. See [README-brief-repo-rules.md](README-brief-repo-rules.md) for the rule, why, and what it costs.

## Rebuild

After editing `src/`, only Pillow is needed:

```bash
python tools/build.py
```

To retrace the drawings from the photos (needs `opencv-contrib-python-headless`, `numpy`, `pillow`):

```bash
python tools/trace.py && python tools/stages.py my && python tools/diagrams.py && python tools/build.py
```

The Arabic subset (needs `fonttools`, `brotli`), only when the letters it must cover change:

```bash
pyftsubset src/fonts/NotoKufiArabic-wght.ttf --unicodes='U+0020,U+060C,U+061B,U+061F,U+0621-063A,U+0640-0652,U+0660-066C,U+200C-200D' --layout-features='*' --flavor=woff2 --output-file=src/fonts/hl-kufi.woff2
```
