"""Run an HTTP server first. Requires Python Playwright and Chromium.
LOOK_URL / LOOK_ARTIFACTS override the URL and screenshot output path.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os,shutil
BASE=os.environ.get('LOOK_URL','http://127.0.0.1:8000/meohanasuna/');OUT=Path(os.environ.get('LOOK_ARTIFACTS','/tmp/meohanasuna-browser'));OUT.mkdir(parents=True,exist_ok=True)
def snap(q):return q.evaluate('LookGame.snapshot()')
def obj(q,name):q.locator(f'[data-object={name}]').click()
def shut(q):q.locator('#close-inspect').click()
def room(q,name):q.locator(f'[data-room={name}]').click()
def peek(q,c):
 r=q.locator('#watch').bounding_box();s=c.new_cdp_session(q);s.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2}]});assert snap(q)['peeking'];before=snap(q)['state']['distance'];q.wait_for_timeout(550);assert snap(q)['state']['distance']==before;s.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert not snap(q)['peeking'];s.detach()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or None,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);q=c.new_page();errors=[];bad=[];q.on('pageerror',lambda e:errors.append(str(e)));q.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 else None);q.goto(BASE);q.locator('#new-game').click();q.wait_for_selector('#intro:not([hidden])');
 for _ in range(3):q.locator('#intro-next').click()
 before=snap(q)['state']['distance'];q.wait_for_timeout(400);assert snap(q)['state']['distance']==before;obj(q,'notice');q.wait_for_timeout(250);assert snap(q)['state']['distance']<before;assert '17時30分' in q.locator('#panel-body').inner_text();peek(q,c);assert snap(q)['panel']=='notice';print('Actual gaze rule, native long-press inspection interruption/resume, and readable clue passed.',flush=True)
 shut(q);room(q,'classroom');obj(q,'seats');assert q.locator('.seat').all_inner_texts()==['5','8','2','6','7','1'];shut(q);obj(q,'diary');assert '20分前' in q.locator('#panel-body').inner_text();shut(q);obj(q,'drawer');
 for n in ['2','7']:q.locator(f'[data-key="{n}"]').click()
 peek(q,c);assert '2 7' in q.locator('#digits').inner_text()
 for n in ['8','6','開ける']:q.locator(f'[data-key="{n}"]').click()
 assert snap(q)['state']['flags']['teacherKey'];assert snap(q)['state']['distance']>99;print('Seat order deduction, real keypad, retained partial digits and checkpoint retreat passed.',flush=True)
 shut(q);room(q,'office');obj(q,'power');q.locator('[data-tile="0"]').click();wires=snap(q)['state']['wires'];q.locator('#pause-button').click();before=snap(q)['state']['distance'];q.wait_for_timeout(350);assert snap(q)['state']['distance']==before;q.locator('#home').click();q.reload();q.locator('#continue').click();q.wait_for_function('LookGame.snapshot().active');assert snap(q)['state']['wires']==wires;assert snap(q)['state']['flags']['teacherKey'];obj(q,'power')
 for i in range(9):
  while snap(q)['state']['wires'][i]!=0:q.locator(f'[data-tile="{i}"]').click()
 assert q.evaluate('LookCore.connected(LookGame.snapshot().state)');q.locator('#power-submit').click();assert snap(q)['state']['flags']['power'];q.screenshot(path=str(OUT/'power.png'));print('Actual rotating circuits, pause, mid-puzzle save/reload and power restoration passed.',flush=True)
 shut(q);obj(q,'key');q.locator('#panel-body button').click();assert snap(q)['state']['flags']['exitKey'];shut(q);room(q,'corridor');obj(q,'gate');q.locator('#clock-hour').select_option('17');q.locator('#clock-minute').select_option('10');q.locator('#panel-body .primary').click();assert snap(q)['state']['flags']['clock'];q.locator('#panel-body .primary').click();assert snap(q)['state']['ending']=='alone';q.screenshot(path=str(OUT/'ending-alone.png'));q.locator('#ending-retry').click();assert snap(q)['state']['flags']['clock'];assert snap(q)['state']['status']=='playing';room(q,'office');obj(q,'archive');assert '朝倉 澪' in q.locator('#panel-body').inner_text();assert snap(q)['state']['flags']['archive'];shut(q);room(q,'corridor');obj(q,'gate');q.locator('#panel-body .secondary').click();assert snap(q)['state']['ending']=='remember';q.screenshot(path=str(OUT/'ending-remember.png'));print('Clock deduction, real door, both endings, optional archive discovery and exit replay passed.',flush=True)
 q.locator('#ending-home').click();q.locator('#title-endings').click();assert q.locator('.record button').count()==2;q.locator('.record button').first.click();assert q.locator('#ending-retry').is_hidden();assert '読み返' in q.locator('#ending-stats').inner_text();q.locator('#ending-home').click();q.locator('#new-game').click();q.locator('[data-close=new-confirm]').click();assert q.evaluate('JSON.parse(localStorage.getItem("meohanasuna-save-v1")).ending')=='remember';assert not errors,errors;assert not bad,bad;print('Ending collection, replay safety, new-game cancellation and all assets/no JS errors passed.',flush=True)
 c.close()
 # A legitimate late checkpoint fixture exercises defeat/retry without a three-minute wait.
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);q=c.new_page();q.goto(BASE);q.evaluate('()=>{const s=LookCore.fresh();for(let i=0;i<3;i++)LookCore.act(s,"intro");LookCore.act(s,"room","classroom");LookCore.act(s,"drawer","2786");s.distance=.02;localStorage.setItem("meohanasuna-save-v1",JSON.stringify(s));}');q.reload();q.locator('#continue').click();q.wait_for_selector('#caught-screen:not([hidden])');assert snap(q)['state']['deaths']==1;q.screenshot(path=str(OUT/'caught.png'));q.locator('#retry').click();assert snap(q)['state']['status']=='playing';assert snap(q)['state']['distance']==100;assert snap(q)['state']['flags']['teacherKey'];print('Real catch and retry preserve the checkpoint and restore safe distance.',flush=True);b.close()
