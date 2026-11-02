"""Technical packaging of original illustrations; no runtime background removal.
Requires Pillow, numpy, scipy. Source PNG paths are explicit; portraits remain RGBA.
"""
from pathlib import Path
import argparse,json,hashlib
from PIL import Image
import numpy as np
from scipy import ndimage

root=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser()
for key in ['forest','clearing','title','characters']:p.add_argument('--'+key,required=True,type=Path)
a=p.parse_args();out=root/'public/assets';out.mkdir(parents=True,exist_ok=True);manifest={}
for key in ['forest','clearing','title']:
 src=getattr(a,key);im=Image.open(src).convert('RGB');im.thumbnail((768,1152),Image.Resampling.LANCZOS);im.save(out/(key+'.webp'),quality=88,method=6);manifest[key]={'file':key+'.webp','kind':'final','source':src.name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest()};print(key,im.size,(out/(key+'.webp')).stat().st_size)
src=a.characters;sheet=Image.open(src).convert('RGBA');w,h=sheet.size
if np.array(sheet.getchannel('A')).min()!=0:raise ValueError('Character artwork must have real transparency')
names=['hero-idle','hero-step-a','hero-step-b','hero-back','rabbit-idle','rabbit-wave','acorn-idle','acorn-nervous'];pieces=[]
# The source has a small clear gap below the top row, not a rigid mathematical divider.
split=round(h*.515)
for i,name in enumerate(names):
 col=i%4;row=i//4;x0=round(w*col/4);x1=round(w*(col+1)/4);y0=0 if row==0 else split;y1=split if row==0 else h
 cell=sheet.crop((x0,y0,x1,y1));alpha=np.array(cell.getchannel('A'));labels,n=ndimage.label(alpha>16);counts=np.bincount(labels.ravel());counts[0]=0;main=int(counts.argmax());ys,xs=np.where(labels==main)
 if len(xs)<100:raise ValueError('No character in '+name)
 bx0,bx1,by0,by1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
 # Include detached pencil strokes/feet adjacent to the main silhouette, not distant stray pixels.
 for lab in np.flatnonzero(counts>30):
  yy,xx=np.where(labels==lab)
  if xx.max()>=bx0-28 and xx.min()<=bx1+28 and yy.max()>=by0-28 and yy.min()<=by1+28:
   bx0=min(bx0,xx.min());bx1=max(bx1,xx.max()+1);by0=min(by0,yy.min());by1=max(by1,yy.max()+1)
 box=(max(0,int(bx0)-2),max(0,int(by0)-2),min(cell.width,int(bx1)+2),min(cell.height,int(by1)+2));piece=cell.crop(box);aa=np.array(piece.getchannel('A'));band=aa[round(piece.height*.88):,:];weights=band.sum(axis=0);anchor=float((weights*np.arange(piece.width)).sum()/max(1,weights.sum())/piece.width)
 pieces.append((name,piece,anchor));print(name,piece.size,round(anchor,3))
cw=max(im.width for _,im,_ in pieces)+16;ch=max(im.height for _,im,_ in pieces)+16;atlas=Image.new('RGBA',(cw*4,ch*2));frames={};origins={}
for i,(name,im,anchor) in enumerate(pieces):
 x=i%4*cw+8;y=i//4*ch+8;atlas.alpha_composite(im,(x,y));frames[name]={'frame':{'x':x,'y':y,'w':im.width,'h':im.height},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':im.width,'h':im.height},'sourceSize':{'w':im.width,'h':im.height}}
 group=pieces[:4] if i<4 else pieces[4:6] if i<6 else pieces[6:];origins[name]={'x':round(anchor,5),'y':.995,'groupHeight':max(item[1].height for item in group)}
 if name in ['hero-idle','rabbit-idle','rabbit-wave','acorn-idle','acorn-nervous']:
  face=im.crop((0,0,im.width,round(im.height*.76)));face.thumbnail((200,220),Image.Resampling.LANCZOS);face.save(out/('portrait-'+name+'.webp'),quality=92,method=6)
atlas.save(out/'characters.webp',quality=92,method=6)
(out/'characters.json').write_text(json.dumps({'frames':frames,'meta':{'image':'characters.webp','size':{'w':atlas.width,'h':atlas.height},'scale':'1'}}))
(out/'character-origins.json').write_text(json.dumps(origins));manifest['characters']={'file':'characters.webp','kind':'final','source':src.name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest()}
(out/'provenance.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('atlas',atlas.size,(out/'characters.webp').stat().st_size)
