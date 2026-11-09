"""Build the four self-contained pages of the Heavy Light design system.

Each page = src/page-<name>.html + src/hl.css + src/hl.js, with everything it uses inlined:
  data-art="x"          the traced drawing x from art/art.json (window.ART)
  {{IMG:x}}             art/src/x.jpg as a WebP data URI ({{IMG:x:640}} sets the width)
  {{STAGE:x}}           art/_stages/x.png as a WebP data URI
  {{DIAGRAM:x}}         the inline SVG from art/diagrams.json
  {{CREDITS}}           a credit line for every photo the page shows
  href="#i-name"        the Heroicon src/icons/name.svg as a <symbol>
  data-chart="stats"    the tracing numbers from art/art.json (window.STATS)
  {{FONT:hl-kufi}}      (in hl.css) src/fonts/hl-kufi.woff2 as a data URI, the Arabic face
Output: heavy-light-<name>.html next to this folder's README. No network calls at run time.
Run with a Python that has Pillow:  python tools/build.py
"""
import base64
import io
import json
import re
from html import escape
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
ART = ROOT / "art"
BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACw="

PAGES = {
    "system": ("Heavy Light", "Heavy Light: a reusable design system of thin words next to heavy ones, square panels, one green for action, and single-line drawings that draw themselves as you scroll."),
    "landing": ("Halfway pass", "Landing page template in the Heavy Light design system, for a made-up layover city pass."),
    "form": ("Halfway checkout", "Form template in the Heavy Light design system: a two-step pass form with every field state, plus an image pair."),
    "blog": ("Halfway journal", "Blog template in the Heavy Light design system: a journal index and a long article with a table of contents whose spine draws as you read."),
}

LABELS = {  # drawing name -> (short label, place or object)
    "qa": ("Doha", "Museum of Islamic Art, from the Corniche"),
    "my": ("Kuala Lumpur", "Sultan Abdul Samad Building"),
    "id": ("Jakarta", "National Monument (Monas)"),
    "sg": ("Singapore", "Old Supreme Court dome"),
    "th": ("Bangkok", "Wat Arun prangs"),
    "sa": ("Riyadh", "Kingdom Centre"),
    "ae": ("Dubai", "Burj Al Arab, from Jumeirah Beach"),
    "dubai": ("Dubai skyline", "Sunset silhouette"),
    "riyadh": ("Riyadh skyline", "North skyline"),
    "suitcase": ("Suitcase", "Belber suitcase"),
    "phone": ("Telephone", "1937 rotary telephone"),
    "magnifier": ("Magnifier", "Magnifying glass"),
    "laptop": ("Laptop", "Laptop"),
    "padlock": ("Padlock", "Padlock"),
    "handshake": ("Handshake", "Handshake"),
    "hourglass": ("Hourglass", "Hourglass"),
    "parade": ("All seven hubs", "The landmarks on one ground line"),
    "abudhabi": ("Abu Dhabi skyline", "Corniche skyline"),
}


def webp(path, width, quality=72):
    im = Image.open(path)
    im = im.convert("RGB") if im.mode not in ("RGB", "L") else im
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=quality, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def icon_symbol(name):
    svg = (SRC / "icons" / f"{name}.svg").read_text()
    inner = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1).strip()
    inner = re.sub(r'\s(stroke-linecap|stroke-linejoin)="[^"]*"', "", inner)
    return f'<symbol id="i-{name}" viewBox="0 0 24 24">{inner}</symbol>'


def build(name, title, desc, art, diagrams, sources, css, js):
    page = (SRC / f"page-{name}.html").read_text()
    photos = set()

    seen = set()

    def img(m):  # each photo is stored once; repeat uses copy it at load (hl.js, img[data-dup])
        key = m.group(1)
        photos.add(key)
        if key in seen:
            return f'src="{BLANK}" data-dup="{key}"'
        seen.add(key)
        return f'src="{webp(ART / "src" / f"{key}.jpg", 900, 68)}" data-img="{key}"'
    page = re.sub(r'src="\{\{IMG:([a-z]+)(?::\d+)?\}\}"', img, page)

    def stage(m):
        key = m.group(1)
        if key.endswith("-photo"):
            photos.add(key.split("-")[0])
        return webp(ART / "_stages" / f"{key}.png", 560, 80)
    page = re.sub(r"\{\{STAGE:([a-z]+-[a-z]+)\}\}", stage, page)
    page = re.sub(r"\{\{DIAGRAM:([a-z]+)\}\}", lambda m: diagrams[m.group(1)], page)

    used = set(re.findall(r'data-art="([a-z]+)"', page))
    for group in re.findall(r'data-skylines="([a-z,]+)"', page):  # the skyline horizon reads fills only
        used |= set(group.split(","))
    used = sorted(used)
    missing = [u for u in used if u not in art]
    assert not missing, f"{name}: missing drawings {missing}"
    if "data-chart=\"stats\"" in page:
        photos |= {k for k, v in art.items() if v["kind"] in ("landmark", "object", "skyline") and k != "hourglass"}

    def credits(_):
        items = []
        for k in sorted(photos, key=lambda k: LABELS[k][0]):
            s = sources[k]
            items.append(f'<li><b>{escape(LABELS[k][0])}</b>, {escape(LABELS[k][1])}: photo by {escape(s["artist"])}, '
                         f'<a href="{escape(s["page"])}" rel="noopener">{escape(s["license"])}, Wikimedia Commons</a>. '
                         f'Traced and recoloured.</li>')
        return "\n".join(items)
    photos |= {u for u in used if u in sources}  # a traced drawing is a derivative: credit its photo
    if "parade" in used:
        photos |= {"qa", "my", "id", "sg", "th", "sa", "ae"}
    if "{{DRAWINGS_TABLE}}" in page:
        rows = []
        for k, v in sorted(art.items(), key=lambda kv: -kv[1]["len"] / (2 * (kv[1]["w"] + kv[1]["h"]))):
            if k == "hourglass":
                continue
            fr = v["len"] / (2 * (v["w"] + v["h"]))
            rows.append(f'<tr><td data-label="Drawing">{escape(LABELS[k][0])}</td><td data-label="Kind"><span class="tag line">{v["kind"]}</span></td>'
                        f'<td class="n" data-label="Raw pieces">{v["raw"]}</td><td class="n" data-label="Strokes kept">{v["strokes"]}</td>'
                        f'<td class="n" data-label="Pen lifts">{v["lifts"]}</td><td class="n" data-label="Frames" data-v="{fr:.3f}">{fr:.2f}</td></tr>')
        page = page.replace("{{DRAWINGS_TABLE}}", "".join(rows))
    page = page.replace("{{CREDITS}}", credits(None))
    css_root = re.search(r"^:root \{.*?^\}", css, re.S | re.M).group(0)
    page = page.replace("{{TOKENS}}", escape(css_root))
    assert "{{" not in page, f"{name}: unfilled placeholder {re.search(r'{{[^}]*}}', page).group(0)}"

    # icons in the page, plus the ones the scripts draw (toast, quiz, popovers)
    icons = sorted(set(re.findall(r'href="#i-([a-z0-9-]+)"', page)) | set(re.findall(r"icon\('([a-z0-9-]+)'\)", js)))
    sprite = ('<!-- Icons: Heroicons 2.2.0 outline (MIT, Tailwind Labs), https://heroicons.com -->\n'
              '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
              + "".join(icon_symbol(i) for i in icons) + "</svg>")

    data = {k: {"w": art[k]["w"], "h": art[k]["h"], "d": art[k]["d"], "fills": art[k]["fills"]}
            | ({"labels": art[k]["labels"]} if "labels" in art[k] else {}) for k in used}
    js_data = "window.ART=" + json.dumps(data, separators=(",", ":")) + ";"
    if "data-chart=\"stats\"" in page:
        # line length in frames: 1.0 = once round the drawing's own box, so tall and wide drawings compare fairly
        stats = [{"name": k, "label": LABELS[k][0], "kind": v["kind"], "len": v["len"], "strokes": v["strokes"],
                  "frames": round(v["len"] / (2 * (v["w"] + v["h"])), 2), "raw": v["raw"],
                  "lifts": v["lifts"], "hl": k == "parade"} for k, v in art.items() if k != "hourglass"]
        js_data += "window.STATS=" + json.dumps(stats, separators=(",", ":")) + ";"

    head = (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"<title>{escape(title)}</title>\n<meta name=\"description\" content=\"{escape(desc)}\">\n"
        "<script>try{const t=localStorage.getItem('hl:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>\n"
        f"<style>\n{css}\n</style>\n</head>\n"
    )
    out = head + "<body>\n" + sprite + "\n" + page + f"\n<script>\n{js_data}\n</script>\n<script>\n{js}\n</script>\n</body>\n</html>\n"
    path = ROOT / f"heavy-light-{name}.html"
    path.write_text(out)
    print(f"{path.name:28s} {len(out) / 1024:6.0f}KB  drawings={','.join(used)}  photos={len(photos)}  icons={len(icons)}")


def main():
    art = json.loads((ART / "art.json").read_text())
    diagrams = json.loads((ART / "diagrams.json").read_text())
    sources = json.loads((ART / "src" / "SOURCES.json").read_text())
    css = (SRC / "hl.css").read_text()
    css = css.replace("{{FONT:hl-kufi}}", "data:font/woff2;base64," + base64.b64encode((SRC / "fonts" / "hl-kufi.woff2").read_bytes()).decode())
    js = (SRC / "hl.js").read_text() + "\n" + (SRC / "hl-ui.js").read_text()
    for name, (title, desc) in PAGES.items():
        if (SRC / f"page-{name}.html").exists():
            build(name, title, desc, art, diagrams, sources, css, js)


if __name__ == "__main__":
    main()
