"""Technical registration, crop, resize and encoding of generated expression layers.
Original body art is never changed. Rendering combines these layers in the browser.
"""
from PIL import Image
from pathlib import Path
import json,hashlib
ROOT=Path('/workspace/generated_images');PROJECT=Path(__file__).resolve().parents[1];OUT=PROJECT/'assets'/'expressions'
SOURCES={'rine':('exec-56f58db7-cbfe-47c3-9bb9-9e5c5895a89d.png',430),'ash':('exec-1ebe5fdb-90d8-4a53-93d8-fcc2205e469e.png',420),'noa':('exec-d984106e-8e6d-48e8-acba-1237f2ff0bf5.png',465),'finn':('exec-e92b051e-eb0f-4d09-9978-dec99a2ea0b8.png',450),'hugo':('exec-496320e0-91d2-4fcc-9efe-5698842fe781.png',420)}
OUT.mkdir(parents=True,exist_ok=True)
names=['smile','surprised','troubled','serious'];manifest={};sources=[]
for id,(file,hh) in SOURCES.items():
 base=Image.open(PROJECT/'assets'/f'{id}-normal-portrait.webp').convert('RGBA');w,h=base.size;side=max(w,hh)+32;px=(side-w)//2;py=(side-hh)//2
 head=base.crop((0,0,w,hh));head.save(OUT/f'{id}-mask.webp',quality=95,method=6)
 sheet=Image.open(ROOT/file).convert('RGBA');sw,sh=sheet.size
 for i,name in enumerate(names):
  cell=sheet.crop((round(i%2*sw/2),round(i//2*sh/2),round((i%2+1)*sw/2),round((i//2+1)*sh/2))).resize((side,side),Image.Resampling.LANCZOS)
  registered=cell.crop((px,py,px+w,py+hh));registered.save(OUT/f'{id}-{name}.webp',quality=94,method=6)
 manifest[id]={'width':w,'height':h,'headHeight':hh,'variants':names}
 sources.append({'character':id,'file':file,'sha256':hashlib.sha256((ROOT/file).read_bytes()).hexdigest(),'baseSha256':hashlib.sha256((PROJECT/'assets'/f'{id}-normal-portrait.webp').read_bytes()).hexdigest()})
(OUT/'provenance.json').write_text(json.dumps({'method':'Generated edits of four identical cropped head references, technically resized/cropped to original coordinates. Browser masks retain the original silhouette and blend the lower neck onto the unchanged body.','variants':names,'sources':sources},ensure_ascii=False,indent=2)+'\n')
(PROJECT/'expressions.js').write_text('/* Generated asset registration; body coordinates are unchanged. */\n(function(root){const data='+json.dumps(manifest,separators=(',',':'))+';if(typeof module===\'object\'&&module.exports)module.exports=data;else root.TomoriExpressions=data;})(globalThis);\n')
print('Prepared',len(SOURCES)*len(names),'expression layers and',len(SOURCES),'alpha masks;',sum(p.stat().st_size for p in OUT.iterdir()),'bytes')
