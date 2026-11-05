"""Optional Playwright checks. Run a static server before this script."""
import os,json,argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8006/tomori/');ap.add_argument('--out',default='/tmp/tomori-browser-check');ap.add_argument('--part',choices=['all','campaign','layout','resume'],default='all');args=ap.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
KEY='sword-sale-v1'
def state(p):return p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
def screen(p):return p.locator('#app').get_attribute('data-screen')
def story(p):
 for _ in range(80):
  if screen(p)!='story' or p.locator('#story-choices').is_visible():return
  p.locator('#story-skip').click();p.wait_for_timeout(25)
 raise AssertionError('story did not end')
def move(s):
 b=s['battle'];heroes=[h for h in b['heroes'] if h['hp']>0 and not h['acted']];e=min([e for e in b['enemies'] if e['hp']>0],key=lambda e:e['hp']);hurt=min([h for h in b['heroes'] if h['hp']>0],key=lambda h:h['hp']/h['maxHp']);healer=next((h for h in heroes if h['id']=='rine' and h['sp']>=2),None)
 if healer and hurt['hp']<hurt['maxHp']*.57:return ('rine','heal',hurt['id'])
 if hurt['hp']<35 and b['potions']:return(heroes[0]['id'],'potion',hurt['id'])
 if e['shield']>0:
  h=next((h for h in heroes if h['id'] in ['ash','rine','finn'] and h['sp']>=2),None)
  if h:return(h['id'],{'ash':'lunge','rine':'flash','finn':'sparks'}[h['id']],e['id'])
 n=next((h for h in heroes if h['id']=='noa' and h['sp']>=1),None)
 if n and not e['marks'] and len(heroes)>1:return('noa','mark',e['id'])
 h=next((h for h in heroes if h['sp']>=3 and h['id'] in ['ash','finn','noa']),heroes[0]);return(h['id'],{'ash':'cleave','finn':'star','noa':'pierce'}.get(h['id'],'attack') if h['sp']>=3 else 'attack',e['id'])
def battle(p,reload_once=False):
 reloaded=False
 for i in range(220):
  if screen(p)=='result':
   assert state(p)['lastBattle']['win'],'lost UI campaign';return
  if p.locator('#guide-dialog').is_visible():p.locator('#guide-dialog [data-close]').last.click()
  if p.locator('#actions button:not([disabled])').count()==0:p.wait_for_timeout(40);continue
  s=state(p)
  if not s.get('battle') or s['battle']['phase']!='player':p.wait_for_timeout(40);continue
  h,a,t=move(s);p.locator('[data-select='+h+']').click()
  if a in ['heal','potion']:
   p.locator('#battle-potion' if a=='potion' else '[data-action='+a+']').click();p.locator('[data-heal='+t+']').click()
  else:
   p.locator('[data-target='+t+']').click();p.locator('[data-action='+a+']').click()
  if reload_once and not reloaded:
   old=state(p)['battle'];assert old['phase']=='player';p.reload();p.locator('#continue').click();p.wait_for_timeout(180);now=state(p)['battle'];assert now['heroes']==old['heroes'] and now['enemies']==old['enemies'],'mid-action reload changed state';reloaded=True
  p.wait_for_timeout(170)
 raise AssertionError('battle timeout '+str(state(p)))
def campaign(b,route):
 context=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);p=context.new_page();errs=[];bad=[];p.on('pageerror',lambda e:errs.append(str(e)));p.on('response',lambda r:bad.append((r.status,r.url)) if r.status>=400 else None);p.goto(args.url);p.evaluate("localStorage.setItem('tomori-journey-v1','old-save-kept')");p.screenshot(path=str(out/f'title-{route}.png'));p.locator('#title-settings').click();p.locator('#text-speed').select_option('instant');p.locator('#reduced').check();p.locator('[data-close=settings-dialog]').click();p.locator('#new-game').click();p.wait_for_timeout(200);story(p);assert screen(p)=='hub'
 if route=='trace':
  p.locator('#party-open').click();p.locator('[data-pick=rine]').click();p.locator('[data-pick=noa]').click();p.locator('#party-confirm').click();assert 'noa' in state(p)['party']
 p.screenshot(path=str(out/f'camp-{route}.png'));p.locator('#depart').click();story(p);p.wait_for_timeout(140)
 if p.locator('#guide-dialog').is_visible():p.locator('#guide-dialog [data-close]').last.click()
 p.screenshot(path=str(out/f'battle-{route}.png'));battle(p,reload_once=True);p.locator('#result-next').click();story(p);assert screen(p)=='hub';p.locator('#gear-open').click();p.locator('[data-upgrade=ash]').click();assert state(p)['ranks']['ash']==1;p.locator('[data-close=gear-dialog]').click();p.locator('#rest').click();p.locator('#depart').click();story(p);p.locator('[data-route='+route+']').click();story(p);assert state(p)['route']==route and screen(p)=='hub'
 for n in [3,4,5]:
  p.locator('#rest').click();p.locator('#depart').click();story(p)
  if n==5:p.screenshot(path=str(out/f'boss-{route}.png'))
  battle(p);p.locator('#result-next').click();story(p)
 assert screen(p)=='story' and state(p)['story']['id']=='ending';p.locator('[data-deal='+('honest' if route=='help' else 'barter')+']').click();story(p);assert screen(p)=='ending' and state(p)['completed'];p.screenshot(path=str(out/f'ending-{route}.png'));p.locator('#ending-camp').click();p.locator('#journal-open').click();assert p.locator('[data-read=ending]').count()==1;p.locator('[data-read=ending]').click();assert p.locator('.journal-story').count()==3;p.locator('[data-close=journal-dialog]').click();p.locator('#depart').click();assert state(p)['battle']['challenge'];p.locator('#battle-menu').click();p.locator('#retreat').click();assert not state(p)['lastBattle']['win'];p.locator('#result-retry').click();assert state(p)['battle']['round']==1
 assert p.evaluate("localStorage.getItem('tomori-journey-v1')")=='old-save-kept';assert not errs,errs;assert not bad,bad;print(json.dumps({'route':route,'chapter_clear':True,'reload':True,'upgrade':True,'journal':True,'boss_rematch':True,'retreat_retry':True,'page_errors':errs}),flush=True);context.close()
def layouts(b):
 context=b.new_context(device_scale_factor=2,is_mobile=True,has_touch=True);p=context.new_page();p.goto(args.url);p.evaluate("localStorage.setItem('tomori-preferences-v1',JSON.stringify({speed:'instant',guideSeen:true,reduced:true}))")
 for w,h in [(320,568),(390,844),(430,932),(768,1024),(844,390),(1280,900)]:
  for v in ['title','camp','story','fork','negotiation','battle','boss']:
   p.close();p=context.new_page();p.set_viewport_size({'width':w,'height':h});p.goto(args.url)
   if v=='title':p.evaluate("localStorage.removeItem('sword-sale-v1');localStorage.removeItem('sword-sale-v1-backup')")
   if v!='title':
    p.evaluate("""(v)=>{const s=TomoriCore.fresh();s.story=null;s.view='camp';if(v==='story'){s.story={id:'intro',index:0};s.view='story'}if(v==='fork'){s.next=2;s.gold=0;s.story={id:'fork',index:TomoriData.STORIES.fork.length-1};s.view='story'}if(v==='negotiation'){s.next=6;s.route='help';s.story={id:'ending',index:TomoriData.STORIES.ending.length-1};s.view='story'}if(v==='battle'){s.next=4;s.route='trace';TomoriCore.startBattle(s,4)}if(v==='boss'){s.next=5;s.route='trace';TomoriCore.startBattle(s,5)}localStorage.setItem('sword-sale-v1',JSON.stringify(s))}""",v)
   p.reload()
   if v!='title':p.locator('#continue').click();p.wait_for_timeout(75)
   assert screen(p)==('hub' if v=='camp' else 'battle' if v=='boss' else 'story' if v in ['fork','negotiation'] else v),(v,screen(p))
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'horizontal overflow'
   buttons=p.locator('#'+('hub' if v=='camp' else 'battle' if v=='boss' else 'story' if v in ['fork','negotiation'] else v)+' button:visible');bounds=p.locator('#app').bounding_box()
   for el in buttons.all():
    r=el.bounding_box();assert r['height']>=43.5,(w,h,v,'small target',r)
    assert r['x']>=bounds['x']-1 and r['x']+r['width']<=bounds['x']+bounds['width']+1,(w,h,v,'off-screen target',r)
    assert r['y']>=-1 and r['y']+r['height']<=h+1,(w,h,v,'off-screen target',r)
   expected_art='-body.webp' if v in ['battle','boss'] else '-normal-'
   if v in ['story','fork','negotiation']:assert '-normal-portrait.webp' in p.locator('#story-character').get_attribute('src')
   if v=='title':assert '-normal-body.webp' in p.locator('.title-character').get_attribute('src')
   if v=='camp':assert all('-normal-face.webp' in src for src in p.locator('#hub-party img').evaluate_all('(els)=>els.map(el=>el.getAttribute("src"))'))
   if v in ['battle','boss']:assert all('-normal-' not in src for src in p.locator('#hero-actors img').evaluate_all('(els)=>els.map(el=>el.getAttribute("src"))'))
   if w in [320,390,844]:p.screenshot(path=str(out/f'{v}-{w}.png'))
  print('layout',w,h,'passed',flush=True)
 context.close()
def resume_and_repair(b):
 c=b.new_context(viewport={'width':390,'height':844});p=c.new_page();p.goto(args.url)
 p.evaluate("""()=>{const s=TomoriCore.fresh();s.story=null;s.view='camp';s.next=4;s.route='trace';TomoriCore.startBattle(s,4);for(const h of s.party)TomoriCore.act(s,h,'guard');window.expected=TomoriCore.validate(JSON.stringify(s));while(window.expected.battle.phase==='enemy')TomoriCore.enemyStep(window.expected);localStorage.setItem('resume-expected',JSON.stringify(window.expected.battle));localStorage.setItem('sword-sale-v1',JSON.stringify(s));localStorage.setItem('tomori-preferences-v1',JSON.stringify({speed:'instant',guideSeen:true,reduced:true}));}""")
 p.reload();p.locator('#continue').click();p.wait_for_function("JSON.parse(localStorage.getItem('sword-sale-v1')).battle.round===2");p.wait_for_timeout(200);expected=p.evaluate("JSON.parse(localStorage.getItem('resume-expected'))");actual=state(p)['battle'];assert actual['heroes']==expected['heroes'],'enemy turn repeated or lost';assert actual['enemies']==expected['enemies'];p.close();p=c.new_page();p.goto(args.url);p.evaluate("localStorage.setItem('sword-sale-v1-backup',localStorage.getItem('sword-sale-v1'));localStorage.setItem('sword-sale-v1','broken json')");p.reload();assert p.locator('#continue').is_visible();assert '復旧' in p.locator('#save-note').inner_text();p.locator('#continue').click();assert screen(p)=='battle';print('enemy-phase resume and corrupt-save backup recovery passed',flush=True);c.close()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 if args.part in ['all','campaign']:campaign(b,'help');campaign(b,'trace')
 if args.part in ['all','layout']:layouts(b)
 if args.part in ['all','resume']:resume_and_repair(b)
 b.close()
print('All browser checks passed')
