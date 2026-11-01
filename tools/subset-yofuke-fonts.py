"""Usage: PYTHONPATH=/path/with/brotli python3 tools/subset-yofuke-fonts.py FONT_DIR.
FONT_DIR contains OFL ShipporiMinchoB1-Regular.ttf and ShipporiMinchoB1-Bold.ttf.
Build only the characters this standalone game renders. No runtime font service.
"""
from pathlib import Path
import sys
from fontTools import subset

root = Path(__file__).resolve().parent.parent
text = ''.join((root / f).read_text() for f in ['yofuke.html','yofuke.js','yofuke-core.js','yofuke-data.js'])
chars = {c for c in text if ord(c) >= 32} | {chr(i) for i in range(32, 127)} | set('−＋→×·')
out = root / 'yofuke-fonts'
out.mkdir(exist_ok=True)
for source, target in [('Regular', 'regular'), ('Bold', 'bold')]:
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'palt']
    font = subset.load_font(str(Path(sys.argv[1]) / f'ShipporiMinchoB1-{source}.ttf'), opts)
    original = font.getBestCmap()
    missing = [c for c in chars if ord(c) not in original]
    if missing:
        raise ValueError('Missing glyphs: ' + ''.join(sorted(missing)))
    sub = subset.Subsetter(opts)
    sub.populate(text=''.join(sorted(chars)))
    sub.subset(font)
    subset.save_font(font, str(out / (target + '.woff2')), opts)
    print(target, (out / (target + '.woff2')).stat().st_size, 'bytes')
(out / 'glyphs.txt').write_text(''.join(sorted(chars)))
