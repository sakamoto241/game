"""Cut the lantern-keeper prop sheet (baked checkerboard, 4x2 grid) into akatsuki-props.webp.

Usage: python3 -I tools/prepare-akatsuki-props.py SOURCE.png akatsuki-props.webp
Prints the packed rects for PROP_RECTS in akatsuki.js.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, dst = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(int)
mx, mn = im.max(2), im.min(2)
# The checkerboard is white/light gray; props are dark or saturated.
bgish = (mn > 165) & (mx - mn < 22)
lab, n = ndimage.label(bgish)
sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
keep = np.zeros(n + 1, bool)
objs = ndimage.find_objects(lab)
for i, sz in enumerate(sizes, 1):
    if i in border:
        keep[i] = True
        continue
    if sz <= 25:
        continue
    sl = objs[i - 1]
    sl = (slice(max(0, sl[0].start - 3), sl[0].stop + 3), slice(max(0, sl[1].start - 3), sl[1].stop + 3))
    m = lab[sl] == i
    ring = ndimage.binary_dilation(m, iterations=3) & ~m & ~bgish[sl]
    # Pockets enclosed by dark metal/stone are background; bright rings mean a flame core.
    if ring.any() and mx[sl][ring].mean() < 150:
        keep[i] = True
bg = keep[lab]
soft = (mn > 150) & (mx - mn < 16) & (im[..., 0] - im[..., 2] < 10)
for _ in range(4):
    bg = bg | (ndimage.binary_dilation(bg) & soft)
fg = ndimage.binary_opening(~bg, iterations=1)
l2, n2 = ndimage.label(fg)
s2 = ndimage.sum(np.ones_like(l2), l2, range(1, n2 + 1))
fg = np.isin(l2, [i + 1 for i, s in enumerate(s2) if s > 300])
alpha = ndimage.binary_erosion(fg, iterations=1).astype(np.uint8) * 255
alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(.6)))
cut = Image.fromarray(np.dstack([im.astype(np.uint8), alpha]))

# lamppost, wall lantern, bench, shrine / lighthouse, arch, lit forge, cold forge
w, h = cut.size
cols = [0, round(w * .248), round(w * .496), round(w * .755), w]
rows = [0, h // 2, h]
scale = .9
tiles = []
a = np.asarray(cut)[..., 3]
for r in range(2):
    for c in range(4):
        ys, xs = np.where(a[rows[r]:rows[r + 1], cols[c]:cols[c + 1]] > 20)
        t = cut.crop((cols[c] + xs.min(), rows[r] + ys.min(), cols[c] + xs.max() + 1, rows[r] + ys.max() + 1))
        tiles.append(t.resize((round(t.width * scale), round(t.height * scale)), Image.LANCZOS))
width = max(sum(t.width + 4 for t in tiles[:4]), sum(t.width + 4 for t in tiles[4:]))
height = max(t.height for t in tiles[:4]) + max(t.height for t in tiles[4:]) + 8
out = Image.new('RGBA', (width, height), (0, 0, 0, 0))
rects, y = [], 0
for row in (tiles[:4], tiles[4:]):
    x = 0
    for t in row:
        out.paste(t, (x, y))
        rects.append([x, y, t.width, t.height])
        x += t.width + 4
    y += max(t.height for t in row) + 4
out.save(dst, quality=84, method=6)
print(out.size, rects)
