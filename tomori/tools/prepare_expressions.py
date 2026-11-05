"""Technical crop, uniform sizing and encoding of COMPLETE generated portraits.
No head/body compositing or facial retouching: each source cell is a finished figure.
"""
from PIL import Image
from pathlib import Path
import json,hashlib
ROOT=Path('/workspace/generated_images');PROJECT=Path(__file__).resolve().parents[1];OUT=PROJECT/'assets'/'portraits'
SOURCES={
 'rine':[
  ('exec-5fa13c6a-953c-466d-ae97-79642841b3f6.png',{0:'smile',1:'serious'}),
  ('exec-f58cbfe6-ee49-4e37-8655-6120629442c9.png',{0:'surprised',1:'troubled'})],
 'ash':[
  ('exec-a3eac222-f972-4400-a160-0ee0cfe0cd9a.png',{0:'smile',1:'troubled'}),
  ('exec-b9c15cfc-2752-4636-80c7-3a09693d0840.png',{1:'serious'}),
  ('exec-7045c9ed-36d4-469b-bb08-b8978842eb6f.png',{0:'surprised'})],
 'noa':[
  ('exec-1b4f2f2b-4d3b-4f07-bf18-d35c38dffe47.png',{0:'smile',1:'serious'}),
  ('exec-f367641d-9d7a-43df-b4d5-bcd12f7ce61a.png',{0:'surprised',1:'troubled'})],
 'finn':[
  ('exec-6cb76950-3a95-4ae7-a7b5-c74a1449390b.png',{0:'smile',1:'serious'}),
  ('exec-9dbd290c-d343-497d-8efd-3c36dce2f557.png',{0:'surprised',1:'troubled'})],
 'hugo':[
  ('exec-04f77514-be85-410a-b406-5a217ccdcc0f.png',{0:'smile',1:'serious'}),
  ('exec-bd8ca579-1cb1-40d3-96cb-f6e662fa7a77.png',{0:'surprised',1:'troubled'})]
}
NOA_MASTER='exec-30af6c68-828b-4287-9fa2-6caf7d50f830.png'
LABELS={
 'rine':{'neutral':'気を緩めた笑顔','smile':'目を合わせた愛想笑い','surprised':'高い報酬に驚く','troubled':'申し訳なさの出る困り顔','serious':'交渉相手を見据える'},
 'ash':{'neutral':'いつもの笑顔','smile':'穏やかな親しみのある笑顔','surprised':'声に出る驚き','troubled':'口元に出る気まずさ','serious':'仲間を守る決意'},
 'noa':{'neutral':'落ち着いて話す','smile':'片口角の余裕ある笑み','surprised':'静かに訝しむ','troubled':'眉と口元に出る呆れ','serious':'相手を見て確かめる'},
 'finn':{'neutral':'穏やかに話す','smile':'目を合わせた控えめな微笑み','surprised':'静かな驚き','troubled':'言葉をのみ込む困り顔','serious':'落ち着いて説明する目'},
 'hugo':{'neutral':'気さくに話す','smile':'頬と目尻で豪快に笑う','surprised':'眉を上げて声を荒らげる','troubled':'困り果てる','serious':'短く警告する','laugh':'大笑い'}
}
def trim(im):
 bbox=im.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
 return im.crop(bbox) if bbox else im

def fitted(im,size):
 im=trim(im);w,h=size;scale=min(w/im.width,h/im.height)
 im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',size);canvas.alpha_composite(im,((w-im.width)//2,h-im.height));return canvas

def encoded(im,path):im.save(path,quality=95,method=5)

def record(file,**more):return {'file':file,'sha256':hashlib.sha256((ROOT/file).read_bytes()).hexdigest(),**more}

OUT.mkdir(parents=True,exist_ok=True);manifest={};provenance=[]
for char,entries in SOURCES.items():
 base=Image.open(PROJECT/'assets'/f'{char}-normal-portrait.webp');size=base.size
 frames={}
 for file,cells in entries:
  sheet=Image.open(ROOT/file).convert('RGBA');sw,sh=sheet.size
  for column,expression in cells.items():
   cell=sheet.crop((round(column*sw/2),0,round((column+1)*sw/2),sh))
   frame=fitted(cell,size);path=OUT/f'{char}-{expression}-portrait.webp';encoded(frame,path)
   assert expression not in frames;frames[expression]=str(path.relative_to(PROJECT))
  provenance.append(record(file,character=char,cells=cells))
 assert set(frames)=={'smile','surprised','troubled','serious'}
 manifest[char]={'width':size[0],'height':size[1],'variants':['smile','surprised','troubled','serious'],'frames':frames,'neutral':f'assets/{char}-normal-portrait.webp','revision':'portraits-v8','labels':LABELS[char]}
# One redesigned neutral supplies all of Noa's normal portraits and menu thumbnails.
size=(manifest['noa']['width'],manifest['noa']['height'])
neutral=fitted(Image.open(ROOT/NOA_MASTER).convert('RGBA'),size);encoded(neutral,PROJECT/'assets'/'noa-normal-portrait.webp')
body=neutral.copy();body.thumbnail((500,1000),Image.Resampling.LANCZOS);encoded(body,PROJECT/'assets'/'noa-normal-body.webp')
face=neutral.crop((0,0,neutral.width,round(neutral.height*.49)));face.thumbnail((300,320),Image.Resampling.LANCZOS);encoded(face,PROJECT/'assets'/'noa-normal-face.webp')
provenance.append(record(NOA_MASTER,character='noa',purpose='Distinct neutral face and normal menu artwork'))
(OUT/'provenance.json').write_text(json.dumps({'revision':'portraits-v8','method':'Each cell is a complete generated character portrait. Technical bounding crop, proportional resize, transparent padding and high-quality WebP encoding only. No original head, face, hand or collar is layered beneath it.','sources':provenance,'acting':LABELS,'noa_identity':'Longer face and chin, straighter nose and brows, narrow jade eyes, cooler skin; Rine retains rounder cheeks and large amber eyes.','legacy':'assets/expressions contains retired v4/v5 heads only for compatibility. The current game never requests them.'},ensure_ascii=False,indent=2)+'\n')
(PROJECT/'expressions.js').write_text('/* Complete portrait frames; dialogue renders exactly one image. */\n(function(root){const data='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';if(typeof module===\'object\'&&module.exports)module.exports=data;else root.TomoriExpressions=data;})(globalThis);\n')
print('Prepared 20 complete portraits and redesigned Noa; portrait bytes:',sum(p.stat().st_size for p in OUT.iterdir()))
