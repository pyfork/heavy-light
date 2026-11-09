"""Save the pipeline's stages for one landmark as small images for the journal article:
photo crop, silhouette, edges + outline, Zhang-Suen skeleton, and the final one-line path.
Output: art/_stages/<name>-<stage>.png. Run with the OpenCV venv: python tools/stages.py my
"""
import sys
import cv2
import numpy as np
import trace as T

name = sys.argv[1] if len(sys.argv) > 1 else "my"
cfg = T.PHOTOS[name]
out = T.ROOT / "art" / "_stages"
out.mkdir(parents=True, exist_ok=True)

img = cv2.imread(str(T.SRC / f"{name}.jpg"))
h, w = img.shape[:2]
x0, y0, x1, y1 = cfg["crop"]
img = img[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
k = T.WORK / max(img.shape[:2])
img = cv2.resize(img, (round(img.shape[1] * k), round(img.shape[0] * k)), interpolation=cv2.INTER_CUBIC if k > 1 else cv2.INTER_AREA)
ink, fill = T.photo_raster(name, **cfg)
assert ink.shape == img.shape[:2], (ink.shape, img.shape)
skel = cv2.ximgproc.thinning(ink, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN)

lines = [l for l in T.skeleton_strokes(ink) if T.length(l) >= 14]
lines = T.merge_touching(lines)
simp = [T.chaikin(cv2.approxPolyDP(l.reshape(-1, 1, 2), 1.8, False).reshape(-1, 2).astype(np.float32), 2) for l in lines]
runs, _ = T.chain([s for s in simp if len(s) >= 2], lift=0.06 * max(ink.shape))

white = lambda: np.full(ink.shape, 255, np.uint8)
sil = white(); sil[fill > 0] = 200
edges = white(); edges[cv2.dilate(ink, np.ones((2, 2), np.uint8)) > 0] = 30
sk = white(); sk[cv2.dilate(skel, np.ones((2, 2), np.uint8)) > 0] = 30
line = white()
for r in runs:
    cv2.polylines(line, [r.astype(np.int32)], False, 30, 3, cv2.LINE_AA)
for stage, im in [("photo", img), ("silhouette", sil), ("edges", edges), ("skeleton", sk), ("line", line)]:
    cv2.imwrite(str(out / f"{name}-{stage}.png"), im)
print(f"{name}: {len(lines)} strokes, {len(runs)} runs, skeleton px {int((skel > 0).sum())}")
