"""Technical registration, crop, resize and encoding of generated expression layers.
Original body art is never changed. Rendering combines these layers in the browser.
"""
from PIL import Image
from pathlib import Path
import json,hashlib
ROOT=Path('/workspace/generated_images');PROJECT=Path(__file__).resolve().parents[1];OUT=PROJECT/'assets'/'expressions'
SOURCES={'rine':('exec-03f08913-b33b-49f4-98a6-9d1ea06dfaf6.png',430),'ash':('exec-37abf2c8-27d9-48f7-8208-f81d3bcbab14.png',420),'noa':('exec-8886f1b5-5736-4899-a17a-0ffcb0cf93fd.png',465),'finn':('exec-32e59e8b-6842-4231-ad6a-a9f98744cc8e.png',450),'hugo':('exec-44881255-f9a6-4cbf-a014-ef9069f57ef4.png',420)}
LABELS={
 "rine": {
  "neutral": "気を緩めた笑顔",
  "smile": "商売用の愛想笑い",
  "surprised": "驚きを抑えて固まる",
  "troubled": "取り繕う気まずい笑み",
  "serious": "交渉相手を見据える"
 },
 "ash": {
  "neutral": "いつもの笑顔",
  "smile": "歯を見せる大笑い",
  "surprised": "声に出る大きな驚き",
  "troubled": "目をそらして気まずがる",
  "serious": "歯を食いしばる闘志"
 },
 "noa": {
  "neutral": "仲間への素直な表情",
  "smile": "片口角を上げてからかう",
  "surprised": "片眉を上げて疑う",
  "troubled": "呆れた横目",
  "serious": "細い目で状況を読む"
 },
 "finn": {
  "neutral": "穏やかに話す",
  "smile": "口元だけの静かな微笑み",
  "surprised": "眼鏡越しに静かに訝しむ",
  "troubled": "半目で言葉をのみ込む",
  "serious": "考えを整理する目"
 },
 "hugo": {
  "neutral": "気さくに話す",
  "smile": "頬と目尻で豪快に笑う",
  "surprised": "眉を上げて声を荒らげる",
  "troubled": "頬をしかめて困り果てる",
  "serious": "片目を細めて警告する",
  "laugh": "大笑い"
 }
}
OUT.mkdir(parents=True,exist_ok=True)
names=['smile','surprised','troubled','serious'];manifest={};sources=[]
for id,(file,hh) in SOURCES.items():
 base=Image.open(PROJECT/'assets'/f'{id}-normal-portrait.webp').convert('RGBA');w,h=base.size;side=max(w,hh)+32;px=(side-w)//2;py=(side-hh)//2
 head=base.crop((0,0,w,hh));head.save(OUT/f'{id}-mask.webp',quality=95,method=6)
 sheet=Image.open(ROOT/file).convert('RGBA');sw,sh=sheet.size
 for i,name in enumerate(names):
  cell=sheet.crop((round(i%2*sw/2),round(i//2*sh/2),round((i%2+1)*sw/2),round((i//2+1)*sh/2))).resize((side,side),Image.Resampling.LANCZOS)
  registered=cell.crop((px,py,px+w,py+hh));registered.save(OUT/f'{id}-{name}.webp',quality=94,method=6)
 manifest[id]={'width':w,'height':h,'headHeight':hh,'variants':names,'revision':'acting-v5','labels':LABELS[id]}
 sources.append({'character':id,'file':file,'sha256':hashlib.sha256((ROOT/file).read_bytes()).hexdigest(),'baseSha256':hashlib.sha256((PROJECT/'assets'/f'{id}-normal-portrait.webp').read_bytes()).hexdigest()})
(OUT/'provenance.json').write_text(json.dumps({'method':'Character-specific acting edits of original head references; each character has distinct brows, eyelids, gaze and mouth shapes. Technically resized/cropped to original coordinates. Browser masks retain the original silhouette and blend the lower neck onto the unchanged body.','variants':names,'sources':sources,'revision':'acting-v5','acting':LABELS},ensure_ascii=False,indent=2)+'\n')
(PROJECT/'expressions.js').write_text('/* Generated asset registration; body coordinates are unchanged. */\n(function(root){const data='+json.dumps(manifest,separators=(',',':'))+';if(typeof module===\'object\'&&module.exports)module.exports=data;else root.TomoriExpressions=data;})(globalThis);\n')
print('Prepared',len(SOURCES)*len(names),'expression layers and',len(SOURCES),'alpha masks;',sum(p.stat().st_size for p in OUT.iterdir()),'bytes')
