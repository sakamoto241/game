"""Pack the two approved illustrations as runtime WebPs, without altering the art.
Usage: python3 tools/prepare-yofuke-art.py BACKGROUND_PNG PORTRAIT_SHEET_PNG
The portrait sheet must be an equal 4-column by 2-row grid, each cell 3:4.
"""
from pathlib import Path
from PIL import Image
import sys

root = Path(__file__).resolve().parent.parent
for source, target in [(sys.argv[1], 'yofuke-inn.webp'), (sys.argv[2], 'yofuke-guests.webp')]:
    im = Image.open(source).convert('RGB')
    if target.endswith('guests.webp') and (im.width % 4 or im.height % 2):
        raise ValueError('Portrait cells must divide evenly into a 4 by 2 grid')
    im.save(root / target, quality=88, method=6)
    print(target, im.size, (root / target).stat().st_size, 'bytes')
