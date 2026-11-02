"""Real touch integration test. Start an HTTP server first. Requires Playwright/Chromium.
CAPBALL_URL and CAPBALL_ARTIFACTS can override the defaults.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import time,json,os,shutil
BASE=os.environ.get('CAPBALL_URL','http://127.0.0.1:8000/capball.html');OUT=Path(os.environ.get('CAPBALL_ARTIFACTS','/tmp/capball-browser'));OUT.mkdir(parents=True,exist_ok=True)
def snapshot(q):return q.evaluate('CapBallGame.snapshot()')
def set_range(q,sel,n):q.locator(sel).evaluate('(e,n)=>{e.value=String(n);e.dispatchEvent(new Event("input",{bubbles:true}))}',n)
def press(q,sel):
 r=q.locator(sel).bounding_box();q.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
def swing_perfect(q):
 q.wait_for_function('CapBallGame.snapshot().phase==="flight"',timeout=10000);s=snapshot(q);set_range(q,'#aim',round(s['pitch']['target']*100));r=q.locator('#swing').bounding_box();q.wait_for_function('(()=>{const s=CapBallGame.snapshot();return s.phase==="flight"&&s.progress>=.975})()',timeout=4000,polling='raf');q.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
def throw(q,spin=0,target=0):
 q.locator(f'[data-spin="{spin}"]').click();set_range(q,'#pitch-aim',target);r=q.locator('#throw').bounding_box();q.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);q.mouse.down();q.wait_for_timeout(690);q.mouse.up()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or None,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);q=c.new_page();errors=[];bad=[];q.on('pageerror',lambda e:errors.append(str(e)));q.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 else None);q.goto(BASE);q.locator('#title-help').click();assert q.locator('#howto').is_visible();q.locator('[data-close=howto]').last.click();q.locator('#start-short').click()
 
 for attempt in range(4):
  swing_perfect(q);q.wait_for_function('CapBallGame.snapshot().phase!=="flight"',timeout=3000);q.wait_for_timeout(1400)
  if snapshot(q)['match']['stats']['homers']>=1:break
 assert snapshot(q)['match']['stats']['homers']>=1,snapshot(q);initial_score=snapshot(q)['match']['score'][0];assert initial_score>=1;print('Real touch aim + timed batting: home run and scoring passed.',flush=True);q.screenshot(path=str(OUT/'home-run.png'))
 # Pause must freeze the simulation; reload returns to a safe pitch without changing score.
 q.locator('#pause').click();before=snapshot(q)['progress'];q.wait_for_timeout(500);assert snapshot(q)['progress']==before;q.locator('#home').click();assert q.locator('#continue').is_visible();q.reload();q.locator('#continue').click();assert snapshot(q)['match']['score'][0]==initial_score;print('Pause, save/title, reload and continue passed.',flush=True)
 # Leave pitches: real strikeouts must trigger an actual half-inning transition.
 q.wait_for_function('document.querySelector("#half-break").open',timeout=85000);s=snapshot(q);assert s['match']['half']==1;assert s['match']['outs']==0;q.locator('#next-half').click();q.screenshot(path=str(OUT/'pitching.png'));print('Three actual strikeouts -> three outs -> pitching half passed.',flush=True)
 # CDP touch flick from the cap, not a debug function.
 r=q.locator('canvas').bounding_box();sx=r['x']+r['width']/2;sy=r['y']+r['height']*.78;session=c.new_cdp_session(q);q.locator('[data-spin="1"]').click();session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy}]})
 for i in range(1,8):session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':sx+20*i/7,'y':sy-110*i/7}]});q.wait_for_timeout(20)
 session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});s=snapshot(q);assert s['phase']=='flight';assert s['pitch']['spin']==1;assert s['match']['stats']['pitches']==1;assert s['pitch']['target']>0;print('Real touch flick -> curved pitch and recorded pitch passed.',flush=True)
 deadline=time.time()+135;turn=0
 while time.time()<deadline and not q.locator('#result').is_visible():
  if q.locator('#half-break').is_visible():q.locator('#next-half').click()
  s=snapshot(q)
  if s['phase']=='pitch-ready':throw(q,[-1,1,0][turn%3],[-70,70,0][turn%3]);turn+=1
  elif s['phase']=='ready' and s['match']['half']==0 and s['match']['inning']>1 and s['match']['stats']['hits']<2:
   swing_perfect(q)
  else:q.wait_for_timeout(80)
 assert q.locator('#result').is_visible(),snapshot(q);s=snapshot(q);assert s['match']['over'];assert not errors,errors;assert not bad,bad;q.screenshot(path=str(OUT/'result.png'));print('Full actual match completed:',s['match']['score'],'pitches:',s['match']['stats']['pitches'],flush=True)
 # Use the fallback sharing UI: no message is posted automatically.
 q.evaluate('Object.defineProperty(navigator,"share",{value:undefined,configurable:true});Object.defineProperty(navigator,"canShare",{value:undefined,configurable:true})');q.locator('#share').click();q.wait_for_function('!document.querySelector("#download").hidden');href=q.locator('#download').get_attribute('href');assert href.startswith('blob:');assert not errors,errors;print('Result image creation and download fallback passed.',flush=True)
 q.locator('#result-home').click();q.locator('#start-practice').click();q.wait_for_function('CapBallGame.snapshot().match.practice');swing_perfect(q);q.wait_for_function('CapBallGame.snapshot().match.stats.practiceHits>=1',timeout=4000);assert not snapshot(q)['match']['over'];print('Independent unlimited batting practice passed.',flush=True);b.close()
