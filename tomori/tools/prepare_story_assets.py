"""Technical crop/resize of normal-proportion original artwork; no retouching."""
from PIL import Image
from pathlib import Path
import json,hashlib
OUT=Path(__file__).resolve().parents[1]/'assets';ROOT=Path('/workspace/generated_images')
SOURCES={'rine':'exec-a68336ee-726c-4cf0-a773-ff01bd78a537.png','ash':'exec-60650248-e0d2-403d-83f0-15521152d7f7.png','noa':'exec-9ee68949-4e34-430c-88e7-6a3c4679fc8b.png','finn':'exec-06368bd0-a7ba-4505-b586-d737a53a6847.png'}
def trim(im):
 b=im.getchannel('A').point(lambda x:255 if x>32 else 0).getbbox()
 return im.crop(b) if b else im
for id,file in SOURCES.items():
 im=Image.open(ROOT/file).convert('RGBA');w,h=im.size;split=round(w*.605)
 portrait=trim(im.crop((0,0,split,h)));body=trim(im.crop((split,0,w,h)))
 portrait.thumbnail((760,1000),Image.Resampling.LANCZOS);body.thumbnail((500,1000),Image.Resampling.LANCZOS)
 portrait.save(OUT/f'{id}-normal-portrait.webp',quality=93,method=6);body.save(OUT/f'{id}-normal-body.webp',quality=93,method=6)
 face=portrait.crop((0,0,portrait.width,round(portrait.height*.49)));face.thumbnail((300,320),Image.Resampling.LANCZOS);face.save(OUT/f'{id}-normal-face.webp',quality=91,method=6)
(OUT/'normal-provenance.json').write_text(json.dumps({'purpose':'Normal-proportion art for dialogue, title, camp and menus. Battle keeps its separate SD art.','processing':'Technical alpha-bounding crop, resize and WebP encoding only.','sources':[{'id':id,'file':f,'sha256':hashlib.sha256((ROOT/f).read_bytes()).hexdigest()} for id,f in SOURCES.items()]},ensure_ascii=False,indent=2)+'\n')
print('Prepared adult character portraits and full-body art')
EXTRA={'hugo':'exec-baf4a191-6e9f-42b3-89f6-5548e0e6b15f.png','golem':'exec-5aba88e4-8f4f-4c42-ab48-61c55db8c5a6.png','props':'exec-ff686bf6-ffa4-45f3-bfa3-77b6a0d7f9b6.png','scenes':'exec-0a88f46c-9065-49c3-941a-ae738a23a286.png'}
im=Image.open(ROOT/EXTRA['hugo']).convert('RGBA');w,h=im.size
for i,name in enumerate(['hugo-normal-portrait','hugo-laugh-portrait']):
 crop=trim(im.crop((i*w//2,0,(i+1)*w//2,h)));crop.thumbnail((750,1000),Image.Resampling.LANCZOS);crop.save(OUT/f'{name}.webp',quality=92,method=6)
im=trim(Image.open(ROOT/EXTRA['golem']).convert('RGBA'));im.thumbnail((700,700),Image.Resampling.LANCZOS);im.save(OUT/'golem.webp',quality=92,method=6)
im=Image.open(ROOT/EXTRA['props']).convert('RGBA');w,h=im.size
for name,box in [('sale-sword',(0,0,650,h)),('sale-paper',(650,0,w,h))]:
 crop=trim(im.crop(box));crop.thumbnail((720,1000),Image.Resampling.LANCZOS);crop.save(OUT/f'{name}.webp',quality=92,method=6)
im=Image.open(ROOT/EXTRA['scenes']).convert('RGB');w,h=im.size
for i,name in enumerate(['shop','tavern','yard']):
 crop=im.crop((round(i*w/3)+3,3,round((i+1)*w/3)-3,h-3));crop.save(OUT/f'{name}.webp',quality=91,method=6)
meta=json.loads((OUT/'normal-provenance.json').read_text());meta['new_story_sources']=[{'role':id,'file':f,'sha256':hashlib.sha256((ROOT/f).read_bytes()).hexdigest()} for id,f in EXTRA.items()];(OUT/'normal-provenance.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('Prepared merchant, story props, shop/tavern/yard and cargo boss')
