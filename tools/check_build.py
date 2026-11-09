"""Rebuild the four pages and fail if they differ from the committed ones.

Photos are left out of the comparison: WebP bytes can differ between machines
even with the same Pillow, and the photos only change when art/ changes.
Usage: python tools/check_build.py   (exit 0 = the committed pages are current)
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHOTO = re.compile(r"data:image/webp;base64,[A-Za-z0-9+/=]+")


def pages():
    return {p.name: PHOTO.sub("data:image/webp;base64,…", p.read_text()) for p in ROOT.glob("heavy-light-*.html")}


before = pages()
subprocess.run([sys.executable, str(ROOT / "tools" / "build.py")], check=True)
after = pages()
stale = sorted(n for n in before.keys() | after.keys() if before.get(n) != after.get(n))
for n in stale:
    old, new = (before.get(n) or "").splitlines(), (after.get(n) or "").splitlines()
    line = next((i for i, (a, b) in enumerate(zip(old, new)) if a != b), min(len(old), len(new)))
    print(f"STALE {n}: first difference at line {line + 1}")
if stale:
    print("Run python tools/build.py and commit the pages.")
    sys.exit(1)
print(f"ok: {len(after)} pages match their source")
