"""Usage: PYTHONPATH=/path/to/brotli python3 tools/subset-fonts.py FONT_DIR.
Only required when editing text; runtime assets are committed.
"""
from pathlib import Path
from fontTools import subset
import sys
root=Path(__file__).resolve().parent.parent
text=(root/'index.html').read_text()+''.join(p.read_text() for p in (root/'src').rglob('*.ts'))
chars={c for c in text if ord(c)>=32}|{chr(n) for n in range(32,127)}|set('−＋→×▽')
out=root/'public/fonts';out.mkdir(exist_ok=True)
for name,target in [('Regular','regular'),('Bold','bold')]:
 opts=subset.Options();opts.flavor='woff2';opts.layout_features=['kern','liga','palt']
 font=subset.load_font(str(Path(sys.argv[1])/('ShipporiMinchoB1-'+name+'.ttf')),opts)
 missing=sorted(c for c in chars if ord(c) not in font.getBestCmap())
 if missing:raise ValueError('Missing: '+''.join(missing))
 sub=subset.Subsetter(opts);sub.populate(text=''.join(sorted(chars)));sub.subset(font);subset.save_font(font,str(out/(target+'.woff2')),opts)
 print(target,(out/(target+'.woff2')).stat().st_size)
(out/'glyphs.txt').write_text(''.join(sorted(chars)))
