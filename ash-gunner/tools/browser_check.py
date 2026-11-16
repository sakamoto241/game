from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path('/workspace/artifacts/ash-gunner');OUT.mkdir(parents=True,exist_ok=True);URL='http://127.0.0.1:8016/ash-gunner/'
bot=Path(__file__).with_name('bot.js').read_text()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=2);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(URL);p.screenshot(path=str(OUT/'title.png'));p.locator('#practice').click();p.locator('#comic-next').wait_for(state='visible');assert p.evaluate('AshGame.state.time')==0;p.locator('#comic-next').click();p.wait_for_timeout(80)
 # Two real browser touch contacts: a held left stick and right attack, via CDP.
 cd=c.new_cdp_session(p);r=p.locator('#stick').bounding_box();q=p.locator('[data-skill=slam]').bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']/2
 left={'x':x+27,'y':y,'id':1};right={'x':q['x']+q['width']/2,'y':q['y']+q['height']/2,'id':2}
 cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[left]});p.wait_for_timeout(130);before=p.evaluate('AshGame.state.player.x');cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[left,right]});p.wait_for_timeout(130);assert p.evaluate("AshGame.state.events.some(e=>e.type==='slam')");assert p.evaluate('AshGame.state.player.x')>before;cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});p.wait_for_timeout(60);assert p.evaluate('Math.abs(AshGame.input.x)')<.01
 p.screenshot(path=str(OUT/'boss.png'))
 # Complete both full routes with the same simulation and actions, at 60Hz.
 p.add_script_tag(content='const C=AshCore;'+bot+'window.botStep=step;')
 results=[]
 for route in ['direct','depot']:
  p.evaluate("AshGame.start('journey')")
  for tick in range(140):
   phase=p.evaluate('AshGame.state.phase')
   if phase=='upgrade':p.locator('[data-choice=range]').click()
   if phase=='route':p.locator('[data-choice='+route+']').click()
   if phase=='comic':p.screenshot(path=str(OUT/f'comic-{route}.png'));p.locator('#comic-next').click()
   if phase in ['victory','defeat']:break
   p.evaluate("()=>{for(let i=0;i<180;i++){if(!['wave','boss','depot'].includes(AshGame.state.phase))break;botStep(AshGame.state)}}")
   p.wait_for_timeout(30)
  assert p.evaluate('AshGame.state.phase')=='victory',(route,p.evaluate('AshGame.state'))
  p.screenshot(path=str(OUT/f'victory-{route}.png'));results.append(p.evaluate('({route:AshGame.state.route,time:AshGame.state.time,stats:AshGame.state.stats})'));p.locator('#retry').click();p.wait_for_timeout(40);assert p.evaluate('AshGame.state.kills')==0;assert p.evaluate('AshGame.state.route') is None
 # Defeat and one-tap retry without retaining cooldowns or pointer input.
 p.evaluate("()=>{const s=AshCore.create('boss');AshCore.dismiss(s);AshCore.damage(s,999,'砲弾を直撃');AshTest.set(s)}");p.wait_for_timeout(50);p.screenshot(path=str(OUT/'defeat.png'));p.locator('#retry').click();p.wait_for_timeout(40);assert p.evaluate('AshGame.state.player.hp')==140;assert p.evaluate('AshGame.state.player.cool.dash')==0;p.locator('#comic-next').click()
 for w,h in [(667,375),(844,390),(932,430),(1280,720)]:
  p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(60)
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
  for sel in ['#stick','[data-skill=slam]','[data-skill=dash]','[data-skill=dodge]']:
   r=p.locator(sel).bounding_box();assert r['x']>=0 and r['y']>=0 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(sel,w,h,r)
 p.set_viewport_size({'width':390,'height':844});assert p.locator('#rotate').is_visible();assert p.evaluate('Math.abs(AshGame.input.x)')<.01
 assert not errors,errors
 (OUT/'results.json').write_text(json.dumps({'routes':results,'two_touch_input':True,'victory_defeat_retry':True,'landscape_sizes':4,'portrait_notice':True,'page_errors':errors,'physical_device_tested':False},indent=2));print((OUT/'results.json').read_text());b.close()
