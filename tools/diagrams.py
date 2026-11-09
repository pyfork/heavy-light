"""Editorial diagrams (diagram-design skill rules) as inline SVG skinned by the page's CSS tokens.

Rules kept: orthogonal connectors with r=8 elbows, arrows drawn before boxes, every arrow
label on an opaque mask 6-10px off its stroke, distinct attach points, geometry on a 4px
grid, accent on at most two elements, <title>/<desc> first with prefixed ids, legend as a
bottom strip, min-width = viewBox width inside a local overflow-x wrapper.
Output: art/diagrams.json  {slug: svg string}
"""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "art" / "diagrams.json"


class D:
    def __init__(self, slug, w, h, title, desc):
        self.slug, self.w, self.h = slug, w, h
        self.title, self.desc = title, desc
        self.bg, self.arrows, self.labels, self.nodes = [], [], [], []

    # connectors -------------------------------------------------------
    def path(self, pts, focal=False, dash=False, r=8, head=True):
        """Orthogonal polyline with rounded elbows, ending in an arrowhead at pts[-1]."""
        d = f"M{pts[0][0]},{pts[0][1]}"
        for i in range(1, len(pts) - 1):
            (x0, y0), (x1, y1), (x2, y2) = pts[i - 1], pts[i], pts[i + 1]
            assert x0 == x1 or y0 == y1, "diagonal segment"
            dx0, dy0 = _sgn(x1 - x0), _sgn(y1 - y0)
            dx1, dy1 = _sgn(x2 - x1), _sgn(y2 - y1)
            d += f" L{x1 - dx0 * r},{y1 - dy0 * r} Q{x1},{y1} {x1 + dx1 * r},{y1 + dy1 * r}"
        (xa, ya), (xb, yb) = pts[-2], pts[-1]
        assert xa == xb or ya == yb, "diagonal segment"
        ux, uy = _sgn(xb - xa), _sgn(yb - ya)
        tip = (xb, yb)
        base = (xb - ux * 8, yb - uy * 8) if head else tip
        d += f" L{base[0]},{base[1]}"
        cls = "d-arrow" + (" focal" if focal else "") + (" dash" if dash else "")
        self.arrows.append(f'<path class="{cls}" d="{d}"/>')
        if not head:
            return
        # arrowhead as its own polygon so it takes the page colour in both themes
        px, py = -uy, ux
        a = (base[0] + px * 4, base[1] + py * 4)
        b = (base[0] - px * 4, base[1] - py * 4)
        hc = "d-head" + (" focal" if focal else "")
        self.arrows.append(f'<polygon class="{hc}" points="{tip[0]},{tip[1]} {a[0]},{a[1]} {b[0]},{b[1]}"/>')

    def label(self, x, y, text, anchor="middle"):
        """Masked label; (x, y) is the text baseline. Caller keeps it 6-10px off the stroke."""
        w = len(text) * 9 * 0.62 + 8
        x0 = x - w / 2 if anchor == "middle" else (x - 4 if anchor == "start" else x - w + 4)
        self.labels.append(f'<rect class="d-lbl-mask" x="{x0:.0f}" y="{y - 9}" width="{w:.0f}" height="12" rx="2"/>'
                           f'<text class="d-lbl" x="{x}" y="{y}" text-anchor="{anchor}">{escape(text)}</text>')

    # nodes --------------------------------------------------------------
    def box(self, x, y, w, h, name, sub=None, kind="", tag=None):
        cx = x + w / 2
        lines = name.split("|")
        out = [f'<rect class="d-mask" x="{x}" y="{y}" width="{w}" height="{h}" rx="6"/>',
               f'<rect class="d-box {kind}" x="{x}" y="{y}" width="{w}" height="{h}" rx="6"/>']
        inv = " inv" if "end" in kind else ""
        top = y + h / 2 - (len(lines) - 1) * 8 + (4 if not sub else -2)
        for i, ln in enumerate(lines):
            out.append(f'<text class="d-name{inv}" x="{cx}" y="{top + i * 16}" text-anchor="middle">{escape(ln)}</text>')
        if sub:
            out.append(f'<text class="d-sub{inv}" x="{cx}" y="{top + (len(lines) - 1) * 16 + 16}" text-anchor="middle">{escape(sub)}</text>')
        if tag:
            tw = len(tag) * 8 * 0.62 + 8
            out.append(f'<rect class="d-tag" x="{x + 8}" y="{y + 6}" width="{tw:.0f}" height="12" rx="2"/>'
                       f'<text class="d-tagt" x="{x + 8 + tw / 2:.0f}" y="{y + 15}" text-anchor="middle">{escape(tag)}</text>')
        self.nodes.append("".join(out))

    def oval(self, x, y, w, h, name):
        cx = x + w / 2
        lines = name.split("|")
        top = y + h / 2 - (len(lines) - 1) * 8 + 4
        out = [f'<rect class="d-mask" x="{x}" y="{y}" width="{w}" height="{h}" rx="{h / 2}"/>',
               f'<rect class="d-box" x="{x}" y="{y}" width="{w}" height="{h}" rx="{h / 2}"/>']
        out += [f'<text class="d-name" x="{cx}" y="{top + i * 16}" text-anchor="middle">{escape(l)}</text>'
                for i, l in enumerate(lines)]
        self.nodes.append("".join(out))

    def diamond(self, cx, cy, w, h, text, kind=""):
        pts = f"{cx},{cy - h / 2} {cx + w / 2},{cy} {cx},{cy + h / 2} {cx - w / 2},{cy}"
        lines = text.split("|")
        top = cy - (len(lines) - 1) * 8 + 4
        out = [f'<polygon class="d-mask" points="{pts}"/>', f'<polygon class="d-box {kind}" points="{pts}"/>']
        out += [f'<text class="d-name" x="{cx}" y="{top + i * 16}" text-anchor="middle">{escape(l)}</text>'
                for i, l in enumerate(lines)]
        self.nodes.append("".join(out))

    def dot(self, x, y):
        self.nodes.append(f'<circle class="d-dot" cx="{x}" cy="{y}" r="4"/>')

    def svg(self):
        s = self.slug
        return (f'<svg class="dg" viewBox="0 0 {self.w} {self.h}" role="img" aria-labelledby="{s}-title {s}-desc" '
                f'style="--dg-w:{self.w}px" xmlns="http://www.w3.org/2000/svg">'
                f'<title id="{s}-title">{escape(self.title)}</title><desc id="{s}-desc">{escape(self.desc)}</desc>'
                + "".join(self.bg) + "".join(self.arrows) + "".join(self.labels) + "".join(self.nodes) + "</svg>")


def _sgn(v):
    return (v > 0) - (v < 0)


def _sgn(v):
    return (v > 0) - (v < 0)


def pipeline():
    """Flowchart, left to right: photo -> what is in it? -> three tracers -> merge -> skeleton
    -> strokes -> one pen path (focal) -> SVG. 9 nodes, 1 accent node + its two arrows."""
    d = D("dg-pipe", 988, 336, "How a photograph becomes one line",
          "Flowchart: a photo is sorted into landmark, object or skyline; each kind has its own way to "
          "separate the subject, then all three are thinned to a one-pixel skeleton, walked into strokes, "
          "chained into one pen path and written out as an SVG path that draws on scroll.")
    cy = 152
    # connectors first, so boxes sit on top
    d.path([(88, cy), (120, cy)])                                    # photo -> decision
    d.path([(176, 104), (176, 68), (284, 68)])                       # landmark branch
    d.label(230, 58, "LANDMARK")
    d.path([(232, cy), (284, cy)])                                   # object branch
    d.label(256, 140, "OBJECT")
    d.path([(176, 200), (176, 236), (284, 236)])                     # skyline branch
    d.label(230, 226, "SKYLINE")
    d.path([(428, 68), (472, 68), (472, cy - 4)], head=False)        # merge
    d.path([(428, cy), (468, cy)], head=False)
    d.path([(428, 236), (472, 236), (472, cy + 4)], head=False)
    d.path([(476, cy), (504, cy)])
    d.path([(608, cy), (636, cy)])
    d.path([(740, cy), (768, cy)], focal=True)
    d.path([(888, cy), (916, cy)], focal=True)
    # nodes
    d.oval(8, cy - 24, 80, 48, "Photo")
    d.diamond(176, cy, 112, 96, "What is|in it?")
    d.box(284, 40, 144, 56, "Cut out from sky", "cv2.grabCut · box")
    d.box(284, 124, 144, 56, "Cut from backdrop", "Otsu + grabCut")
    d.box(284, 208, 144, 56, "Dark under bright", "Otsu · top edge")
    d.dot(472, cy)
    d.box(504, 124, 104, 56, "Skeleton", "Zhang–Suen")
    d.box(636, 124, 104, 56, "Strokes", "graph walk")
    d.box(768, 124, 120, 56, "One pen path", "nearest + 2-opt", kind="focal")
    d.oval(916, cy - 24, 64, 48, "SVG")
    # legend strip
    ly = 300
    d.bg.append(f'<line class="d-rule" x1="8" y1="{ly - 20}" x2="980" y2="{ly - 20}"/>')
    items = [("oval", "START / END"), ("diamond", "DECISION"), ("box", "STEP"), ("dot", "MERGE"),
             ("focal", "THE IDEA THAT MAKES IT ONE LINE")]
    x = 8
    for kind, text in items:
        if kind == "oval":
            d.bg.append(f'<rect class="d-box" x="{x}" y="{ly - 8}" width="24" height="14" rx="7"/>')
        elif kind == "diamond":
            d.bg.append(f'<polygon class="d-box" points="{x + 12},{ly - 9} {x + 24},{ly - 1} {x + 12},{ly + 7} {x},{ly - 1}"/>')
        elif kind == "box":
            d.bg.append(f'<rect class="d-box" x="{x}" y="{ly - 8}" width="24" height="14" rx="3"/>')
        elif kind == "dot":
            d.bg.append(f'<circle class="d-dot" cx="{x + 12}" cy="{ly - 1}" r="4"/>')
        else:
            d.bg.append(f'<rect class="d-box focal" x="{x}" y="{ly - 8}" width="24" height="14" rx="3"/>')
        d.bg.append(f'<text class="d-legend" x="{x + 32}" y="{ly + 3}">{text}</text>')
        x += 32 + len(text) * 7 + 28
    return d.svg()


def swimlane():
    """Swimlane: three lanes (manager, HR, employee), six steps,
    handoffs cross lanes. Focal: the hearing (node) and the charge-to-hearing handoff (edge): 2 accents."""
    d = D("dg-lane", 1016, 360, "A disciplinary case, from first report to outcome",
          "Swimlane across manager, HR and employee: the manager records the facts, HR opens the file and puts "
          "the charge in writing, the employee answers at a hearing, HR decides, and the employee gets the "
          "outcome in writing with a right of appeal.")
    lanes = [("MANAGER", 0), ("HR / INVESTIGATOR", 100), ("EMPLOYEE", 200)]
    for i, (name, y) in enumerate(lanes):
        if i % 2:
            d.bg.append(f'<rect class="d-lane-fill" x="0" y="{y}" width="1016" height="100"/>')
        d.bg.append(f'<line class="d-rule" x1="0" y1="{y + 100}" x2="1016" y2="{y + 100}"/>')
        d.bg.append(f'<text class="d-lane-label" x="12" y="{y + 22}">{name}</text>')
    w, h = 116, 56
    xs = [132, 284, 436, 588, 740, 892]
    ys = [22, 122, 122, 222, 122, 222]
    cx = [x + w // 2 for x in xs]
    # connectors before boxes
    d.path([(xs[0] + w, 50), (cx[1], 50), (cx[1], 122)])
    d.label(295, 40, "START PROMPTLY")
    d.path([(xs[1] + w, 150), (xs[2], 150)])
    d.path([(xs[2] + w, 150), (cx[3], 150), (cx[3], 222)], focal=True)
    d.label(599, 140, "NOTICE GIVEN")
    d.path([(xs[3] + w, 250), (cx[4], 250), (cx[4], 178)])
    d.path([(xs[4] + w, 150), (cx[5], 150), (cx[5], 222)])
    d.label(903, 140, "REASONS")
    steps = [("Record the facts", "who · what · when"), ("Open the file", "one main allegation"),
             ("Charge in writing", "facts + evidence"), ("Hear the reply", "with a companion"),
             ("Decide", "reasoned outcome"), ("Outcome, appeal", "in writing")]
    for i, (name, sub) in enumerate(steps):
        d.box(xs[i], ys[i], w, h, name, sub, kind="focal" if i == 3 else "")
    # legend strip
    ly = 328
    d.bg.append(f'<line class="d-rule" x1="8" y1="{ly - 20}" x2="1008" y2="{ly - 20}"/>')
    x = 8
    for kind, text in [("box", "STEP, IN ITS OWNER'S LANE"), ("focal", "THE HEARING"), ("arrow", "HANDOFF"), ("hot", "THE HANDOFF THAT STARTS THE CLOCK")]:
        if kind == "box":
            d.bg.append(f'<rect class="d-box" x="{x}" y="{ly - 8}" width="24" height="14" rx="3"/>')
            tx = x + 32
        elif kind == "focal":
            d.bg.append(f'<rect class="d-box focal" x="{x}" y="{ly - 8}" width="24" height="14" rx="3"/>')
            tx = x + 32
        else:
            cls = "d-arrow focal" if kind == "hot" else "d-arrow"
            d.bg.append(f'<line class="{cls}" x1="{x}" y1="{ly - 1}" x2="{x + 28}" y2="{ly - 1}"/>')
            tx = x + 36
        d.bg.append(f'<text class="d-legend" x="{tx}" y="{ly + 3}">{text}</text>')
        x = tx + len(text) * 7 + 28
    return d.svg()


def main():
    OUT.write_text(json.dumps({"pipeline": pipeline(), "swimlane": swimlane()}))
    print("diagrams.json", OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
