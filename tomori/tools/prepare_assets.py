"""Technical crop/packing/resize only. Original generated artwork stays intact.
Optional regeneration needs the PNG sources listed in provenance.json.
"""
from PIL import Image
from pathlib import Path
import json,hashlib
ROOT=Path('/workspace/generated_images');OUT=Path(__file__).resolve().parents[1]/'assets'
SOURCES={'heroes':'exec-73d90286-59af-4de0-aa0d-8c09ea65088d.png','enemies':'exec-33402fd4-24f3-4a5e-8595-41cffc9fdc2f.png','grounds':'exec-72f74001-5343-4b8d-b1b3-22c23f2f410e.png','portraits':'exec-370af0c0-5cbe-4570-a189-853fe3bf5aad.png'}
def bbox(im):return im.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
im=Image.open(ROOT/SOURCES['heroes']).convert('RGBA');w,h=im.size
for i,id in enumerate(['rine','ash','noa','finn']):
 cells=[im.crop((round(i*w/4),round(j*h/2),round((i+1)*w/4),round((j+1)*h/2))) for j in range(2)]
 boxes=[bbox(c) for c in cells];union=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
 for pose,cell in zip(['body','attack'],cells):
  frame=cell.crop(union);frame.thumbnail((430,600),Image.Resampling.LANCZOS);frame.save(OUT/f'{id}-{pose}.webp',quality=92,method=6)
 body=cells[0].crop(union);bw,bh=body.size
 portrait=body.crop((0,0,bw,round(bh*.66)));portrait.thumbnail((600,700),Image.Resampling.LANCZOS);portrait.save(OUT/f'{id}-portrait.webp',quality=92,method=6)
 face=body.crop((round(bw*.17),round(bh*.02),round(bw*.80),round(bh*.37)));face.thumbnail((220,220),Image.Resampling.LANCZOS);face.save(OUT/f'{id}-face.webp',quality=91,method=6)
im=Image.open(ROOT/SOURCES['portraits']).convert('RGBA');w,h=im.size
for i,id in enumerate(['rine','ash','noa','finn']):
 x,y=i%2,i//2;portrait=im.crop((x*w//2,y*h//2,(x+1)*w//2,(y+1)*h//2));portrait=portrait.crop(bbox(portrait));portrait.save(OUT/f'{id}-portrait.webp',quality=93,method=6)
 face=portrait.crop((0,0,portrait.width,round(portrait.height*.56)));face.thumbnail((300,300),Image.Resampling.LANCZOS);face.save(OUT/f'{id}-face.webp',quality=92,method=6)
im=Image.open(ROOT/SOURCES['enemies']).convert('RGBA');w,h=im.size
for i,id in enumerate(['gel','imp','wolf','stag']):
 boxes=[(0,0,627,570),(627,0,1254,570),(0,650,627,1254),(627,570,1254,1254)];cell=im.crop(boxes[i]);cell=cell.crop(bbox(cell));cell.thumbnail((600,650),Image.Resampling.LANCZOS);cell.save(OUT/f'{id}.webp',quality=92,method=6)
im=Image.open(ROOT/SOURCES['grounds']).convert('RGB');w,h=im.size
for i,id in enumerate(['forest','bridge']):
 cell=im.crop((i*w//2+3,3,(i+1)*w//2-3,h-3));cell.thumbnail((750,1120),Image.Resampling.LANCZOS);cell.save(OUT/f'{id}.webp',quality=90,method=6)
(OUT/'provenance.json').write_text(json.dumps({'date':'2026-11-05','style':'Bold contours, broad anime cel color, sparse detail. Original characters and world.','processing':'Technical crop, matched idle/attack frame bounds, resize and WebP encoding only. Background removal was performed with image generation, not scripts.','sources':[{'role':k,'file':name,'sha256':hashlib.sha256((ROOT/name).read_bytes()).hexdigest()} for k,name in SOURCES.items()],'style_reference':'exec-51034ad7-51ef-4a1f-8f28-7a8b596b9380.png'},ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(list(OUT.glob('*.webp'))),'WebP assets;',sum(p.stat().st_size for p in OUT.glob('*.webp')),'bytes')
