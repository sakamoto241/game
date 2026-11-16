from playwright.sync_api import sync_playwright
from pathlib import Path
import json
OUT=Path('/workspace/artifacts/ash-portrait');OUT.mkdir(parents=True,exist_ok=True);URL='http://127.0.0.1:8016/ash-gunner/?v=portrait1'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2);p=c.new_page();errors=[];bad=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('response',lambda r:bad.append(r.url) if r.status>=400 else None);p.goto(URL);p.locator('#practice').wait_for();p.screenshot(path=str(OUT/'title.png'));p.locator('#practice').click();p.locator('#comic-next').wait_for();p.wait_for_timeout(120);assert p.evaluate('AshGame.state.time')==0;p.locator('#comic-next').click()
 cd=c.new_cdp_session(p);r=p.locator('#stick').bounding_box();q=p.locator('[data-skill=dash]').bounding_box();x=r['x']+70;y=r['y']+50;left={'x':x,'y':y,'id':1};right={'x':q['x']+q['width']/2,'y':q['y']+q['height']/2,'id':2}
 cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[left]});left['x']+=25;cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[left]});p.wait_for_timeout(120);assert p.evaluate('AshGame.input.x')>.2;cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[left,right]});p.wait_for_timeout(80);assert p.evaluate("AshGame.state.events.some(e=>e.type==='dash')");assert p.evaluate('AshGame.input.x')>.2;cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert p.evaluate('Math.abs(AshGame.input.x)')<.01
 p.evaluate("()=>{const s=AshCore.create();s.mobs=[{id:99,x:s.player.x+20,y:s.player.y,hp:40,r:14,wind:0,cool:2,kx:0,ky:0}];AshTest.set(s)}");p.wait_for_timeout(100);assert p.evaluate("AshGame.state.events.some(e=>e.type==='slam')");p.add_script_tag(content='const C=AshCore;'+Path(__file__).with_name('bot.js').read_text()+'window.botStep=step;');results=[]
 for route in ['direct','depot']:
  p.evaluate("AshGame.start('journey')")
  for tick in range(220):
   phase=p.evaluate('AshGame.state.phase')
   if phase=='upgrade':p.locator('[data-choice=range]').click()
   if phase=='route':p.locator('[data-choice='+route+']').click()
   if phase=='comic':p.screenshot(path=str(OUT/f'comic-{route}.png'));p.locator('#comic-next').click()
   if phase in ['victory','defeat']:break
   p.evaluate("()=>{for(let i=0;i<180;i++){if(!['wave','boss','depot'].includes(AshGame.state.phase))break;botStep(AshGame.state)}}");p.wait_for_timeout(30)
  assert p.evaluate('AshGame.state.phase')=='victory',(route,p.evaluate('AshGame.state'));p.screenshot(path=str(OUT/f'victory-{route}.png'));results.append(p.evaluate('({route:AshGame.state.route,time:AshGame.state.time,stats:AshGame.state.stats})'));p.locator('#retry').click();assert p.evaluate('AshGame.state.time')<.5;assert p.evaluate('AshGame.state.stats.shots')==0;assert p.evaluate('AshGame.state.route') is None
 p.evaluate("()=>{const s=AshCore.create('boss');AshCore.dismiss(s);s.player.x=285;s.player.y=420;s.player.hp=1;s.pillars=[];s.boss.state='aim';s.boss.timer=.1;s.boss.angle=Math.PI/2;AshTest.set(s)}");p.locator('#retry').wait_for();assert p.evaluate('AshGame.state.phase')=='defeat';p.screenshot(path=str(OUT/'defeat.png'));p.locator('#retry').click();assert p.evaluate('AshGame.state.player.hp')==140;p.locator('#comic-next').click()
 for w,h in [(320,568),(390,844),(430,932),(768,1024)]:
  p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(70);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
  for sel in ['#stick','[data-skill=dash]','[data-skill=dodge]']:
   r=p.locator(sel).bounding_box();assert r['x']>=0 and r['y']>=0 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(w,sel,r)
 p.set_viewport_size({'width':844,'height':390});assert p.locator('#rotate').is_visible();assert p.evaluate('Math.abs(AshGame.input.x)')<.01
 p.set_viewport_size({'width':390,'height':844});p.evaluate("AshGame.start('boss')");p.locator('#comic-next').click();p.wait_for_timeout(500);p.screenshot(path=str(OUT/'portrait-game.png'));assert p.evaluate('document.getElementById("world").width')==1240
 assert not errors,errors;assert not bad,bad;(OUT/'results.json').write_text(json.dumps({'routes':results,'two_touch_input':True,'auto_attack':True,'victory_projectile_defeat_retry':True,'portrait_sizes':4,'landscape_notice':True,'page_errors':errors,'http_errors':bad,'real_device':False},indent=2));print((OUT/'results.json').read_text());b.close()
