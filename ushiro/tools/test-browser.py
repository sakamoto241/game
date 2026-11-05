"""Optional real browser test. Start an HTTP server first; install Playwright/Chromium.
SHADOW_URL / SHADOW_ARTIFACTS override the URL and screenshot output path.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import time,json,os,shutil
BASE=os.environ.get('SHADOW_URL','http://127.0.0.1:8000/ushiro/');OUT=Path(os.environ.get('SHADOW_ARTIFACTS','/tmp/ushiro-browser'));OUT.mkdir(parents=True,exist_ok=True)
def snap(q):return q.evaluate('ShadowGame.snapshot()')
def tap(q):
 r=q.locator('#look-button').bounding_box();q.touchscreen.tap(r['x']+r['width']/2,r['y']+r['height']/2)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or None,args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,service_workers='block');q=c.new_page();errors=[];bad=[];q.on('pageerror',lambda e:errors.append(str(e)));q.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 else None);q.goto(BASE);assert not snap(q)['audio']['context'];q.locator('#normal-start').click();assert q.locator('#tutorial').is_visible();q.locator('#tutorial-play').click();q.wait_for_function('ShadowGame.snapshot().screen==="run"');q.wait_for_function('ShadowGame.snapshot().audio.audible');print('First-launch instructions and audio unlocked only by the start gesture passed.',flush=True)
 q.locator('#pause-open').click();before=snap(q)['state']['time'];q.wait_for_timeout(400);assert snap(q)['state']['time']==before;q.keyboard.press('Escape');q.wait_for_timeout(800);assert snap(q)['state']['time']>before;assert snap(q)['audio']['audible'];print('Pause and native Escape resume both gameplay and sound.',flush=True)
 # Real taps only. Read-only diagnostic identifies the same double shadow rendered on screen.
 deadline=time.time()+95
 while time.time()<deadline and snap(q)['screen']!='finish':
  s=snap(q)
  if s['state']['event'] and s['state']['event']['real'] and s['state']['event']['phase']=='active' and s['state']['event']['age']>.24 and s['state']['lookLeft']==0:tap(q)
  else:q.wait_for_timeout(70)
 s=snap(q);assert s['screen']=='finish',s;assert s['state']['phase']=='clear',s;assert s['state']['stats']['falseLooks']==0;assert s['state']['finale'];assert s['profile']['cleared'];q.screenshot(path=str(OUT/'clear.png'));assert q.locator('#result-endless').is_visible();print('Actual ~60-second normal run, all true ghosts, final anomaly, clear, score and endless unlock passed.',flush=True)
 q.locator('#result-endless').click();q.wait_for_function('ShadowGame.snapshot().screen==="run"');assert snap(q)['state']['mode']=='endless';assert snap(q)['state']['fear']==0;assert snap(q)['state']['distance']<1;print('Unlock leads into a fresh endless run.',flush=True)
 # Spam native taps; the replay really fails through fear and retries without old state.
 while snap(q)['screen']=='run':
  if snap(q)['state']['lookLeft']==0:tap(q)
  q.wait_for_timeout(80)
 s=snap(q);assert s['state']['cause']=='fear';assert s['state']['stats']['falseLooks']==4;q.screenshot(path=str(OUT/'fear-gameover.png'));q.locator('#retry').click();q.wait_for_function('ShadowGame.snapshot().screen==="run"');s=snap(q);assert s['state']['mode']=='endless';assert s['state']['fear']==0;assert s['state']['stats']['falseLooks']==0;assert not s['state']['event'];assert s['state']['distance']<1;print('Fear loss, multiple-input guard and retry reset passed.',flush=True)
 q.locator('#sound-toggle').click();assert not snap(q)['audio']['enabled'];q.locator('#sound-toggle').click();q.wait_for_function('ShadowGame.snapshot().audio.audible');q.locator('#pause-open').click();q.locator('#pause-title').click();q.locator('#catalogue-open').click();assert q.locator('.catalogue-entry:not(.locked)').count()>=3;q.locator('[data-close=catalogue]').click();q.reload();assert q.locator('#endless-start').is_visible();q.locator('#catalogue-open').click();assert q.locator('.catalogue-entry:not(.locked)').count()>=3;assert not errors,errors;assert not bad,bad;print('Sound off/on, catalogue and local records survive reload; no JS errors or 404s.',flush=True);b.close()
