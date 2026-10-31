"""Make chapter backgrounds tile horizontally and save them as WebP.

Usage: python3 -I tools/prepare-akatsuki-backgrounds.py SOURCE.png OUTPUT.webp
The last BLEND columns are cross-faded into the first ones, so the result is
BLEND px narrower and its right edge continues into its left edge.
"""
import sys
import numpy as np
from PIL import Image

BLEND = 192
src, dst = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert('RGB')).astype(float)
w = a.shape[1]
out = a[:, :w - BLEND].copy()
t = (np.arange(BLEND) / BLEND)[None, :, None]
out[:, :BLEND] = a[:, :BLEND] * t + a[:, w - BLEND:] * (1 - t)
Image.fromarray(out.round().astype(np.uint8)).save(dst, quality=82, method=6)
print(dst, out.shape[1], 'x', out.shape[0])
