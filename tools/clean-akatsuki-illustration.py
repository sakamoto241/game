"""Reduce baked-in compression noise in an event illustration without changing the drawing.

Usage: python3 -I tools/clean-akatsuki-illustration.py INPUT OUTPUT.webp
Non-local-means denoise (h=5) followed by a light unsharp mask, saved at WebP quality 92
so no new block noise is introduced. Needs opencv-python-headless.
"""
import sys
import cv2
import numpy as np
from PIL import Image

src = cv2.cvtColor(np.asarray(Image.open(sys.argv[1]).convert('RGB')), cv2.COLOR_RGB2BGR)
clean = cv2.fastNlMeansDenoisingColored(src, None, 5, 5, 7, 21)
sharp = cv2.addWeighted(clean, 1.35, cv2.GaussianBlur(clean, (0, 0), 1.2), -.35, 0)
Image.fromarray(cv2.cvtColor(sharp, cv2.COLOR_BGR2RGB)).save(sys.argv[2], quality=92, method=6)
