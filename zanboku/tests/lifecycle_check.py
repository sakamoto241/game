"""Regression for mobile-webview focus/toolbar interruptions and silent backgrounding."""
from pathlib import Path
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
import json,os
out=Path(os.environ.get('ZANBOKU_ARTIFACTS','/workspace/artifacts/zanboku-impact'));out.mkdir(parents=True,exist_ok=True)
url=os.environ.get('ZANBOKU_URL','http://127.0.0.1:8017').rstrip('/')+'/?test'
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=b.new_context(viewport={'width':390,'height':740},is_mobile=True,has_touch=True,device_scale_factor=2)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.clock.install(time=datetime(2026,11,17,tzinfo=timezone.utc));page.clock.pause_at(datetime(2026,11,17,0,0,1,tzinfo=timezone.utc))
 page.goto(url,wait_until='networkidle');page.locator('#start').tap();page.clock.run_for(50)
 def check(name,expression):
  assert page.evaluate(expression),name
  checks.append(name);print('PASS',name,flush=True)
 page.keyboard.down('w');page.evaluate('window.dispatchEvent(new Event("blur"))')
 check('visible blur clears keyboard but never opens pause','__zanboku.input().y===0&&__zanboku.game.mode==="playing"&&document.querySelector("#pause").hidden')
 before=page.evaluate('__zanboku.game.time')
 page.evaluate('for(let i=0;i<20;i++){window.dispatchEvent(new Event("blur"));window.dispatchEvent(new Event("focus"));}')
 page.clock.run_for(150)
 check('twenty focus interruptions keep the game running',f'__zanboku.game.time>{before}&&document.querySelector("#pause").hidden')
 cdp=context.new_cdp_session(page)
 def point(id,x,y):return {'id':id,'x':x,'y':y,'radiusX':6,'radiusY':6,'force':1}
 r=page.locator('#stick').bounding_box();sx=r['x']+r['width']/2;sy=r['y']+r['height']/2
 r=page.locator('#slash').bounding_box();rx=r['x']+r['width']/2;ry=r['y']+r['height']/2
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point(1,sx,sy)]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[point(1,sx+22,sy-22)]});cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point(1,sx+22,sy-22),point(2,rx,ry)]})
 page.evaluate('window.dispatchEvent(new Event("blur"))');page.clock.run_for(90)
 check('two-thumb action survives a webview blur','__zanboku.input().x>.4&&__zanboku.game.mode==="playing"&&document.querySelector("#pause").hidden')
 page.set_viewport_size({'width':390,'height':660});page.clock.run_for(70)
 check('toolbar height change keeps held touch input','__zanboku.input().x>.4&&document.querySelector("#pause").hidden')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});page.clock.run_for(650)
 check('cancel clears movement and held attack','__zanboku.input().x===0&&__zanboku.input().y===0&&__zanboku.game.player.action==="idle"')
 page.evaluate('window.__hiddenForTest=true;Object.defineProperty(document,"hidden",{configurable:true,get:()=>window.__hiddenForTest});document.dispatchEvent(new Event("visibilitychange"));')
 before=page.evaluate('__zanboku.game.time');page.clock.run_for(1200)
 check('hidden app freezes silently',f'__zanboku.backgrounded&&__zanboku.game.time==={before}&&document.querySelector("#pause").hidden')
 page.evaluate('window.__hiddenForTest=false;document.dispatchEvent(new Event("visibilitychange"));');page.clock.run_for(160)
 check('return resumes automatically without a menu',f'!__zanboku.backgrounded&&__zanboku.game.time>{before}&&document.querySelector("#pause").hidden')
 page.evaluate('window.dispatchEvent(new Event("pagehide"))');before=page.evaluate('__zanboku.game.time');page.clock.run_for(500);page.evaluate('window.dispatchEvent(new Event("pageshow"))');page.clock.run_for(120)
 check('page cache restore resumes without an overlay',f'!__zanboku.backgrounded&&__zanboku.game.time>{before}&&document.querySelector("#pause").hidden')
 page.locator('#pauseBtn').tap();page.evaluate('window.__hiddenForTest=true;document.dispatchEvent(new Event("visibilitychange"));');page.clock.run_for(200);page.evaluate('window.__hiddenForTest=false;document.dispatchEvent(new Event("visibilitychange"));');page.clock.run_for(100)
 check('explicit pause stays paused across app switching','__zanboku.game.mode==="paused"&&!document.querySelector("#pause").hidden')
 page.locator('#resume').tap();page.keyboard.down('Escape');page.keyboard.down('Escape');page.clock.run_for(40)
 check('held Escape cannot toggle pause repeatedly','__zanboku.game.mode==="paused"');page.keyboard.up('Escape');page.locator('#resume').tap()
 check('manual resume remains usable','__zanboku.game.mode==="playing"')
 page.screenshot(path=str(out/'uninterrupted-play.png'));assert not errors,errors
 (out/'lifecycle-results.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2));b.close()
