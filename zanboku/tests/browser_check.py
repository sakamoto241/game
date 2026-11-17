"""Chromium portrait/touch integration check. Requires Python Playwright + Chromium.
Run: ZANBOKU_URL=http://127.0.0.1:8017 python tests/browser_check.py
No live website or public save data is modified.
"""
import json,os,time
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('ZANBOKU_URL','http://127.0.0.1:8017').rstrip('/')+'/?test'
OUT=Path(os.environ.get('ZANBOKU_ARTIFACTS','/workspace/artifacts/zanboku'));OUT.mkdir(parents=True,exist_ok=True)
log={'page_errors':[],'failed_requests':[],'checks':[]}
def check(name,condition):
 if not condition:
  log['failure']=name
  log['failure_state']=page.evaluate('({mode:__zanboku.game.mode,hp:__zanboku.game.player.hp,time:__zanboku.game.time,paused:document.hidden})')
  page.screenshot(path=str(OUT/'failure.png'))
  (OUT/'failure.json').write_text(json.dumps(log,ensure_ascii=False,indent=2))
 assert condition,name
 log['checks'].append(name);print('PASS',name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=user-gesture-required'])
 ctx=b.new_context(viewport={'width':390,'height':740},device_scale_factor=2,is_mobile=True,has_touch=True)
 page=ctx.new_page();page.on('pageerror',lambda e:log['page_errors'].append(str(e)));page.on('requestfailed',lambda r:log['failed_requests'].append(r.url))
 page.goto(URL,wait_until='networkidle');page.screenshot(path=str(OUT/'title.png'))
 check('title starts in portrait; sound not started before gesture',page.locator('#title').is_visible() and page.evaluate('__zanboku.sound.ctx===null'))
 page.locator('#howBtn').tap();check('instructions open',page.locator('#help').is_visible());page.locator('#helpClose').tap()
 for width,height in [(390,740),(393,659),(360,580),(375,812),(430,932),(1280,900)]:
  page.set_viewport_size({'width':width,'height':height})
  r=page.locator('#start').bounding_box();check(f'start visible in {width}x{height}',r['x']>=0 and r['y']>=0 and r['x']+r['width']<=width+1 and r['y']+r['height']<=height+1)
 page.set_viewport_size({'width':390,'height':740});page.locator('#start').tap();page.wait_for_timeout(1000)
 check('one tap starts first wave and audio',page.evaluate('__zanboku.game.mode==="playing"&&__zanboku.game.wave===1&&__zanboku.sound.ctx.state==="running"'))
 check('all original character and background assets loaded',page.evaluate('Object.keys(__zanboku.paint.images).length===10'))
 for width,height in [(390,740),(393,659),(360,580),(430,932),(1280,900)]:
  page.set_viewport_size({'width':width,'height':height})
  for id in ['stick','slash','dash','seal','pauseBtn','soundBtn']:
   r=page.locator('#'+id).bounding_box();check(f'{id} in bounds {width}x{height}',r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=width+1 and r['y']+r['height']<=height+1)
 page.set_viewport_size({'width':390,'height':740})
 page.locator('#soundBtn').tap();check('mute changes real master gain',page.evaluate('!__zanboku.sound.enabled'))
 # CDP sends two simultaneous real touch contacts, not two sequential clicks.
 cdp=ctx.new_cdp_session(page)
 def point(id,x,y):return {'id':id,'x':x,'y':y,'radiusX':6,'radiusY':6,'force':1}
 r=page.locator('#stick').bounding_box();sx=r['x']+r['width']/2;sy=r['y']+r['height']/2
 r=page.locator('#dash').bounding_box();dx=r['x']+r['width']/2;dy=r['y']+r['height']/2
 p0=page.evaluate('({x:__zanboku.game.player.x,y:__zanboku.game.player.y})')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point(1,sx,sy)]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[point(1,sx+25,sy-25)]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point(1,sx+25,sy-25),point(2,dx,dy)]})
 page.wait_for_timeout(250)
 check('simultaneous movement + dash leaves real paint',page.evaluate('__zanboku.game.lines.length===1') and page.evaluate('__zanboku.game.player.x')>p0['x']+50)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});page.wait_for_timeout(50)
 check('touch cancel releases movement and action',page.evaluate('Math.hypot(__zanboku.input().x,__zanboku.input().y)===0'))
 page.locator('#pauseBtn').tap();life=page.evaluate('__zanboku.game.lines[0].life');page.wait_for_timeout(500)
 check('pause freezes paint lifetime',page.evaluate('__zanboku.game.lines[0].life')==life)
 page.locator('#pauseHelp').tap();page.locator('#helpClose').tap();page.locator('#resume').tap();check('pause help resumes correct screen',page.evaluate('__zanboku.game.mode==="playing"'))
 page.keyboard.down('w');page.evaluate('window.dispatchEvent(new Event("blur"))');check('blur clears held key and pauses',page.evaluate('__zanboku.game.mode==="paused"&&__zanboku.input().y===0'));page.locator('#resume').tap()
 # Retry from a real defeat, without setting HP or killing enemies in test code.
 page.locator('#pauseBtn').tap();page.locator('#pauseTitle').tap();page.locator('#start').tap()
 deadline=time.monotonic()+35
 while time.monotonic()<deadline and not page.locator('#result').is_visible():page.wait_for_timeout(250)
 check('idle player can lose and reach result',page.locator('#result').is_visible() and page.locator('#resultTitle').inner_text()=='落命')
 page.screenshot(path=str(OUT/'defeat.png'));page.locator('#retry').tap()
 check('one tap retry resets HP, kills, ink and wave',page.evaluate('__zanboku.game.player.hp===5&&__zanboku.game.kills===0&&__zanboku.game.lines.length===0&&__zanboku.game.wave===1&&__zanboku.input().x===0'))
 # Real browser play: read positions, send keyboard input. Never mutate HP, score, enemies or waves.
 held=set();seen_phase=False;seen_boss=False;start_time=time.monotonic();deadline=start_time+160
 while time.monotonic()<deadline:
  state=page.evaluate('''()=>{const g=__zanboku.game,p=g.player,live=g.enemies.filter(e=>!e.dead);const n=live.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(!n)return {mode:g.mode,keys:[],phase:g.boss?.phase};const dx=n.x-p.x,dy=n.y-p.y,d=Math.hypot(dx,dy)||1;let x=dx/d,y=dy/d;const danger=live.find(e=>e.action==='windup'&&e.timer<.78&&Math.hypot(e.x-p.x,e.y-p.y)<155);if(danger){x=-danger.dy;y=danger.dx;if(p.x<60&&x<0||p.x>370&&x>0){x=-x;y=-y;}}const keys=[];if(x>.32)keys.push('d');if(x<-.32)keys.push('a');if(y>.32)keys.push('s');if(y<-.32)keys.push('w');if(d<79&&!danger)keys.push('j');const seg=(e,l)=>{const vx=l.b.x-l.a.x,vy=l.b.y-l.a.y,t=Math.max(0,Math.min(1,((e.x-l.a.x)*vx+(e.y-l.a.y)*vy)/(vx*vx+vy*vy||1)));return Math.hypot(e.x-l.a.x-t*vx,e.y-l.a.y-t*vy)<=20+e.radius;};const hits=live.filter(e=>g.lines.some(l=>seg(e,l)));const two=live.some(e=>e.kind==='boss'&&g.lines.filter(l=>seg(e,l)).length===2);return {mode:g.mode,keys,phase:g.boss?.phase,dash:p.dashCD<=0&&(danger||d>70&&d<190||n.kind==='boss'&&d<100),seal:p.dashTime<=0&&g.lines.length>0&&(two||hits.filter(e=>e.kind!=='boss').length>=5||g.lines.some(l=>l.life<.5)),wave:g.wave,hp:p.hp,kills:g.kills,time:g.time,best:g.bestSeal};}''')
  if state['mode']=='bossintro':
   for k in held:page.keyboard.up(k)
   held=set();page.screenshot(path=str(OUT/'boss-introduction.png'));page.locator('#bossStart').tap();seen_boss=True;continue
  if state.get('phase')==1 and not seen_phase:
   seen_phase=True;page.screenshot(path=str(OUT/'boss-second-phase.png'))
  if state['mode'] in ['victory','defeat']:break
  want=set(state['keys'])
  for k in held-want:page.keyboard.up(k)
  for k in want-held:page.keyboard.down(k)
  held=want
  if state.get('dash'):page.keyboard.press('k')
  if state.get('seal'):page.keyboard.press('l')
  if state.get('kills',0)>10 and not (OUT/'battle-played.png').exists():page.screenshot(path=str(OUT/'battle-played.png'))
  page.wait_for_timeout(80)
 for k in held:page.keyboard.up(k)
 page.wait_for_timeout(1000)
 final=page.evaluate('({mode:__zanboku.game.mode,time:__zanboku.game.time,hp:__zanboku.game.player.hp,kills:__zanboku.game.kills,best:__zanboku.game.bestSeal,bossHp:__zanboku.game.boss?.hp})');log['played_result']=final;log['wall_seconds']=round(time.monotonic()-start_time,2)
 check('browser play reaches third wave intro',seen_boss);check('bellkeeper second phase is reached',seen_phase);check('browser play reaches victory through real controls',final['mode']=='victory');check('end result shows actual kills and best seal',page.locator('#resultKills').inner_text()==str(final['kills'])+'人' and page.locator('#resultBest').inner_text()==str(final['best'])+'人')
 page.screenshot(path=str(OUT/'victory.png'));page.locator('#retry').tap();check('victory retry also resets all battle state',page.evaluate('__zanboku.game.kills===0&&__zanboku.game.player.hp===5&&__zanboku.game.bestSeal===0&&__zanboku.game.boss===null&&__zanboku.game.lines.length===0'))
 check('no JavaScript errors',not log['page_errors']);check('no failed asset requests',not log['failed_requests'])
 log['environment']='Headless system Chromium, mobile portrait viewports, device scale 2, CDP multi-touch, actual keyboard input. Not a physical iPhone or Android.'
 (OUT/'browser-results.json').write_text(json.dumps(log,ensure_ascii=False,indent=2));print(json.dumps(log,ensure_ascii=False),flush=True);b.close()
