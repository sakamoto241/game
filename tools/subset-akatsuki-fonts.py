"""Subset the OFL fonts used by akatsuki.html to the characters the game can display.

Usage: python3 -I tools/subset-akatsuki-fonts.py FONT_DIR
FONT_DIR holds ShipporiMinchoB1-Regular.ttf, ShipporiMinchoB1-Bold.ttf and Cinzel[wght].ttf
from https://github.com/google/fonts (ofl/shipporiminchob1, ofl/cinzel).
Run again whenever akatsuki text changes; `--check` only reports missing characters.
"""
import pathlib, sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'akatsuki-fonts'
sources = ['akatsuki.html', 'akatsuki.js', 'akatsuki-story.js', 'akatsuki-core.js']
text = ''.join((root / f).read_text(encoding='utf-8') for f in sources)
# Kana, ASCII and common punctuation stay available for later text edits.
extra = ''.join(map(chr, list(range(0x20, 0x7f)) + list(range(0x3000, 0x3040)) + list(range(0x3040, 0x30a0)) + list(range(0x30a0, 0x3100)) + list(range(0xff01, 0xff5f)))) + '・…―─‐〜→←↑↓◆◇●○＋'
chars = sorted({c for c in text + extra if ord(c) >= 0x20})
cjk = ''.join(chars)
latin = ''.join(c for c in chars if ord(c) < 0x250) + '·—–'

def check(path, wanted):
    cmap = TTFont(path).getBestCmap()
    return [c for c in wanted if ord(c) >= 0x3000 and ord(c) not in cmap]

if '--check' in sys.argv:
    font = out / 'akatsuki-mincho-regular.woff2'
    missing = check(font, {c for c in text if ord(c) >= 0x3000})
    print('missing:', ''.join(missing) or 'none')
    sys.exit(1 if missing else 0)

src = pathlib.Path(sys.argv[1])
jobs = [('ShipporiMinchoB1-Regular.ttf', 'akatsuki-mincho-regular.woff2', cjk),
        ('ShipporiMinchoB1-Bold.ttf', 'akatsuki-mincho-bold.woff2', cjk),
        ('Cinzel[wght].ttf', 'akatsuki-cinzel.woff2', latin)]
for name, target, glyphs in jobs:
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['kern', 'liga', 'palt', 'vert']
    options.name_IDs = ['*']
    font = subset.load_font(str(src / name), options)
    sub = subset.Subsetter(options)
    sub.populate(text=glyphs)
    sub.subset(font)
    subset.save_font(font, str(out / target), options)
    print(target, (out / target).stat().st_size // 1024, 'KB')
