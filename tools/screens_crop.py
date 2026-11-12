"""Shrink the screens-diff download: one before|after picture per changed screenshot.

Reads test-results/screens-<name>/<name>-expected.png and -actual.png (Playwright's output),
crops from 200 px above the first changed row to the bottom, puts before beside after, and
saves screens-crop/<name>.jpg. Pages 1000+ px wide are halved; narrower ones keep full size.
Needs Pillow. Usage: python tools/screens_crop.py [test-results] [screens-crop]
Design-system-builder-Sonnet5.5-agent, 2026-11-13
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops

src = Path(sys.argv[1] if len(sys.argv) > 1 else "test-results")
out = Path(sys.argv[2] if len(sys.argv) > 2 else "screens-crop")
out.mkdir(parents=True, exist_ok=True)

for folder in sorted(src.glob("screens-*")):
    name = folder.name[len("screens-"):]
    exp, act = folder / f"{name}-expected.png", folder / f"{name}-actual.png"
    if not (exp.exists() and act.exists()):
        continue  # a missing picture (a crash, not a look change): nothing to compare
    a, b = Image.open(exp).convert("RGB"), Image.open(act).convert("RGB")
    w, h = max(a.width, b.width), max(a.height, b.height)
    pad = lambda im: (lambda c: (c.paste(im), c)[1])(Image.new("RGB", (w, h), (255, 0, 255)))
    a, b = pad(a), pad(b)
    box = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v else 0).getbbox()
    y0 = max(0, box[1] - 200) if box else 0
    both = Image.new("RGB", (w * 2 + 20, h - y0), (154, 154, 154))
    both.paste(a.crop((0, y0, w, h)), (0, 0))
    both.paste(b.crop((0, y0, w, h)), (w + 20, 0))
    if w >= 1000:
        both = both.resize((both.width // 2, both.height // 2), Image.LANCZOS)
    both.save(out / f"{name}.jpg", "JPEG", quality=70, optimize=True)
    print(f"{name}: {both.width}x{both.height}")
