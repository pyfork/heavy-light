"""Trace source photos into single-line SVG drawings for the Heavy Light design system.

Three kinds of source, all in art/src/<name>.jpg (credits in art/src/SOURCES.json):
  landmarks  a building against the sky (seven-hearings tuning). GrabCut separates it from the
             sky, its outline is kept, and Canny / tone / fast-line edges inside add the detail.
  objects    a thing on a plain backdrop. Backdrop colour from the border,
             Otsu + GrabCut silhouette, outer contour plus the longer interior Canny edges.
  skylines   a dark city silhouette against a bright sky. Otsu on brightness, keep the top edge.

Every drawing then goes the same way:
  1. skeleton   Zhang-Suen thinning (cv2.ximgproc) to one-pixel centre lines
  2. strokes    walk the skeleton graph between endpoints and junctions
  3. one line   chain strokes nearest-end first (either direction), then 2-opt on the joins
                so the connecting moves stay short; lift the pen only for long jumps
  4. ink        Douglas-Peucker, Chaikin corner cutting, rounded corners as quadratic curves
Output: art/art.json {name: {w, h, d, fills, len, lifts, strokes, jump, edge, skel}}.
Debug:  art/_trace/<name>.png renders each result for checking by eye.
Run with the scratch venv that has opencv-contrib-python-headless, numpy:  python tools/trace.py [names]
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "src"
OUT = ROOT / "art" / "art.json"
DBG = ROOT / "art" / "_trace"
OUT_W = 1000  # every drawing is normalised to this viewBox width

# name: crop     (x0, y0, x1, y1) fractions of the photo
#       rect     GrabCut box inside the crop (x, y, w, h fractions); outside it is background
#       bg       boxes inside the crop forced to background (a tower behind, a palm in front)
#       ground   fraction of the crop height where the landmark meets a straight ground line
#       lines    "canny" (lo, hi, min_len) for plain forms, or "fld" (min_len, keep) for facades:
#                the fast line detector keeps only the `keep` longest straight segments
#       clahe    boost contrast for hazy photos
PHOTOS = {
    "my": dict(crop=(0.12, 0.11, 0.98, 0.95), rect=(0.02, 0.02, 0.96, 0.98), ground=0.97,
               bg=[(0.0, 0.42, 0.33, 0.7), (0.86, 0.55, 1.0, 0.86)], lines=("tone", 22, 420, 18)),
    "sg": dict(crop=(0.03, 0.2, 0.97, 0.86), rect=(0.02, 0.02, 0.96, 0.98), ground=0.985,
               bg=[(0.0, 0.0, 0.16, 0.42), (0.84, 0.0, 1.0, 0.42)], lines=("tone", 20, 150, 26)),
    "th": dict(crop=(0.16, 0.0, 0.99, 0.64), rect=(0.02, 0.02, 0.96, 0.98), ground=0.98, sky=True,
               lines=("fld", 36, 40)),
    "id": dict(crop=(0.3, 0.27, 0.56, 0.69), rect=(0.06, 0.02, 0.88, 0.98), ground=0.985,
               lines=("canny", 30, 90, 24)),
    "qa": dict(crop=(0.26, 0.5, 0.58, 0.745), rect=(0.04, 0.06, 0.92, 0.92), ground=0.97,
               lines=("canny", 30, 80, 20)),
    "sa": dict(crop=(0.24, 0.07, 0.8, 0.66), rect=(0.04, 0.02, 0.92, 0.98), ground=0.985,
               lines=("canny", 30, 90, 40)),
    "ae": dict(crop=(0.5, 0.27, 0.76, 0.585), rect=(0.06, 0.04, 0.88, 0.94), ground=0.97, clahe=True,
               sky=True, soft=6, lines=("canny", 14, 40, 24)),
}
WORK = 1100  # photos are resampled so their long side is this many pixels


# ---------- 1. line rasters ----------

def photo_raster(name, crop, rect, lines, ground, bg=(), clahe=False, sky=False, soft=2.2):
    img = cv2.imread(str(SRC / f"{name}.jpg"))
    h, w = img.shape[:2]
    x0, y0, x1, y1 = crop
    img = img[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    h, w = img.shape[:2]
    k = WORK / max(h, w)
    img = cv2.resize(img, (round(w * k), round(h * k)), interpolation=cv2.INTER_CUBIC if k > 1 else cv2.INTER_AREA)
    h, w = img.shape[:2]
    if clahe:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        lab[..., 0] = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(lab[..., 0])
        img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # GrabCut seeded from a box: outside the box and inside any bg box is background for sure
    rx, ry, rw, rh = rect
    gc = np.full((h, w), cv2.GC_BGD, np.uint8)
    gc[int(ry * h):int((ry + rh) * h), int(rx * w):int((rx + rw) * w)] = cv2.GC_PR_FGD
    for bx0, by0, bx1, by1 in bg:
        gc[int(by0 * h):int(by1 * h), int(bx0 * w):int(bx1 * w)] = cv2.GC_BGD
    gc[:max(3, int(0.01 * h))] = cv2.GC_BGD  # the top rows are always sky
    if sky:  # pixels close to the sky's colour start as probable background
        lab = cv2.cvtColor(cv2.GaussianBlur(img, (5, 5), 0), cv2.COLOR_BGR2LAB).astype(np.float32)
        ref = np.median(lab[:max(6, int(0.03 * h))].reshape(-1, 3), axis=0)
        dist = np.linalg.norm(lab - ref, axis=2)
        dist = np.clip(dist / dist.max() * 255, 0, 255).astype(np.uint8)
        t, _ = cv2.threshold(dist, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        gc[(gc == cv2.GC_PR_FGD) & (dist < t)] = cv2.GC_PR_BGD
    bgm, fgm = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, gc, None, bgm, fgm, 8, cv2.GC_INIT_WITH_MASK)
    mask = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    gy = int(ground * h)
    mask[gy:] = 0
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
    if n > 1:  # keep the landmark, drop stray islands
        big = stats[1:, cv2.CC_STAT_AREA].max()
        mask = np.isin(lab, [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > 0.12 * big]).astype(np.uint8) * 255
    # fill holes (a clock face, a window of sky), then soften pixel stairs on the outline
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    mask = cv2.drawContours(np.zeros_like(mask), cs, -1, 255, -1)
    mask = (cv2.GaussianBlur(mask, (0, 0), soft) > 127).astype(np.uint8) * 255
    mask[gy:] = 0

    ink = np.zeros_like(mask)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    contours = [cv2.approxPolyDP(c, 1.2, True) for c in contours]
    cv2.drawContours(ink, contours, -1, 255, 3)
    xs = np.where(mask.any(axis=0))[0]
    pad = int(0.04 * w)
    cv2.line(ink, (max(2, xs.min() - pad), gy - 1), (min(w - 3, xs.max() + pad), gy - 1), 255, 3)  # ground

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    inner = cv2.erode(mask, np.ones((11, 11), np.uint8))
    if lines[0] == "canny":
        _, lo, hi, min_len = lines
        edges = cv2.Canny(cv2.bilateralFilter(gray, 9, 50, 9), lo, hi)
        edges[inner == 0] = 0
        edges = cv2.dilate(edges, np.ones((3, 3), np.uint8))
        n, lab, stats, _ = cv2.connectedComponentsWithStats(edges)
        for i in range(1, n):
            if max(stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]) >= min_len:
                ink[lab == i] = 255
    elif lines[0] == "tone":  # outlines of the darkest shapes: arch openings, windows, shadow bands
        _, pct, min_area, keep = lines
        sm = cv2.bilateralFilter(gray, 11, 60, 11)
        sm = cv2.bilateralFilter(sm, 11, 60, 11)
        t = np.percentile(sm[inner > 0], pct)
        dark = ((sm < t) & (inner > 0)).astype(np.uint8) * 255
        dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        cs, _ = cv2.findContours(dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cs = sorted([c for c in cs if cv2.contourArea(c) >= min_area], key=cv2.contourArea, reverse=True)[:keep]
        cv2.drawContours(ink, [cv2.approxPolyDP(c, 1.5, True) for c in cs], -1, 255, 3)
    else:  # straight architectural segments, longest first
        _, min_len, keep = lines
        fld = cv2.ximgproc.createFastLineDetector(length_threshold=min_len, distance_threshold=1.5,
                                                   canny_th1=40, canny_th2=110, canny_aperture_size=3,
                                                   do_merge=True)
        segs = fld.detect(cv2.GaussianBlur(gray, (3, 3), 0))
        segs = [] if segs is None else segs.reshape(-1, 4)
        inside = lambda x, y: inner[min(h - 1, max(0, int(y))), min(w - 1, max(0, int(x)))] > 0
        segs = [s for s in segs if inside(s[0], s[1]) and inside(s[2], s[3]) and inside((s[0] + s[2]) / 2, (s[1] + s[3]) / 2)]
        segs.sort(key=lambda s: -np.hypot(s[2] - s[0], s[3] - s[1]))
        for x0, y0, x1, y1 in segs[:keep]:
            cv2.line(ink, (int(x0), int(y0)), (int(x1), int(y1)), 255, 3)
    return ink, (mask > 0).astype(np.uint8)  # silhouette becomes colour block 1


OBJECTS = {
    # name: (canny low, canny high, min edge length px, options)
    #   dark    the object is near-black on a light backdrop: plain Otsu on brightness beats GrabCut
    #   circle  add the strongest Hough circle (a clear lens the backdrop shows through)
    "suitcase": (25, 70, 40, {}),
    "phone": (40, 110, 50, {"dark": True}),
    "magnifier": (30, 80, 60, {"circle": True}),
    "laptop": (60, 160, 90, {}),
    "padlock": (18, 50, 30, {}),
    "hourglass": (60, 150, 80, {}),
    "handshake": (14, 40, 30, {}),
}
OBJ_WORK = 900


def object_raster(name, lo, hi, min_len, opt):
    img = cv2.imread(str(SRC / f"{name}.jpg"))
    h, w = img.shape[:2]
    k = OBJ_WORK / max(h, w)
    img = cv2.resize(img, (round(w * k), round(h * k)), interpolation=cv2.INTER_AREA)
    h, w = img.shape[:2]
    # backdrop colour = median of a border strip; the object is what differs from it
    border = np.concatenate([img[:8].reshape(-1, 3), img[-8:].reshape(-1, 3),
                             img[:, :8].reshape(-1, 3), img[:, -8:].reshape(-1, 3)])
    diff = np.abs(img.astype(np.int16) - np.median(border, axis=0)).max(axis=2).astype(np.uint8)
    diff = cv2.GaussianBlur(diff, (5, 5), 0)
    _, mask = cv2.threshold(diff, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8), iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    # drop soft cast shadows: darker than the backdrop but barely saturated
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    shadow = (hsv[..., 1] < 40) & (diff < 70)
    mask[shadow & (cv2.erode(mask, np.ones((25, 25), np.uint8)) == 0)] = 0
    # refine with GrabCut seeded from the threshold; the border is always backdrop
    gc = np.where(mask > 0, cv2.GC_PR_FGD, cv2.GC_PR_BGD).astype(np.uint8)
    gc[cv2.erode(mask, np.ones((31, 31), np.uint8)) > 0] = cv2.GC_FGD
    gc[:4], gc[-4:], gc[:, :4], gc[:, -4:] = cv2.GC_BGD, cv2.GC_BGD, cv2.GC_BGD, cv2.GC_BGD
    bgm, fgm = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, gc, None, bgm, fgm, 6, cv2.GC_INIT_WITH_MASK)
    mask = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    gray0 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if opt.get("dark"):
        _, mask = cv2.threshold(cv2.GaussianBlur(gray0, (5, 5), 0), 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    if opt.get("circle"):
        c = cv2.HoughCircles(cv2.medianBlur(gray0, 5), cv2.HOUGH_GRADIENT, dp=1.2, minDist=w,
                             param1=90, param2=40, minRadius=int(0.12 * w), maxRadius=int(0.5 * w))
        if c is not None:
            cx, cy, r = np.round(c[0, 0]).astype(int)
            cv2.circle(mask, (cx, cy), r, 255, -1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
    if n > 1:  # keep the object and any big parts of it (a lens and its handle), drop specks
        big = stats[1:, cv2.CC_STAT_AREA].max()
        mask = np.isin(lab, [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > 0.08 * big]).astype(np.uint8) * 255
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    mask = cv2.drawContours(np.zeros_like(mask), cs, -1, 255, -1)
    mask = (cv2.GaussianBlur(mask, (0, 0), 2.2) > 127).astype(np.uint8) * 255

    ink = np.zeros_like(mask)
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(ink, [cv2.approxPolyDP(c, 1.2, True) for c in cs], -1, 255, 3)
    gray = cv2.bilateralFilter(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), 9, 40, 9)
    edges = cv2.Canny(gray, lo, hi)
    edges[cv2.erode(mask, np.ones((9, 9), np.uint8)) == 0] = 0
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(edges)
    for i in range(1, n):
        if max(stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]) >= min_len:
            ink[lab == i] = 255
    return ink, (mask > 0).astype(np.uint8)


SKYLINES = {
    # name: crop (x0, y0, x1, y1) fractions; the city must be darker than the sky above it
    "dubai": (0.0, 0.28, 1.0, 0.74),
    "riyadh": (0.0, 0.25, 1.0, 0.82),
    "abudhabi": (0.0, 0.14, 1.0, 0.46),
}


def skyline_raster(name, crop):
    img = cv2.imread(str(SRC / f"{name}.jpg"))
    h, w = img.shape[:2]
    x0, y0, x1, y1 = crop
    img = img[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    img = cv2.resize(img, None, fx=1.6, fy=1.6, interpolation=cv2.INTER_CUBIC)
    h, w = img.shape[:2]
    v = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[..., 2], (5, 5), 0)
    _, dark = cv2.threshold(v, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # the city is everything at or below the first dark pixel of each column, so cranes and spires stay
    top = np.where(dark.any(axis=0), dark.argmax(axis=0), h - 1)
    mask = (np.arange(h)[:, None] >= top[None, :]).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 5), np.uint8))
    # stop just under the lowest rooftop, so the colour block is a band and not a slab of ground
    edge = np.where(mask.any(axis=0), mask.argmax(axis=0), h - 1)
    base = min(h - 2, int(np.percentile(edge, 97)) + int(0.05 * h))
    mask, edge = mask[:base + 1], np.minimum(edge, base)
    h = mask.shape[0]
    ink = np.zeros_like(mask)
    pts = np.stack([np.arange(w), edge], axis=1).astype(np.int32)
    cv2.polylines(ink, [cv2.approxPolyDP(pts.reshape(-1, 1, 2), 1.0, False)], False, 255, 3)
    cv2.line(ink, (2, h - 2), (w - 3, h - 2), 255, 3)  # the ground the city stands on
    return ink, (mask > 0).astype(np.uint8)


# the hero: every landmark on one ground line, traced as one drawing so the pen walks the whole row
PARADE = [("qa", 0.34), ("my", 0.80), ("id", 0.96), ("sg", 0.52), ("th", 0.82), ("sa", 0.92), ("ae", 0.74)]


def parade_raster(H=760, base=720, gap=46, side=40):
    inks, fills = [], []
    for k, (name, rel) in enumerate(PARADE):
        ink, fill = photo_raster(name, **PHOTOS[name])
        ys, xs = np.nonzero(fill)
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        ink, fill = ink[y0:y1 + 1, x0:x1 + 1], fill[y0:y1 + 1, x0:x1 + 1]
        th = int(rel * (base - 20))
        tw = max(1, round(ink.shape[1] * th / ink.shape[0]))
        ink = cv2.resize(ink, (tw, th), interpolation=cv2.INTER_AREA)
        ink = cv2.dilate((ink > 40).astype(np.uint8) * 255, np.ones((2, 2), np.uint8))
        fill = cv2.resize(fill * 255, (tw, th), interpolation=cv2.INTER_AREA) > 127
        inks.append(ink)
        fills.append((fill, 1 + k % 3))
    W = side * 2 + sum(i.shape[1] for i in inks) + gap * (len(inks) - 1)
    ink_c = np.zeros((H, W), np.uint8)
    fill_c = np.zeros((H, W), np.uint8)
    x, centres = side, []
    for (name, _), ink, (fill, k) in zip(PARADE, inks, fills):
        h, w = ink.shape
        ink_c[base - h:base, x:x + w] |= ink
        fill_c[base - h:base, x:x + w][fill] = k
        centres.append({"name": name, "x": round((x + w / 2) / W, 4)})
        x += w + gap
    cv2.line(ink_c, (4, base), (W - 5, base), 255, 3)  # the shared ground
    return ink_c, fill_c, centres


def scene_raster(name):
    img = cv2.imread(str(SRC / f"{name}-line.png"), cv2.IMREAD_GRAYSCALE)
    _, ink = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY_INV)
    fill = cv2.imread(str(SRC / f"{name}-fill.png"), cv2.IMREAD_GRAYSCALE)
    return ink, fill


# ---------- 2. skeleton to strokes ----------

NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def skeleton_strokes(ink):
    sk = cv2.ximgproc.thinning(ink, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN)
    ys, xs = np.nonzero(sk)
    pix = set(zip(ys.tolist(), xs.tolist()))

    def nbrs(p):
        # a diagonal link is redundant when a side pixel already joins the two; counting it makes every
        # staircase step look like a junction and shatters slanted lines into pieces
        y, x = p
        return [(y + dy, x + dx) for dy, dx in NB if (y + dy, x + dx) in pix
                and not (dy and dx and ((y + dy, x) in pix or (y, x + dx) in pix))]

    deg = {p: len(nbrs(p)) for p in pix}
    seen = set()  # undirected pixel edges already walked

    def walk(a, b):
        line = [a, b]
        seen.add(frozenset((a, b)))
        prev, cur = a, b
        while deg[cur] == 2:
            nxt = [q for q in nbrs(cur) if q != prev and frozenset((cur, q)) not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            seen.add(frozenset((prev, cur)))
            line.append(cur)
        return line

    lines = []
    for p in [p for p in pix if deg[p] != 2] + list(pix):  # nodes first; closed loops have none
        for q in nbrs(p):
            if frozenset((p, q)) not in seen:
                lines.append(walk(p, q))
    return [np.array([(x, y) for y, x in ln], dtype=np.float32) for ln in lines]


def length(pl):
    return float(np.linalg.norm(np.diff(pl, axis=0), axis=1).sum()) if len(pl) > 1 else 0.0


def merge_touching(lines, tol=3.0):
    """Join strokes that meet end to end at a gentle turn, so a curve is one stroke, not two."""
    lines = [l for l in lines if len(l) > 1]
    changed = True
    while changed:
        changed = False
        for i in range(len(lines)):
            for j in range(i + 1, len(lines)):
                for ra in (False, True):
                    for rb in (False, True):
                        A = lines[i][::-1] if ra else lines[i]
                        B = lines[j][::-1] if rb else lines[j]
                        if np.linalg.norm(A[-1] - B[0]) > tol:
                            continue
                        if len(A) > 4 and len(B) > 4:  # keep T-junction branches separate
                            u, v = A[-1] - A[-5], B[4] - B[0]
                            if np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-6) < 0.3:
                                continue
                        lines[i] = np.concatenate([A, B[1:]])
                        lines.pop(j)
                        changed = True
                        break
                    if changed:
                        break
                if changed:
                    break
            if changed:
                break
    return lines


# ---------- 3. one continuous line ----------

def chain(lines, lift):
    """Order strokes into one pen path: greedy nearest end, then 2-opt on the joins."""
    left = list(range(len(lines)))
    start = min(left, key=lambda i: (lines[i][:, 0].min(), -lines[i][:, 1].max()))
    a = lines[start]
    order = [(start, bool(a[0, 0] > a[-1, 0]))]
    left.remove(start)
    pos = (a[::-1] if order[0][1] else a)[-1]
    while left:
        best = None
        for i in left:
            for rev in (False, True):
                d = np.linalg.norm((lines[i][-1] if rev else lines[i][0]) - pos)
                if best is None or d < best[0]:
                    best = (d, i, rev)
        _, i, rev = best
        order.append((i, rev))
        left.remove(i)
        pos = (lines[i][::-1] if rev else lines[i])[-1]

    def ends(k):
        i, rev = order[k]
        l = lines[i][::-1] if rev else lines[i]
        return l[0], l[-1]

    improved, rounds = True, 0
    while improved and rounds < 60:
        improved, rounds = False, rounds + 1
        n = len(order)
        for i in range(n - 2):
            _, ai = ends(i)
            bi, _ = ends(i + 1)
            for j in range(i + 2, n):
                _, aj = ends(j)
                bj = ends(j + 1)[0] if j + 1 < n else None
                before = np.linalg.norm(ai - bi) + (np.linalg.norm(aj - bj) if bj is not None else 0)
                after = np.linalg.norm(ai - aj) + (np.linalg.norm(bi - bj) if bj is not None else 0)
                if after + 1e-3 < before:  # reversing order[i+1..j] swaps the joins
                    order[i + 1:j + 1] = [(k, not r) for k, r in reversed(order[i + 1:j + 1])]
                    improved = True
                    break
            if improved:
                break
    runs, jumps = [[]], 0.0
    for i, rev in order:
        l = lines[i][::-1] if rev else lines[i]
        if runs[-1]:
            gap = float(np.linalg.norm(runs[-1][-1][-1] - l[0]))
            if gap > lift:
                runs.append([])  # pen up: a long joining stroke reads as a mistake
            else:
                jumps += gap
        runs[-1].append(l)
    return [np.concatenate(r) for r in runs], jumps


# ---------- 4. ink ----------

def rounded_path(pts, scale, radius):
    pts = pts * scale
    out = [f"M{pts[0][0]:.0f} {pts[0][1]:.0f}"]
    for k in range(1, len(pts) - 1):
        p0, p1, p2 = pts[k - 1], pts[k], pts[k + 1]
        d0, d1 = np.linalg.norm(p1 - p0), np.linalg.norm(p2 - p1)
        r = min(radius, d0 / 2, d1 / 2)
        if r < 0.8:
            out.append(f"L{p1[0]:.0f} {p1[1]:.0f}")
            continue
        a = p1 + (p0 - p1) / d0 * r
        b = p1 + (p2 - p1) / d1 * r
        out.append(f"L{a[0]:.0f} {a[1]:.0f}Q{p1[0]:.0f} {p1[1]:.0f} {b[0]:.0f} {b[1]:.0f}")
    out.append(f"L{pts[-1][0]:.0f} {pts[-1][1]:.0f}")
    return "".join(out).replace(".0 ", " ").replace(".0L", "L").replace(".0Q", "Q")


def fill_paths(fill, scale, eps, offset=(0, 0)):
    blocks = []
    for k in (1, 2, 3):
        m = (fill == k).astype(np.uint8) * 255
        if not m.any():
            continue
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        ds = []
        for c in cs:
            if cv2.contourArea(c) < 300:
                continue
            c = cv2.approxPolyDP(c, eps, True).reshape(-1, 2).astype(np.float32)
            c = (c + offset) * scale
            ds.append("M" + "L".join(f"{x:.0f} {y:.0f}" for x, y in c) + "Z")
        if ds:
            blocks.append({"k": k, "d": "".join(ds)})
    return blocks


def chaikin(pts, rounds):
    """Corner cutting: each round replaces every corner with two points a quarter in, so the pen flows."""
    for _ in range(rounds):
        if len(pts) < 3:
            break
        a, b = pts[:-1], pts[1:]
        mid = np.empty((2 * len(a), 2), np.float32)
        mid[0::2], mid[1::2] = 0.75 * a + 0.25 * b, 0.25 * a + 0.75 * b
        pts = np.vstack([pts[:1], mid, pts[-1:]])
    return pts


def trace(name, ink, fill, *, min_stroke, eps, radius, fill_eps, fill_offset=(0, 0), lift=0.09, smooth=0):
    h, w = ink.shape
    scale = OUT_W / w
    raw = skeleton_strokes(ink)
    lines = [l for l in raw if length(l) >= min_stroke]
    lines = merge_touching(lines)
    simp = []
    for l in lines:
        s = cv2.approxPolyDP(l.reshape(-1, 1, 2), eps, False).reshape(-1, 2)
        if len(s) >= 2:
            simp.append(chaikin(s.astype(np.float32), smooth))
    runs, jumps = chain(simp, lift=lift * max(w, h))
    debug(name, ink.shape, runs, fill)
    # each run ends in a short pause marker so the page can time the pen
    return {
        "w": OUT_W, "h": round(h * scale),
        "d": "".join(rounded_path(r, scale, radius) for r in runs),
        "len": round(sum(length(r * scale) for r in runs)), "lifts": len(runs) - 1,
        "strokes": len(simp), "jump": round(jumps * scale), "raw": len(raw),
        "ink": int((ink > 0).sum()), "px": int(h * w),
        "fills": fill_paths(fill, scale, fill_eps, fill_offset),
    }


def debug(name, shape, runs, fill):
    DBG.mkdir(parents=True, exist_ok=True)
    h, w = shape
    im = np.full((h, w, 3), 255, np.uint8)
    im[fill == 1] = (150, 210, 240)
    im[fill == 2] = (190, 200, 150)
    im[fill == 3] = (170, 160, 230)
    for r in runs:
        cv2.polylines(im, [r.astype(np.int32)], False, (40, 30, 30), 2, cv2.LINE_AA)
    cv2.imwrite(str(DBG / f"{name}.png"), im)


def main(only):
    art = json.loads(OUT.read_text()) if OUT.exists() else {}
    want = lambda n: not only or n in only
    for name, cfg in PHOTOS.items():
        if want(name):
            ink, fill = photo_raster(name, **cfg)
            art[name] = trace(name, ink, fill, min_stroke=14, eps=1.8, radius=4, fill_eps=4,
                              fill_offset=(16, 10), lift=0.06, smooth=2) | {"kind": "landmark"}
    for name, cfg in OBJECTS.items():
        if want(name):
            ink, fill = object_raster(name, *cfg)
            art[name] = trace(name, ink, fill, min_stroke=14, eps=1.4, radius=6, fill_eps=6,
                              fill_offset=(14, 12), lift=0.09, smooth=1) | {"kind": "object"}
    for name, crop in SKYLINES.items():
        if want(name):
            ink, fill = skyline_raster(name, crop)
            art[name] = trace(name, ink, fill, min_stroke=6, eps=1.2, radius=4, fill_eps=3,
                              fill_offset=(0, 14), lift=0.02, smooth=1) | {"kind": "skyline"}
    if want("parade"):
        ink, fill, centres = parade_raster()
        art["parade"] = trace("parade", ink, fill, min_stroke=10, eps=1.4, radius=4, fill_eps=3,
                              fill_offset=(10, 8), lift=0.03, smooth=2) | {"kind": "composite", "labels": centres}
    OUT.write_text(json.dumps(art, separators=(",", ":")))
    for k, v in art.items():
        if want(k):
            print(f"{k:10s} {v['kind']:8s} lifts={v['lifts']:3d} strokes={v['strokes']:4d} len={v['len']:6d} "
                  f"jump={v['jump']:5d} d={len(v['d']) / 1024:5.1f}KB")
    print(f"art.json {OUT.stat().st_size / 1024:.0f}KB")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
