"""Optional browser integration test. Start npm run preview first.
Requires Python playwright and Chromium. UTA_BASE_URL / UTA_ARTIFACTS override defaults.
Uses real touch input and production DOM controls; does not bypass game progression.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,math,os,shutil
BASE=os.environ.get('UTA_BASE_URL','http://127.0.0.1:4173/');OUT=Path(os.environ.get('UTA_ARTIFACTS','/tmp/utanokuni-browser-tests'));OUT.mkdir(parents=True,exist_ok=True);KEY='utanokuni-save-v1'
def state(q):return q.evaluate('JSON.parse(localStorage.getItem("'+KEY+'"))')
def at(q,x,y):
 r=q.locator('canvas').bounding_box();return r['x']+r['width']*x/540,r['y']+r['height']*y/860
def tap(q,x,y):
 px,py=at(q,x,y);q.touchscreen.tap(px,py)
def finish(q,choice=0):
 guard=0
 while q.locator('#conversation').is_visible():
  guard+=1;assert guard<25
  if q.locator('#dialogue-choices').is_visible():q.locator('#dialogue-choices button').nth(choice).click()
  else:q.locator('#next-line').click()
def wait_dialog(q,name=None):
 q.wait_for_function('document.querySelector("#conversation").open',timeout=18000)
 if name:assert q.locator('#speaker').inner_text()==name

def nearby(q,label):
 q.locator('#book-button').click();q.locator('[data-page=nearby]').click();q.locator('#nearby-list button').filter(has_text=label).click()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or None,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);q=c.new_page();errors=[];bad=[];req=[];q.on('pageerror',lambda e:errors.append(str(e)));q.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 else None);q.on('request',lambda r:req.append(r.url));q.goto(BASE);q.evaluate('document.fonts.ready');assert not any('create-game-' in u for u in req),'Phaser is loaded only when opening the book';assert not any('.mp3' in u for u in req)
 q.locator('#title-settings').click();q.locator('#setting-speed').select_option('instant');q.locator('[data-close=settings]').click();q.locator('#new-game').click();wait_dialog(q);finish(q);q.wait_for_function('document.querySelector("#loading").hidden');assert not bad,bad
 initial=state(q)['position'];tap(q,270,650);q.wait_for_timeout(180);mid=state(q)['position'];assert math.hypot(mid['x']-270,mid['y']-650)>20,'walking must not teleport';q.wait_for_function('Math.hypot(JSON.parse(localStorage.getItem("utanokuni-save-v1")).position.x-270,JSON.parse(localStorage.getItem("utanokuni-save-v1")).position.y-650)<24');print('Real touch movement, initial loading and deferred Phaser passed.',flush=True)
 tap(q,302,385);wait_dialog(q,'ウタウサギ');pos=state(q)['position'];assert math.hypot(pos['x']-276,pos['y']-506)<25;assert not state(q)['flags']['metRabbit'];q.screenshot(path=str(OUT/'rabbit-conversation.png'));finish(q,1);assert state(q)['flags']['metRabbit'];print('NPC touch auto-approach and real branching conversation passed.',flush=True)
 tap(q,171,658);wait_dialog(q,'あなた');finish(q);assert state(q)['inventory']==['leaf'];q.locator('#inventory-button').click();assert q.locator('.item-tile').count()==1;q.screenshot(path=str(OUT/'inventory.png'))
 # Real CDP touch drag, from the item tile to the book painted in the world.
 tile=q.locator('.item-tile').bounding_box();sx=tile['x']+tile['width']/2;sy=tile['y']+tile['height']/2;tx,ty=at(q,467,553);session=c.new_cdp_session(q)
 session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy}]})
 for i in range(1,9):session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':sx+(tx-sx)*i/8,'y':sy+(ty-sy)*i/8}]});q.wait_for_timeout(45)
 session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});wait_dialog(q,'あなた');assert state(q)['activeDialogue']['id']=='bookmark';q.locator('#next-line').click();cursor=state(q)['activeDialogue'];assert cursor['index']==1
 q.reload();assert q.locator('#continue-game').is_visible();q.locator('#continue-game').click();wait_dialog(q);assert state(q)['activeDialogue']==cursor;finish(q);assert state(q)['flags']['bookmark'];assert state(q)['inventory']==[];print('Real touch item drag/use, in-dialogue save/reload, consumption and scene flag passed.',flush=True)
 tap(q,270,121);q.wait_for_function('document.querySelector("#area-name").textContent==="どんぐり広場"',timeout=18000);q.wait_for_timeout(400);assert state(q)['flags']['arrivedClearing'];tap(q,310,390);wait_dialog(q,'どんぐり');finish(q);assert state(q)['flags']['metAcorn'];q.screenshot(path=str(OUT/'clearing.png'));print('Actual exit walking, area transition, acorn dialogue and quest progression passed.',flush=True)
 nearby(q,'小さな椅子');wait_dialog(q);finish(q);nearby(q,'小さな椅子');wait_dialog(q);assert state(q)['activeDialogue']['id']=='chair-again';finish(q);nearby(q,'切り株の扉');wait_dialog(q);finish(q);nearby(q,'白く途切れた道');wait_dialog(q);assert state(q)['activeDialogue']['id']=='unfinished';finish(q)
 tap(q,270,807);q.wait_for_function('document.querySelector("#area-name").textContent==="森の入口"',timeout=18000);q.wait_for_timeout(400);tap(q,302,385);wait_dialog(q);finish(q);tap(q,302,385);wait_dialog(q);assert q.locator('#skip-seen').is_visible();q.locator('#skip-seen').click();assert not q.locator('#conversation').is_visible();q.locator('#book-button').click();q.locator('[data-page=notes]').click();assert '帰り道' in q.locator('#notes').inner_text();q.locator('[data-close=storybook]').click();assert state(q)['flags']['metAcorn'];assert state(q)['flags']['bookmark'];assert not errors,errors;assert not bad,bad;print('Conditional investigations, honest scope boundary, return route, known-text skip, journal and no broken assets passed.',flush=True)
 q.locator('#header-settings').click();q.locator('#back-title').click();before=q.evaluate('localStorage.getItem("'+KEY+'")');q.locator('#new-game').click();q.locator('[data-close=confirm-new]').click();assert q.evaluate('localStorage.getItem("'+KEY+'")')==before;assert not errors,errors;b.close()
