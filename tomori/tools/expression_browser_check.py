"""Dialogue acting, responsive face registration and read-only replay checks.
Run a static server first. Requires Playwright and Chromium, as browser_check.py.
"""
import argparse,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8006/tomori/?v=10');ap.add_argument('--out',default='/tmp/tomori-expression-check');args=ap.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
KEY='sword-sale-v1'

def load_story(context,id,index,speed='instant'):
 p=context.new_page();p.goto(args.url)
 p.evaluate('''({id,index,speed})=>{const s=TomoriCore.fresh();s.story={id,index};s.view='story';if(id!=='intro'){s.next=6;s.route='help';if(['honest','barter'].includes(id))s.deal=id}localStorage.setItem('sword-sale-v1',JSON.stringify(s));localStorage.setItem('tomori-preferences-v1',JSON.stringify({reduced:false,speed,guideSeen:true}))}''',{'id':id,'index':index,'speed':speed})
 p.reload();p.locator('#continue').click();return p

def expect_face(p,character,expression):
 p.wait_for_function("""({character,expression})=>{const im=document.getElementById('story-character');return im.dataset.character===character&&im.dataset.expression===expression&&im.complete&&im.naturalHeight>=900&&!im.hidden}""",arg={'character':character,'expression':expression})
 assert p.locator('#story > img').count()==1
 assert p.locator('#story-face-layer,#story-face').count()==0
 p.wait_for_timeout(35)

with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
 errors=[];bad=[];retired=[]
 c.on('request',lambda r:retired.append(r.url) if '/assets/expressions/' in r.url else None)
 c.on('page',lambda p:p.on('pageerror',lambda e:errors.append(str(e))))
 c.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 else None)
 # Timed reaction, saving and restoring the same line, and tap-to-complete.
 p=load_story(c,'intro',7,'normal');expect_face(p,'rine','serious')
 p.screenshot(path=str(out/'news-before.png'))
 expect_face(p,'rine','surprised');p.screenshot(path=str(out/'news-surprised.png'))
 p.reload();p.locator('#continue').click();expect_face(p,'rine','serious')
 p.locator('#story-line').click();expect_face(p,'rine','surprised')
 assert 'rine-surprised-portrait.webp' in p.locator('#story-character').get_attribute('src')
 assert p.evaluate("JSON.parse(localStorage.getItem('sword-sale-v1')).story.index")==7
 p.close()
 # Ash's unguarded boast ends in an awkward realization, not another round surprise.
 p=load_story(c,'barter',2,'normal');expect_face(p,'ash','smile')
 p.locator('#story-line').click();expect_face(p,'ash','troubled')
 p.screenshot(path=str(out/'ash-realization.png'));p.close()
 # Every expression is one independently complete image, never a head/body overlay.
 p=load_story(c,'intro',7)
 expect_face(p,'rine','surprised')
 p.evaluate("""()=>{window.preview=new TomoriPortraits.View(document.getElementById('story-character'),TomoriExpressions)}""")
 for char in ['rine','ash','noa','finn','hugo']:
  for exp in ['neutral','smile','surprised','troubled','serious']:
   p.evaluate("({char,exp})=>window.preview.show(char,exp,char)",{'char':char,'exp':exp});expect_face(p,char,exp)
   src=p.locator('#story-character').get_attribute('src')
   revision=p.evaluate('(char)=>TomoriExpressions[char].revision',char)
   assert '-portrait.webp?v='+revision in src
   if exp!='neutral':assert src==f'assets/portraits/{char}-{exp}-portrait.webp?v={revision}'
   size=p.locator('#story-character').evaluate('(im)=>[im.naturalWidth,im.naturalHeight]')
   expected=p.evaluate('(char)=>[TomoriExpressions[char].width,TomoriExpressions[char].height]',char)
   assert size==expected,(char,exp,size,expected)
   p.screenshot(path=str(out/f'{char}-{exp}.png'))
  p.evaluate("()=>window.preview.hide()");assert p.locator('#story-character').is_hidden()
  p.evaluate("char=>window.preview.show(char,'serious',char)",char);expect_face(p,char,'serious')
 for width,height in [(320,568),(390,660),(390,844),(430,932),(844,390)]:
  p.set_viewport_size({'width':width,'height':height})
  for evidence in ['true','false']:
   p.evaluate("e=>document.getElementById('story').dataset.evidence=e",evidence)
   for char in ['finn','noa']:
    p.evaluate("char=>window.preview.show(char,'serious',char)",char);expect_face(p,char,'serious')
    assert p.locator('#story > img:visible').count()==1
    p.screenshot(path=str(out/f'single-image-{char}-{width}-{evidence}.png'))
 p.close()
 # Existing Hugo's complete laughing pose remains available.
 p=load_story(c,'honest',1);p.wait_for_function("()=>document.getElementById('story-character').dataset.expression==='laugh'")
 assert 'assets/hugo-laugh-portrait.webp' in p.locator('#story-character').get_attribute('src')
 assert p.locator('#story > img:visible').count()==1;p.close()
 # Journal replay never enters battles, changes choices, or awards money.
 p=c.new_page();p.goto(args.url)
 p.evaluate('''()=>{const s=TomoriCore.fresh();s.story=null;s.view='camp';s.seen=['intro','trail','fork','ending'];localStorage.setItem('sword-sale-v1',JSON.stringify(s));localStorage.setItem('tomori-preferences-v1',JSON.stringify({reduced:false,speed:'instant',guideSeen:true}))}''')
 p.reload();p.locator('#continue').click();before=p.evaluate('(k)=>localStorage.getItem(k)',KEY)
 for id in ['intro','intro','trail','fork','ending']:
  p.locator('#journal-open').click() if not p.locator('#journal-dialog').is_visible() else None
  p.locator(f'[data-read={id}]').click();p.locator('#replay-story').click()
  if id=='intro':expect_face(p,'rine','smile')
  assert p.locator('#story-place').inner_text().startswith('振り返り')
  for _ in range(20):
   assert p.locator('#story-choices').is_hidden()
   if p.locator('#story-next').inner_text()=='見返しを終える':break
   p.locator('#story-next').click()
  p.screenshot(path=str(out/f'replay-{id}.png'))
  p.locator('#story-next').click();assert p.locator('#journal-dialog').is_visible()
  assert p.locator('#app').get_attribute('data-screen')=='hub'
  assert p.evaluate('(k)=>localStorage.getItem(k)',KEY)==before
 p.locator('[data-read=intro]').click();p.locator('#replay-story').click();expect_face(p,'rine','smile');p.locator('#story-skip').click();assert p.locator('#journal-dialog').is_visible()
 p.locator('[data-close=journal-dialog]').click();p.reload();p.locator('#continue').click()
 assert p.locator('#app').get_attribute('data-screen')=='hub'
 assert json.loads(p.evaluate('(k)=>localStorage.getItem(k)',KEY))==json.loads(before)
 assert not errors,errors
 assert not bad,bad
 assert not retired,retired
 c.close();b.close()
print('20 complete expression portraits: exactly one displayed image, no old head/mask requests, natural-size frames, timed reactions, responsive layouts, neutral/laugh fallback, reload and read-only replay passed.')
