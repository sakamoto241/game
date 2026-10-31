"""Pack transparent enemy and spell illustrations. No background removal or runtime slicing.
Usage: python3 tools/prepare-akatsuki-combat-art.py ENEMIES.png SPELLS.png OUT_DIR META.json
"""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image
src_enemies,src_spells,dest,meta=sys.argv[1:];dest=Path(dest)
def pack(path,regions,columns,target):
 im=Image.open(path).convert('RGBA');assert im.getchannel('A').getextrema()[0]==0
 tiles=[];anchors=[]
 for region in regions:
  cell=im.crop(region);a=cell.getchannel('A');bbox=a.point(lambda v:255 if v>28 else 0).getbbox();assert bbox
  x0,y0,x1,y1=bbox;bbox=(max(0,x0-4),max(0,y0-4),min(cell.width,x1+4),min(cell.height,y1+4));tile=cell.crop(bbox);tiles.append(tile)
  alpha=np.asarray(tile)[:,:,3];ys,xs=np.where(alpha>150);bottom=ys.max();band=(alpha>150)&(np.indices(alpha.shape)[0]>=bottom-max(4,int(tile.height*.1)));_,fx=np.where(band);anchors.append([round(float(fx.mean()/tile.width),4),round(float(bottom/tile.height),4)])
 rows=[tiles[i:i+columns] for i in range(0,len(tiles),columns)];heights=[max(t.height for t in row) for row in rows];width=max(sum(t.width+8 for t in row) for row in rows);out=Image.new('RGBA',(width,sum(heights)+8*len(rows)),(0,0,0,0));rects=[];y=0
 for row,h in zip(rows,heights):
  x=0
  for tile in row:out.paste(tile,(x,y));rects.append([x,y,tile.width,tile.height]);x+=tile.width+8
  y+=h+8
 out.save(dest/target,quality=90,method=6);return {'rects':rects,'anchors':anchors,'size':out.size}
e=pack(src_enemies,[(0,0,525,500),(525,0,950,500),(950,0,1536,500),(0,500,600,1024),(600,500,1050,1024),(1050,500,1536,1024)],3,'akatsuki-enemies.webp')
w,h=Image.open(src_spells).size;f=pack(src_spells,[(0,0,w//3,h),(w//3,0,w*2//3,h),(w*2//3,0,w,h)],3,'akatsuki-spells.webp')
Path(meta).write_text(json.dumps({'enemies':e,'spells':f},indent=2));print(json.dumps({'enemies':e,'spells':f}))
