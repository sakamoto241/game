"""Technical crop/nearest-neighbor packing of the generated transparent sprite sheets.
Requires Pillow. Original PNG paths are explicit; originals are left untouched.
"""
from pathlib import Path
from PIL import Image
import argparse,json,hashlib
p=argparse.ArgumentParser();p.add_argument('--characters',type=Path,required=True);p.add_argument('--props',type=Path,required=True);a=p.parse_args();out=Path(__file__).resolve().parent.parent/'assets';out.mkdir(exist_ok=True);meta={}
for key,src,cols,rows,names,sizes,cw,ch in [('sprites',a.characters,4,2,['walk-0','walk-1','walk-2','walk-3','front','turn','ghost','ghost-near'],[(32,50)]*6+[(30,62),(36,62)],48,72),('props',a.props,2,2,['exit','window','door','lamp'],[(44,56),(36,25),(36,42),(44,12)],64,64)]:
 sheet=Image.open(src).convert('RGBA');assert sheet.getchannel('A').getextrema()[0]==0,'A real alpha sheet is required';atlas=Image.new('RGBA',(cols*cw,rows*ch));frames={}
 for i,name in enumerate(names):
  box=(round(sheet.width*(i%cols)/cols),round(sheet.height*(i//cols)/rows),round(sheet.width*(i%cols+1)/cols),round(sheet.height*(i//cols+1)/rows));cell=sheet.crop(box);alpha=cell.getchannel('A');bbox=alpha.point(lambda v:255 if v>64 else 0).getbbox();assert bbox,name;cell=cell.crop(bbox);cell.thumbnail(sizes[i],Image.Resampling.NEAREST);cell.putalpha(cell.getchannel('A').point(lambda v:255 if v>=96 else 0));x=(i%cols)*cw+(cw-cell.width)//2;y=(i//cols)*ch+ch-cell.height-3;atlas.alpha_composite(cell,(x,y));frames[name]={'x':x,'y':y,'w':cell.width,'h':cell.height};print(key,name,cell.size)
 atlas.save(out/(key+'.webp'),lossless=True,method=6);(out/(key+'.json')).write_text(json.dumps(frames));meta[key]={'source':src.name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest()}
(out/'provenance.json').write_text(json.dumps(meta,indent=2))
