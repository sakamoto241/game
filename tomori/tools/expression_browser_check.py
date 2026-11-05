"""Dialogue acting, responsive face registration and read-only replay checks.
Run a static server first. Requires Playwright and Chromium, as browser_check.py.
"""
import argparse,json,os
from pathlib import Path
from PIL import Image,ImageChops
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8006/tomori/?v=4');ap.add_argument('--out',default='/tmp/tomori-expression-check');args=ap.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
KEY='sword-sale-v1'

def load_story(context,id,index,speed='instant'):
 p=context.new_page();p.goto(args.url)
 p.evaluate('''({id,index,speed})=>{const s=TomoriCore.fresh();s.story={id,index};s.view='story';if(id!=='intro'){s.next=6;s.route='help';if(id==='honest')s.deal='honest'}localStorage.setItem('sword-sale-v1',JSON.stringify(s));localStorage.setItem('tomori-preferences-v1',JSON.stringify({reduced:false,speed,guideSeen:true}))}''',{'id':id,'index':index,'speed':speed})
 p.reload();p.locator('#continue').click();return p

def expect_face(p,character,expression):
 p.wait_for_function('''({character,expression})=>{const base=document.getElementById('story-character'),face=document.getElementById('story-face'),layer=document.getElementById('story-face-layer');return base.dataset.character===character&&base.dataset.expression===expression&&base.complete&&base.naturalWidth>1&&face.complete&&face.naturalWidth>1&&!layer.hidden}''',arg={'character':character,'expression':expression})
 p.wait_for_timeout(35)

with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
 errors=[];bad=[]
 c.on('page',lambda p:p.on('pageerror',lambda e:errors.append(str(e))))
 c.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 else None)
 # Timed reaction, saving and restoring the same line, and tap-to-complete.
 p=load_story(c,'intro',7,'normal');expect_face(p,'rine','serious')
 p.screenshot(path=str(out/'news-before.png'))
 expect_face(p,'rine','surprised');p.screenshot(path=str(out/'news-surprised.png'))
 p.reload();p.locator('#continue').click();expect_face(p,'rine','serious')
 p.locator('#story-line').click();expect_face(p,'rine','surprised')
 assert p.locator('#story-character').get_attribute('src')=='assets/rine-normal-portrait.webp'
 assert p.evaluate("JSON.parse(localStorage.getItem('sword-sale-v1')).story.index")==7
 p.close()
 # Real body remains fixed across every expression, including resize/evidence shifts.
 p=load_story(c,'intro',7)
 expect_face(p,'rine','surprised')
 p.evaluate('''()=>{window.preview=new TomoriPortraits.View(document.getElementById('story-character'),document.getElementById('story-face-layer'),document.getElementById('story'),TomoriExpressions)}''')
 for char in ['rine','ash','noa','finn','hugo']:
  screenshots=[]
  for exp in ['smile','surprised','troubled','serious']:
   p.evaluate('''({char,exp})=>window.preview.show(char,exp,char)''',{'char':char,'exp':exp});expect_face(p,char,exp)
   assert p.locator('#story-character').get_attribute('src')==f'assets/{char}-normal-portrait.webp'
   assert p.locator('#story-face').get_attribute('src')==f'assets/expressions/{char}-{exp}.webp'
   screenshots.append(p.screenshot(path=str(out/f'{char}-{exp}.png')))
  # Different faces must visibly differ; pixels below the layer must stay identical.
  import io
  a=Image.open(io.BytesIO(screenshots[0])).convert('RGB');z=Image.open(io.BytesIO(screenshots[1])).convert('RGB')
  assert ImageChops.difference(a,z).getbbox(),f'{char}: expression did not render'
  layer=p.locator('#story-face-layer').bounding_box();cut=min(a.height,round(layer['y']+layer['height'])+2)
  assert not ImageChops.difference(a.crop((0,cut,a.width,a.height)),z.crop((0,cut,z.width,z.height))).getbbox(),f'{char}: body changed'
  # Original pose works, then restoring the same layered cue after hide works.
  p.evaluate("()=>window.preview.hide()")
  p.evaluate("char=>window.preview.show(char,'serious',char)",char);expect_face(p,char,'serious')
  p.evaluate("char=>window.preview.show(char,'neutral',char)",char)
  p.wait_for_function("()=>document.getElementById('story-character').dataset.expression==='neutral'")
  assert p.locator('#story-face-layer').is_hidden()
 for width,height in [(320,568),(390,844),(430,932),(844,390)]:
  p.set_viewport_size({'width':width,'height':height})
  for evidence in ['true','false']:
   p.evaluate("e=>document.getElementById('story').dataset.evidence=e",evidence)
   p.evaluate("()=>window.preview.show('rine','smile','リネ')");expect_face(p,'rine','smile')
   alignment=p.evaluate('''()=>{const base=document.getElementById('story-character'),face=document.getElementById('story-face-layer'),r=base.getBoundingClientRect(),f=face.getBoundingClientRect(),s=Math.min(r.width/base.naturalWidth,r.height/base.naturalHeight);return {dx:f.x-(r.x+(r.width-base.naturalWidth*s)/2),dy:f.y-(r.y+r.height-base.naturalHeight*s),dw:f.width-base.naturalWidth*s,dh:f.height-TomoriExpressions.rine.headHeight*s}}''')
   assert all(abs(v)<1 for v in alignment.values()),(width,height,evidence,alignment)
 p.close()
 # Existing Hugo's full laughing pose remains available.
 p=load_story(c,'honest',1);p.wait_for_function("()=>document.getElementById('story-character').dataset.expression==='laugh'")
 assert p.locator('#story-character').get_attribute('src')=='assets/hugo-laugh-portrait.webp'
 assert p.locator('#story-face-layer').is_hidden();p.close()
 # Journal replay never enters battles, changes choices, or awards money.
 p=c.new_page();p.goto(args.url)
 p.evaluate('''()=>{const s=TomoriCore.fresh();s.story=null;s.view='camp';s.seen=['intro','trail','fork','ending'];localStorage.setItem('sword-sale-v1',JSON.stringify(s));localStorage.setItem('tomori-preferences-v1',JSON.stringify({reduced:false,speed:'instant',guideSeen:true}))}''')
 p.reload();p.locator('#continue').click();before=p.evaluate('(k)=>localStorage.getItem(k)',KEY)
 for id in ['intro','intro','trail','fork','ending']:
  p.locator('#journal-open').click() if not p.locator('#journal-dialog').is_visible() else None
  p.locator(f'[data-read={id}]').click();p.locator('#replay-story').click()
  if id=='intro':expect_face(p,'rine','serious')
  assert p.locator('#story-place').inner_text().startswith('振り返り')
  for _ in range(20):
   assert p.locator('#story-choices').is_hidden()
   if p.locator('#story-next').inner_text()=='見返しを終える':break
   p.locator('#story-next').click()
  p.screenshot(path=str(out/f'replay-{id}.png'))
  p.locator('#story-next').click();assert p.locator('#journal-dialog').is_visible()
  assert p.locator('#app').get_attribute('data-screen')=='hub'
  assert p.evaluate('(k)=>localStorage.getItem(k)',KEY)==before
 p.locator('[data-read=intro]').click();p.locator('#replay-story').click();expect_face(p,'rine','serious');p.locator('#story-skip').click();assert p.locator('#journal-dialog').is_visible()
 p.locator('[data-close=journal-dialog]').click();p.reload();p.locator('#continue').click()
 assert p.locator('#app').get_attribute('data-screen')=='hub'
 assert json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY))==json.loads(before)
 assert not errors,errors
 assert not bad,bad
 c.close();b.close()
print('Expressions: 20 rendered layers; shared bodies; timed reaction; reload; responsive alignment; neutral/laugh fallback; read-only journal replay passed.')
