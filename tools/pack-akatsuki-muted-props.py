"""Pack generated RGBA props without painting or removing pixels; retain genuine alpha.
Usage: python3 tools/pack-akatsuki-muted-props.py SOURCE.png OUTPUT.webp OUTPUT.json
Requires Pillow, NumPy and SciPy. JSON describes each object and its ground anchor.
"""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
source,output,metadata=sys.argv[1:]
im=Image.open(source).convert('RGBA');alpha=np.asarray(im)[:,:,3]
assert alpha.min()==0,'Expected a truly transparent source'
labels,n=ndimage.label(alpha>100);sizes=np.bincount(labels.ravel());objects=ndimage.find_objects(labels)
components=[]
for i in range(1,n+1):
 if sizes[i]<2000:continue
 sy,sx=objects[i-1];components.append((sx.start,sy.start,sx.stop,sy.stop))
assert len(components)==8, f'Inspect source: expected 8 major objects, found {len(components)}'
rows=[sorted([r for r in components if (r[1]+r[3])/2<im.height/2]),sorted([r for r in components if (r[1]+r[3])/2>=im.height/2])]
assert all(len(r)==4 for r in rows)
tiles=[];anchors=[]
for box in rows[0]+rows[1]:
 x0,y0,x1,y1=box;box=(max(0,x0-6),max(0,y0-6),min(im.width,x1+6),min(im.height,y1+6));tile=im.crop(box);a=np.asarray(tile)[:,:,3];ys,xs=np.where(a>150);foot_y=int(ys.max());band=(a>150)&(np.indices(a.shape)[0]>foot_y-max(3,int(tile.height*.1)));fy,fx=np.where(band)
 anchors.append({'x':round(float(fx.mean()/tile.width),4),'y':round(foot_y/tile.height,4),'foot':round(float((fx.max()-fx.min()+1)/tile.width),4)})
 tiles.append(tile)
pad=12;row_heights=[max(t.height for t in tiles[:4]),max(t.height for t in tiles[4:])];width=max(sum(t.width+pad for t in tiles[:4]),sum(t.width+pad for t in tiles[4:]));out=Image.new('RGBA',(width,sum(row_heights)+pad),(0,0,0,0));rects=[];y=0
for row,high in zip((tiles[:4],tiles[4:]),row_heights):
 x=0
 for tile in row:
  out.paste(tile,(x,y));rects.append([x,y,tile.width,tile.height]);x+=tile.width+pad
 y+=high+pad
out.save(output,quality=90,method=6)
data={'rects':rects,'anchors':anchors,'size':out.size,'order':['lamppost','wall-lantern','bench','shrine','beacon','arch','lit-furnace','cold-furnace']};Path(metadata).write_text(json.dumps(data,indent=2));print(json.dumps(data));print('Bytes:',Path(output).stat().st_size)
