"""Real touch regression for floating steering, drag combos, and quiet local wind."""
from pathlib import Path
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
import json,os,time
out=Path(os.environ.get('ZANBOKU_ARTIFACTS','/workspace/artifacts/zanboku-feel'));out.mkdir(parents=True,exist_ok=True)
url=os.environ.get('ZANBOKU_URL','http://127.0.0.1:8017').rstrip('/')+'/?test'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':740},device_scale_factor=2,is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.clock.install(time=datetime(2026,11,17,tzinfo=timezone.utc));page.clock.pause_at(datetime(2026,11,17,0,0,1,tzinfo=timezone.utc));page.goto(url,wait_until='networkidle');checks=[]
 def check(name,expression):
  if not page.evaluate(expression):
   print(page.evaluate('({mode:__zanboku.game.mode,dash:__zanboku.game.player.dashTime,lines:__zanboku.game.lines.length,queue:__zanboku.actionBuffer.pending,input:__zanboku.input(),held:[...document.querySelectorAll(".is-held")].map(b=>b.id)})'),flush=True)
   raise AssertionError(name)
  checks.append(name);print('PASS',name,flush=True)
 check('ambience never starts before user gesture','__zanboku.sound.ctx===null')
 page.locator('#start').tap();page.clock.run_for(80)
 check('wind starts with game gesture','!!__zanboku.sound.wind&&__zanboku.sound.ctx.state==="running"')
 page.evaluate('window.__windBefore=__zanboku.sound.wind');cdp=c.new_cdp_session(page)
 def pt(i,x,y):return {'id':i,'x':x,'y':y,'radiusX':5,'radiusY':5,'force':1}
 def touch(kind,points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
 r=page.locator('#stick').bounding_box();x=r['x']+r['width']*.72;y=r['y']+r['height']*.62
 touch('touchStart',[pt(1,x,y)]);page.clock.run_for(70)
 check('off-center contact does not kick the stick','__zanboku.input().x===0&&__zanboku.input().y===0')
 touch('touchMove',[pt(1,x+2,y+2)]);page.clock.run_for(30)
 check('small thumb jitter remains neutral','__zanboku.input().x===0&&__zanboku.input().y===0')
 touch('touchMove',[pt(1,x,y-40)]);page.clock.run_for(30)
 check('dragging steers normally','__zanboku.input().y<-.8')
 r=page.locator('#dash').bounding_box();dx=r['x']+r['width']/2;dy=r['y']+r['height']/2
 r=page.locator('#seal').bounding_box();lx=r['x']+r['width']/2;ly=r['y']+r['height']/2
 touch('touchStart',[pt(1,x,y-40),pt(2,dx,dy)]);page.clock.run_for(80)
 touch('touchMove',[pt(1,x,y-40),pt(2,lx,ly)]);page.clock.run_for(17)
 check('sliding a held finger buffers early sheathing','__zanboku.actionBuffer.pending?.action==="seal"&&__zanboku.input().y<-.8')
 page.clock.run_for(150)
 check('buffered sheathing connects without another tap','__zanboku.game.lines.length===0&&__zanboku.game.player.sealCD>0&&__zanboku.game.player.action==="seal"')
 time.sleep(.08)
 check('sheathing ducks wind and rain together','__zanboku.sound.ambienceBus.gain.value<.2')
 touch('touchCancel',[]);page.clock.run_for(50)
 check('cancel releases both fingers and pending input','__zanboku.input().x===0&&__zanboku.input().y===0&&__zanboku.actionBuffer.pending===null')
 page.locator('#pauseBtn').tap();page.locator('#resume').tap();page.clock.run_for(50)
 check('resume reuses wind rather than stacking loops','__windBefore===__zanboku.sound.wind')
 page.locator('#soundBtn').tap();time.sleep(.45)
 check('mute silences the complete mix','!__zanboku.sound.enabled&&__zanboku.sound.master.gain.value<.001')
 page.screenshot(path=str(out/'controls.png'))
 # An offline rendering checks the actual ambient signal; it cannot emit sound.
 wind=page.evaluate('''async()=>{
 const {createWind}=await import('./sound.js?v=4');
 const ctx=new OfflineAudioContext(2,22050*4,22050),master=ctx.createGain();master.gain.value=.38;master.connect(ctx.destination);createWind(ctx,master);
 const rendered=await ctx.startRendering();let peak=0;const rms=[];let rough=0;
 for(let c=0;c<2;c++){const a=rendered.getChannelData(c);let sum=0,diff=0;for(let i=0;i<a.length;i++){sum+=a[i]*a[i];peak=Math.max(peak,Math.abs(a[i]));if(i)diff+=(a[i]-a[i-1])**2;}rms.push(Math.sqrt(sum/a.length));if(!c)rough=Math.sqrt(diff/a.length)/rms[0];}
 return {peak,rms,rough};}''')
 assert min(wind['rms'])>1e-5 and max(wind['rms'])<.01 and wind['peak']<.06,wind
 assert wind['rough']<1,wind
 checks.append('offline wind signal is quiet, smooth, stereo and non-silent');assert not errors,errors
 (out/'feel-results.json').write_text(json.dumps({'checks':checks,'errors':errors,'wind':wind},indent=2));print(json.dumps(wind),flush=True);b.close()
