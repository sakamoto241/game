"""Technical WebP packaging and alpha-sheet separation. Requires Pillow.
Original PNGs are inputs; this tool does not generate artwork or remove backgrounds.
"""
from pathlib import Path
from PIL import Image
import argparse,json,hashlib
p=argparse.ArgumentParser()
for name in ['corridor','classroom','office','dawn','ghosts']:p.add_argument('--'+name,type=Path,required=True)
a=p.parse_args();out=Path(__file__).resolve().parent.parent/'assets';out.mkdir(exist_ok=True);meta={}
for name in ['corridor','classroom','office','dawn']:
 src=getattr(a,name);im=Image.open(src).convert('RGB');im.thumbnail((900,1600),Image.Resampling.LANCZOS);im.save(out/(name+'.webp'),quality=88,method=6);meta[name]={'source':src.name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest()}
im=Image.open(a.ghosts).convert('RGBA');assert im.getchannel('A').getextrema()[0]==0,'A genuinely transparent source is required.'
for left,right,name in [(0,.30,'ghost-still'),(.30,.58,'ghost-step'),(.58,1,'ghost-close')]:
 part=im.crop((round(im.width*left),0,round(im.width*right),im.height));bbox=part.getchannel('A').point(lambda v:255 if v>16 else 0).getbbox();assert bbox;part=part.crop(bbox);part.thumbnail((650,1100),Image.Resampling.LANCZOS);part.save(out/(name+'.webp'),quality=93,method=6)
meta['ghosts']={'source':a.ghosts.name,'sha256':hashlib.sha256(a.ghosts.read_bytes()).hexdigest()};(out/'provenance.json').write_text(json.dumps(meta,indent=2))
