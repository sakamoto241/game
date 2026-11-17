"""Checks the actual pose transitions, view reset and reduced motion preference."""
import json,os
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('ZANBOKU_ARTIFACTS','/workspace/artifacts/zanboku-motion'));out.mkdir(parents=True,exist_ok=True)
url=os.environ.get('ZANBOKU_URL','http://127.0.0.1:8017').rstrip('/')+'/?test'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':740},device_scale_factor=2,is_mobile=True,has_touch=True)
 page.clock.install(time=datetime(2026,11,17,tzinfo=timezone.utc));page.clock.pause_at(datetime(2026,11,17,0,0,1,tzinfo=timezone.utc));page.goto(url,wait_until='networkidle');page.evaluate('document.fonts.ready')
 assert page.evaluate('document.fonts.check(\'24px "Yuji Boku"\',"残墨斬抜刀")')
 page.locator('#start').tap()
 page.keyboard.press('j');page.clock.run_for(40)
 assert page.evaluate('__zanboku.game.player.action==="slash"&&__zanboku.game.player.pose>.17')
 page.screenshot(path=str(out/'cut-windup.png'))
 page.clock.run_for(160)
 assert page.evaluate('__zanboku.game.player.action==="slash"&&__zanboku.game.player.pose<.17')
 page.screenshot(path=str(out/'cut-followthrough.png'))
 page.clock.run_for(160);page.keyboard.press('k');page.clock.run_for(60)
 assert page.evaluate('__zanboku.paint.echoes.length>0')
 page.locator('#pauseBtn').tap();a=page.evaluate('document.querySelector("canvas").toDataURL()');page.clock.run_for(300);c=page.evaluate('document.querySelector("canvas").toDataURL()');assert a==c,'pause should freeze the drawn action'
 page.locator('#pauseTitle').tap();page.locator('#start').tap()
 assert page.evaluate('__zanboku.paint.echoes.length===0&&__zanboku.paint.impact===0')
 page.close()
 page=b.new_page(viewport={'width':390,'height':740},is_mobile=True,has_touch=True,reduced_motion='reduce');page.clock.install(time=datetime(2026,11,17,tzinfo=timezone.utc));page.clock.pause_at(datetime(2026,11,17,0,0,1,tzinfo=timezone.utc));page.goto(url,wait_until='networkidle');page.locator('#start').tap();page.keyboard.press('k');page.clock.run_for(100)
 assert page.evaluate('__zanboku.paint.reduced&&__zanboku.paint.echoes.length===0')
 result={'font':True,'distinct_slash_poses':True,'dash_echoes':True,'paused_frame_unchanged':True,'retry_clears_view':True,'reduced_motion':True}
 (out/'motion-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
