"""Render the real music engine offline and test live settings/scene integration.
Requires a static server, Playwright, Chromium and numpy. No sound device required.
"""
from pathlib import Path
import argparse,base64,json,wave,os
import numpy as np
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:8006/tomori/?v=9');ap.add_argument('--out',default='/tmp/tomori-audio-check');args=ap.parse_args();out=Path(args.out);out.mkdir(parents=True,exist_ok=True);project=Path(__file__).resolve().parents[1]

def rendered(b,track,seconds,dialogue=False,transitions=False):
 p=b.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.goto(args.url.rsplit('/',1)[0]+'/credits.html');p.evaluate("localStorage.setItem('sword-sale-audio',JSON.stringify({se:false,bgm:true}))")
 p.set_content('<button id="play">Play</button><input id="sound-se" type="checkbox"><input id="sound-bgm" type="checkbox">')
 p.evaluate('''seconds=>{
  window.clock=0;window.ticks=[];window.activeSources=new Set();window.context=new OfflineAudioContext(1,Math.ceil((seconds+2)*22050),22050);
  const ctx=window.context;
  for(const method of ['createOscillator','createBufferSource']){const create=ctx[method].bind(ctx);ctx[method]=(...a)=>{const node=create(...a);window.activeSources.add(node);node.addEventListener('ended',()=>window.activeSources.delete(node));return node}}
  window.AudioContext=function(){return new Proxy(ctx,{get(target,key){if(key==='state')return 'running';if(key==='currentTime')return window.clock;if(key==='resume'||key==='suspend')return ()=>Promise.resolve();const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}})};
  let id=0;window.setInterval=fn=>{window.ticks.push({id:++id,fn});return id};window.clearInterval=id=>window.ticks=window.ticks.filter(t=>t.id!==id);
 }''',seconds)
 p.add_script_tag(path=str(project/'music.js'));p.add_script_tag(path=str(project/'audio.js'))
 p.evaluate('''({track,dialogue})=>TomoriAudio.scene(track,{dialogue})''',{'track':track,'dialogue':dialogue});p.locator('#play').click()
 data=p.evaluate('''async ({seconds,transitions})=>{
  let stage=0;const change=enabled=>{const el=document.getElementById('sound-bgm');el.checked=enabled;el.dispatchEvent(new Event('change'))};
  for(let t=0;t<seconds;t+=.025){window.clock=t;
   if(transitions){if(t>=1.5&&stage===0){TomoriAudio.scene('battle');stage++}if(t>=3&&stage===1){TomoriAudio.scene('boss');stage++}if(t>=4.5&&stage===2){TomoriAudio.scene('shop',{dialogue:true});stage++}if(t>=6&&stage===3){change(false);stage++}if(t>=7&&stage===4){change(true);stage++}}
   for(const tick of [...window.ticks])tick.fn();
  }
  const buffer=await window.context.startRendering(),samples=buffer.getChannelData(0),bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);
  for(let i=0;i<samples.length;i++)view.setInt16(i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
  let binary='';for(let i=0;i<bytes.length;i+=0x4000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x4000));
  return {pcm:btoa(binary),peak:Math.max(...Array.from({length:Math.ceil(samples.length/10000)},(_,i)=>Math.max(...samples.subarray(i*10000,(i+1)*10000).map(Math.abs)))),sources:window.activeSources.size};
 }''',{'seconds':seconds,'transitions':transitions})
 assert not errs,errs
 assert data['sources']==0,('sources did not finish',track,data['sources'])
 a=np.frombuffer(base64.b64decode(data['pcm']),dtype='<i2').astype(float)/32768
 assert np.isfinite(a).all() and data['peak']<.9,(track,'clipping or invalid data',data['peak'])
 with wave.open(str(out/(track+('-dialogue' if dialogue else '-transitions' if transitions else '')+'.wav')),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(base64.b64decode(data['pcm']))
 p.close();return a

def rms(a):return float(np.sqrt(np.mean(a*a)))
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 meta=b.new_page();meta.goto(args.url);tracks=meta.evaluate("Object.fromEntries(Object.entries(TomoriMusic.TRACKS).map(([id,t])=>[id,t.length*60/t.bpm/2]))");meta.close()
 levels={}
 for name,length in tracks.items():
  samples=rendered(b,name,length+.25)
  assert rms(samples[22050:])>1e-4,(name,'silent score')
  # No unintended dropout at the A/B boundary or the end/start of a full loop.
  for when in [length/2,length]:assert rms(samples[int((when-.12)*22050):int((when+.12)*22050)])>1e-5,(name,'loop dropout',when)
  levels[name]={'seconds':length,'rms_db':20*np.log10(rms(samples)+1e-12),'peak':float(np.max(np.abs(samples)))}
 normal=rendered(b,'shop',8);quiet=rendered(b,'shop',8,dialogue=True)
 ratio=rms(quiet[22050:8*22050])/rms(normal[22050:8*22050]);assert .35<ratio<.9,('dialogue level',ratio)
 mixed=rendered(b,'shop',9,transitions=True)
 assert rms(mixed[int(6.65*22050):int(6.95*22050)])<1e-5,'music leaked while muted'
 assert rms(mixed[int(7.5*22050):int(8.3*22050)])>1e-4,'music did not resume'
 # Real browser, trusted clicks, persisted settings and the game's scene calls.
 c=b.new_context(viewport={'width':390,'height':844});p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(args.url)
 p.locator('#title-settings').click();p.locator('#sound-se').uncheck();p.locator('#sound-bgm').uncheck();assert p.evaluate("JSON.parse(localStorage.getItem('sword-sale-audio'))")=={'se':False,'bgm':False}
 p.reload();p.locator('#title-settings').click();assert not p.locator('#sound-se').is_checked() and not p.locator('#sound-bgm').is_checked();p.locator('#sound-bgm').check();p.locator('[data-close=settings-dialog]').click()
 p.evaluate("()=>{const s=TomoriCore.fresh();s.next=5;s.route='help';TomoriCore.startBattle(s,5);localStorage.setItem('sword-sale-v1',JSON.stringify(s));localStorage.setItem('tomori-preferences-v1',JSON.stringify({speed:'instant',reduced:true,guideSeen:true}))}")
 p.reload();p.evaluate("()=>{window.scenes=[];const original=TomoriAudio.scene;TomoriAudio.scene=(name,options)=>{window.scenes.push({name,dialogue:!!options?.dialogue});return original(name,options)}}")
 p.locator('#continue').click();p.wait_for_function("document.getElementById('app').dataset.screen==='battle'");assert p.evaluate("window.scenes.some(s=>s.name==='boss')")
 p.locator('#battle-menu').click();p.locator('#retreat').click();p.wait_for_function("document.getElementById('app').dataset.screen==='result'");assert p.evaluate("window.scenes.some(s=>s.name==='shop')")
 assert not errors,errors;c.close();b.close()
 result={'full_loops':levels,'dialogue_rms_ratio':ratio,'all_sources_finished':True,'mute_resume':True,'settings_persist':True,'game_scene_switching':True,'page_errors':errors,'real_device_tested':False}
 (out/'results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
