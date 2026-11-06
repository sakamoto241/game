"""Play all requests through the UI and exercise the new boss and skill layouts."""
import argparse,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8006/tomori/?v=12');ap.add_argument('--out',default='/tmp/tomori-features-check');args=ap.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
KEY='sword-sale-v1'
def state(p):return p.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
def screen(p):return p.locator('#app').get_attribute('data-screen')
def story(p):
 for _ in range(25):
  if screen(p)!='story':return
  p.locator('#story-next').click()
 raise AssertionError('story stuck')
def pick(p):
 return p.evaluate('''()=>{const s=JSON.parse(localStorage.getItem('sword-sale-v1')),b=s.battle,hs=b.heroes.filter(h=>h.hp>0&&!h.acted),e=b.enemies.filter(e=>e.hp>0).sort((a,b)=>a.hp-b.hp)[0],hurt=b.heroes.filter(h=>h.hp>0).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];let h=hs[0],a='attack',t=e.id;const healer=hs.find(h=>h.id==='rine'&&h.sp>=2);
 if(b.request==='ash'&&!b.objectiveProgress&&hs.some(h=>h.id==='ash')){h=hs.find(h=>h.id==='ash');a=h.level>=2&&h.sp>=2?'wardslash':'guard'}
 else if(healer&&hurt.hp<hurt.maxHp*.57){h=healer;a='heal';t=hurt.id}
 else if(hurt.hp<35&&b.potions){a='potion';t=hurt.id}
 else if(e.fortified&&hs.some(h=>h.id==='rine'&&h.level>=2&&h.sp>=2)){h=hs.find(h=>h.id==='rine');a='appraise'}
 else if(e.shield>2&&!e.weakness&&hs.some(h=>h.id==='noa'&&h.level>=2&&h.sp>=2)){h=hs.find(h=>h.id==='noa');a='analyse'}
 else if(e.shield>0&&hs.some(h=>['ash','rine','finn'].includes(h.id)&&h.sp>=2)){h=hs.find(h=>['ash','rine','finn'].includes(h.id)&&h.sp>=2);a={ash:'lunge',rine:'flash',finn:'sparks'}[h.id]}
 else if(hs.some(h=>h.id==='noa'&&h.sp>=1)&&!e.marks&&hs.length>1){h=hs.find(h=>h.id==='noa');a='mark'}
 else{h=hs.find(h=>h.sp>=3&&h.id!=='rine')||h;a=h.sp>=3?{ash:'cleave',noa:'pierce',finn:h.level>=2?'constellation':'star'}[h.id]||'attack':'attack'}return[h.id,a,t]}''')
def battle(p,save_once=False):
 reloaded=False
 for _ in range(200):
  if screen(p)=='result':assert state(p)['lastBattle']['win'];return
  if p.locator('#guide-dialog').is_visible():p.locator('#guide-dialog [data-close]').last.click()
  if not p.locator('#actions button:enabled').count():p.wait_for_timeout(50);continue
  h,a,t=pick(p);p.locator('[data-select='+h+']').click()
  if a in ['heal','potion']:
   p.locator('#battle-potion' if a=='potion' else '[data-action=heal]').click();p.locator('[data-heal='+t+']').click()
  elif a=='guard':p.locator('[data-action=guard]').click()
  else:
   p.locator('[data-target='+t+']').click();predicted=int(p.locator('[data-action='+a+'] .forecast').inner_text().split('ダメージ')[0]);hp_before=next(e['hp'] for e in state(p)['battle']['enemies'] if e['id']==t);p.locator('[data-action='+a+']').click();after=state(p);hp_after=next(e['hp'] for e in after['battle']['enemies'] if e['id']==t) if after.get('battle') else 0;assert hp_before-hp_after==min(hp_before,predicted)
  if save_once and not reloaded:
   before=state(p)['battle'];p.reload();p.locator('#continue').click();p.wait_for_timeout(200);now=state(p)['battle'];assert now['heroes']==before['heroes'] and now['enemies']==before['enemies'];reloaded=True
  p.wait_for_timeout(170)
 raise AssertionError('battle stuck')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox']);errors=[];bad=[];completed=[]
 for width,height in [(390,844),(320,568)]:
  c=b.new_context(viewport={'width':width,'height':height},device_scale_factor=2,has_touch=True,is_mobile=True);c.on('page',lambda p:p.on('pageerror',lambda e:errors.append(str(e))));c.on('response',lambda r:bad.append([r.status,r.url]) if r.status>=400 else None);p=c.new_page();p.goto(args.url)
  p.evaluate("""()=>{const s=TomoriCore.fresh();s.story=null;s.view='camp';s.next=2;s.cleared=[1];for(const id of TomoriData.IDS)s.xp[id]=26;localStorage.setItem('sword-sale-v1',JSON.stringify(s));localStorage.setItem('tomori-preferences-v1',JSON.stringify({speed:'instant',reduced:true,guideSeen:true}))}""")
  p.reload();p.locator('#continue').click()
  for who in ['rine','ash','noa','finn']:
   p.locator('#rest').click();p.locator('#requests-open').click();p.locator('[data-request='+who+']').scroll_into_view_if_needed();p.screenshot(path=str(out/f'request-{who}-{width}.png'));p.locator('[data-request='+who+']').click();story(p);assert state(p)['battle']['request']==who;assert state(p)['next']==2;p.screenshot(path=str(out/f'request-battle-{who}-{width}.png'))
   battle(p,save_once=who=='noa');assert state(p)['lastBattle']['request']==who;p.screenshot(path=str(out/f'request-result-{who}-{width}.png'));p.locator('#result-next').click();story(p);assert screen(p)=='hub';s=state(p);assert s['requests'][who]=='done';assert s['equipped'][who];assert s['next']==2 and s['cleared']==[1]
  assert len(state(p)['relics'])==4
  p.locator('#gear-open').click();p.locator('[data-equip=noa]').scroll_into_view_if_needed();p.screenshot(path=str(out/f'personal-equipment-{width}.png'));p.locator('[data-equip=noa]').click();assert state(p)['equipped']['noa'] is None;p.locator('[data-equip=noa]').click();assert state(p)['equipped']['noa']=='sight';p.locator('#gear-dialog').evaluate('(d)=>d.scrollTop=0');p.locator('#gear-dialog [data-close]').click()
  p.locator('#party-open').click();p.locator('.skill-details summary').first.click();p.screenshot(path=str(out/f'skills-{width}.png'));p.locator('#party-dialog').evaluate('(d)=>d.scrollTop=0');p.locator('#party-dialog [data-close]').click()
  p.locator('#journal-open').click();before=state(p);p.locator('[data-read=request-noa-end]').click();p.locator('#replay-story').click();story(p);assert p.locator('#journal-dialog').is_visible();assert state(p)==before;p.locator('#journal-dialog').evaluate('(d)=>d.scrollTop=0');p.locator('#journal-dialog [data-close]').click();p.reload();p.locator('#continue').click();assert state(p)['requests']=={k:'done' for k in ['rine','ash','noa','finn']}
  print('all requests and equipment passed',width,flush=True);completed.append({'width':width,'all_requests':True,'all_rewards':True,'reload':True,'equipment_toggle':True,'read_only_replay':True});c.close()
 # Lv.3 new-skill rows, charge warning, both phases and actionable buttons at mobile sizes.
 for width,height in [(320,568),(390,660),(390,844),(430,932),(844,390)]:
  c=b.new_context(viewport={'width':width,'height':height},device_scale_factor=2,has_touch=True,is_mobile=True);p=c.new_page();p.goto(args.url);p.evaluate("""()=>{const s=TomoriCore.fresh();s.story=null;s.view='camp';s.next=5;s.route='help';s.party=['noa','rine','finn'];for(const id of TomoriData.IDS)s.xp[id]=85;TomoriCore.rest(s);TomoriCore.startBattle(s,5);s.battle.enemies[0].charging=true;s.battle.enemies[0].intent={kind:'all',target:'noa'};localStorage.setItem('sword-sale-v1',JSON.stringify(s));localStorage.setItem('tomori-preferences-v1',JSON.stringify({speed:'instant',reduced:true,guideSeen:true}))}""");p.reload();p.locator('#continue').click();p.wait_for_function("document.getElementById('app').dataset.screen==='battle'");assert p.locator('[data-action=analyse]').is_visible();assert 'ダメージ' in p.locator('[data-action=analyse]').inner_text();assert '全体強攻撃' in p.locator('#target-info').inner_text()
  for hero,skill in [('noa','analyse'),('rine','appraise'),('finn','constellation')]:
   p.locator('[data-select='+hero+']').click();p.locator('[data-action='+skill+']').scroll_into_view_if_needed();r=p.locator('[data-action='+skill+']').bounding_box();assert r['height']>=44 and r['y']+r['height']<=height+1,(width,hero,r);assert p.locator('[data-action='+skill+'] .forecast').is_visible()
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');p.screenshot(path=str(out/f'boss-warning-{width}-{height}.png'))
  # Draw phase two from a legitimate half-HP snapshot on a new page, preserving the save.
  p.goto(args.url);p.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('sword-sale-v1'));s.battle.round=3;s.battle.enemies[0].stage=2;s.battle.enemies[0].hp=170;s.battle.enemies[0].breakCount=1;s.battle.enemies[0].fortified=false;s.battle.enemies[0].maxShield=s.battle.enemies[0].shield=6;localStorage.setItem('sword-sale-v1',JSON.stringify(s))}""");p.reload();p.locator('#continue').click();p.wait_for_function("document.getElementById('app').dataset.screen==='battle'");assert p.locator('.core-exposed').count()==1;assert 'golem-core.webp' in p.locator('.core-exposed .body').get_attribute('src');p.screenshot(path=str(out/f'boss-core-{width}-{height}.png'));c.close()
 assert not errors,errors;assert not bad,bad;b.close();result={'campaigns':completed,'boss_viewports':5,'page_errors':errors,'http_errors':bad};(out/'results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
