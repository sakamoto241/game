#!/usr/bin/env python3
"""Prepare Noa's lossless runtime assets. Needs Playwright, Chromium and ffmpeg.
The web game uses the committed outputs; players do not run this script.
"""
import asyncio,base64,functools,http.server,shutil,subprocess,tempfile,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
POSES_JS="async function loadPoses(){const im=new Image();await new Promise((ok,no)=>{im.onload=ok;im.onerror=no;im.src='noa-actions.png';});const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);const data=x.getImageData(0,0,c.width,c.height),w=c.width,h=c.height,labels=new Int32Array(w*h),queue=new Int32Array(w*h),parts=[];let mark=0;\n for(let k=0;k<w*h;k++){if(labels[k]||data.data[k*4+3]<=90)continue;mark++;let head=0,tail=1,l=w,t=h,r=0,b=0;queue[0]=k;labels[k]=mark;while(head<tail){const p=queue[head++],a=p%w,z=Math.floor(p/w);l=Math.min(l,a);r=Math.max(r,a);t=Math.min(t,z);b=Math.max(b,z);for(const q of[a>0?p-1:-1,a<w-1?p+1:-1,z>0?p-w:-1,z<h-1?p+w:-1])if(q>=0&&!labels[q]&&data.data[q*4+3]>90){labels[q]=mark;queue[tail++]=q;}}if(tail>10000)parts.push({mark,l,t,r,b});}\n if(parts.length!==6)throw Error('poses');let expanded=labels;for(let k=0;k<3;k++){const next=new Int32Array(expanded);for(let y=1;y<h-1;y++)for(let a=1;a<w-1;a++){const i=y*w+a;if(!next[i])next[i]=expanded[i-1]||expanded[i+1]||expanded[i-w]||expanded[i+w];}expanded=next;}\n const targets=[[250,280],[760,290],[1260,310],[330,800],[800,730],[1240,800]];const used=new Set();for(let i=0;i<6;i++){const p=parts.filter(q=>!used.has(q.mark)).sort((a,b)=>Math.hypot((a.l+a.r)/2-targets[i][0],(a.t+a.b)/2-targets[i][1])-Math.hypot((b.l+b.r)/2-targets[i][0],(b.t+b.b)/2-targets[i][1]))[0];used.add(p.mark);const l=Math.max(0,p.l-4),t=Math.max(0,p.t-4),s=document.createElement('canvas');s.width=p.r-l+5;s.height=p.b-t+5;const sx=s.getContext('2d'),out=sx.createImageData(s.width,s.height);for(let y=0;y<s.height;y++)for(let a=0;a<s.width;a++){const k=(t+y)*w+l+a;if(expanded[k]===p.mark)for(let b=0;b<4;b++)out.data[(y*s.width+a)*4+b]=data.data[k*4+b];}sx.putImageData(out,0,0);sprites.push(s);spriteURLs.push(s.toDataURL('image/png'));}}\n"
class QuietHandler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
async def prepare(url,tmp):
 async with async_playwright() as p:
  options={'args':['--no-sandbox']}
  if shutil.which('chromium'):options['executable_path']=shutil.which('chromium')
  browser=await p.chromium.launch(**options);page=await browser.new_page()
  await page.goto(url+'/noa-actions.png')
  await page.add_script_tag(content=(ROOT/'tabi-art.js').read_text())
  data=await page.evaluate('async()=>{const sprites=[],spriteURLs=[];'+POSES_JS+';await Promise.all([loadPoses(),TabiArt.load()]);return {poses:sprites.map(s=>s.toDataURL("image/png")),golem:TabiArt.sprites.golem.toDataURL("image/png")};}')
  assert len(data['poses'])==6
  pairs=[]
  for i,dataurl in enumerate(data['poses']):
   src=tmp/f'pose-{i}.png';src.write_bytes(base64.b64decode(dataurl.split(',')[1]));pairs.append((src,ROOT/f'noa-pose-{i}.webp'))
  src=tmp/'golem.png';src.write_bytes(base64.b64decode(data['golem'].split(',')[1]));pairs.extend([(src,ROOT/'noa-golem.webp'),(ROOT/'tabi-simple-forest.png',ROOT/'noa-forest.webp')]);await browser.close()
  for src,dst in pairs:
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(src),'-c:v','libwebp','-lossless','1','-compression_level','6','-q:v','100','-y',str(dst)],check=True)
   print(dst.name,dst.stat().st_size)
if __name__=='__main__':
 handler=functools.partial(QuietHandler,directory=str(ROOT));server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with tempfile.TemporaryDirectory(prefix='noa-assets-') as tmp:asyncio.run(prepare(f'http://127.0.0.1:{server.server_port}',Path(tmp)))
 finally:server.shutdown();server.server_close()
