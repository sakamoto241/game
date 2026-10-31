/* 夜明けに、わたしを燃やして — background music.
   The approved recorded cue is shared across title, travel and ending scenes. Boss/trial
   scenes use the existing Web Audio score. Shared files keep their playback position. Scenes cross-fade; nothing plays before a user gesture. */
(function(root){'use strict';
// Recorded tracks override the generated ones, e.g. town:'akatsuki-bgm-town.mp3'.
const THEME='akatsuki-bgm-lantern.mp3?v=1';
const FILES={title:THEME,town:THEME,pilgrim:THEME,ending:THEME};
const midi=n=>440*Math.pow(2,(n-69)/12);
// root: MIDI note; chords: semitone sets per bar; beat: seconds; layers toggle the voices.
const SCENES={
 title:  {root:50,beat:1.15,chords:[[0,3,7,14],[-4,0,3,10],[-7,-3,0,7],[-2,2,5,9]],scale:[0,2,3,5,7,8,10],arp:.35,bell:.25,drone:true},
 town:   {root:57,beat:.9,chords:[[0,3,7,12],[-4,0,3,7],[-9,-5,-2,3],[-2,2,5,10]],scale:[0,2,3,5,7,8,10],arp:.7,bell:.15,box:true},
 pilgrim:{root:52,beat:1.05,chords:[[0,7,12,15],[-2,5,10,14],[-4,3,8,12],[-5,2,7,10]],scale:[0,2,3,5,7,9,10],arp:.3,bell:.2,wind:true,drone:true},
 belfry: {root:49,beat:.62,chords:[[0,3,7,12],[1,5,8,13],[0,3,7,12],[-2,1,5,10]],scale:[0,1,3,5,7,8,10],arp:.85,bell:.1,pulse:true,toll:true,drone:true},
 trial:  {root:53,beat:.58,chords:[[0,3,7,12],[-1,3,6,11],[-4,0,3,8],[-5,-1,2,7]],scale:[0,1,3,5,7,8,10],arp:.9,bell:.1,pulse:true},
 ending: {root:50,beat:1.25,chords:[[0,4,7,14],[-3,0,4,11],[5,9,12,16],[-5,-1,2,9]],scale:[0,2,4,6,7,9,11],arp:.45,bell:.3,drone:true}
};
function create(){
 let ctx=null,master=null,fxBus=null,noiseBuf=null,verb=null,enabled=true,want=null,current=null,timer=null,ducked=false,isHidden=document.hidden,blocked=false;const buses=new Map();
 function impulse(){const len=ctx.sampleRate*3.4,buf=ctx.createBuffer(2,len,ctx.sampleRate);for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}return buf;}
 function setup(){const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return false;ctx=new AC();const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;master=ctx.createGain();master.gain.value=0;master.connect(comp).connect(ctx.destination);verb=ctx.createConvolver();verb.buffer=impulse();const wet=ctx.createGain();wet.gain.value=.55;verb.connect(wet).connect(master);fxBus=ctx.createGain();fxBus.gain.value=enabled?.8:0;fxBus.connect(comp);const len=ctx.sampleRate;noiseBuf=ctx.createBuffer(1,len,ctx.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<len;i++)nd[i]=Math.random()*2-1;timer=setInterval(tick,90);return true;}
 function trackKey(name){return FILES[name]?'file:'+FILES[name]:'generated:'+name;}
 function activeBus(){return buses.get(trackKey(current));}
 function level(){return !enabled||isHidden?0:ducked?.26:activeBus()?.audio?.88:.55;}
 // Recorded music uses the browser's native media output. Routing it through a
 // suspended/interrupted Web Audio graph can leave iPhone media silently playing.
 function playFile(bus){const a=bus.audio;if(!a||bus.playPending||!enabled||isHidden||bus.ending)return;bus.playPending=true;
  try{Promise.resolve(a.play()).then(()=>{blocked=false;},e=>{if(enabled&&!isHidden&&!bus.ending&&e.name!=='AbortError')blocked=true;}).finally(()=>{bus.playPending=false;});}catch{bus.playPending=false;blocked=true;}}
 function resumeFiles(){if(!enabled||isHidden)return;for(const bus of buses.values())if(!bus.ending&&bus.audio?.paused)playFile(bus);}
 function fileFade(bus,to,sec){const now=performance.now(),f=bus.fade;bus.fade={from:f?f.from+(f.to-f.from)*Math.min(1,(now-f.at)/f.ms):0,to,at:now,ms:sec*1000};}
 function fileVolumes(){const now=performance.now();for(const bus of buses.values())if(bus.audio){const f=bus.fade,mix=f?f.from+(f.to-f.from)*Math.min(1,(now-f.at)/f.ms):1;bus.audio.volume=(!enabled||isHidden?0:ducked?.26:.88)*mix;}}
 function resumeContext(){if(ctx&&ctx.state!=='running'&&ctx.state!=='closed')ctx.resume().catch(()=>{});}
 function pauseFiles(){for(const bus of buses.values())bus.audio?.pause();}
 function ramp(param,value,sec){const t=ctx.currentTime;param.cancelScheduledValues(t);param.setValueAtTime(param.value,t);param.linearRampToValueAtTime(value,t+sec);}
 function env(g,t,peak,attack,hold,release){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.setValueAtTime(peak,t+attack+hold);g.gain.exponentialRampToValueAtTime(.0001,t+attack+hold+release);}
 function out(bus,send){const g=ctx.createGain();g.connect(bus.dry);const s=ctx.createGain();s.gain.value=send;g.connect(s).connect(bus.send);return g;}
 function pad(bus,freqs,t,dur){for(const f of freqs){const g=out(bus,.5),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;lp.Q.value=.4;lp.connect(g);env(g,t,.045,dur*.35,dur*.35,dur*.6);for(const d of [-7,7]){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=d;o.connect(lp);o.start(t);o.stop(t+dur*1.35);}}}
 function pluck(bus,f,t,vel,box){const g=out(bus,.45);env(g,t,.11*vel,.004,0,box?1.6:1.1);for(const [m,type,a] of [[1,box?'sine':'triangle',1],[2,'sine',.35],[box?4:3,'sine',.12]]){const o=ctx.createOscillator(),k=ctx.createGain();o.type=type;o.frequency.value=f*m;k.gain.value=a;o.connect(k).connect(g);o.start(t);o.stop(t+2);}}
 function bell(bus,f,t,vel,len=4){const g=out(bus,.8);env(g,t,.07*vel,.003,0,len);for(const [m,a] of [[1,1],[2.76,.5],[5.4,.25],[8.93,.12]]){const o=ctx.createOscillator(),k=ctx.createGain();o.frequency.value=f*m;k.gain.value=a;o.connect(k).connect(g);o.start(t);o.stop(t+len+.2);}}
 function thump(bus,t,v){const o=ctx.createOscillator(),g=out(bus,.1);o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(42,t+.22);env(g,t,.22*v,.005,0,.32);o.connect(g);o.start(t);o.stop(t+.4);}
 function sustained(bus,sc){const nodes=[];if(sc.drone){for(const n of [sc.root-24,sc.root-12+7]){const o=ctx.createOscillator(),g=out(bus,.3),lfo=ctx.createOscillator(),depth=ctx.createGain();o.type='triangle';o.frequency.value=midi(n);g.gain.value=.035;lfo.frequency.value=.07;depth.gain.value=.015;lfo.connect(depth).connect(g.gain);o.connect(g);o.start();lfo.start();nodes.push(o,lfo);}}
  if(sc.wind){const len=ctx.sampleRate*4,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;const src=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),g=out(bus,.2),lfo=ctx.createOscillator(),depth=ctx.createGain();src.buffer=buf;src.loop=true;bp.type='bandpass';bp.frequency.value=520;bp.Q.value=.9;lfo.frequency.value=.09;depth.gain.value=260;lfo.connect(depth).connect(bp.frequency);g.gain.value=.05;src.connect(bp).connect(g);src.start();lfo.start();nodes.push(src,lfo);}
  return nodes;}
 function fileBus(bus,url){const a=new Audio();a.preload='none';a.loop=true;a.setAttribute('playsinline','');a.src=url;bus.audio=a;
  a.addEventListener('playing',()=>{blocked=false;if(!enabled||isHidden||bus.ending)a.pause();});
  a.addEventListener('error',()=>{if(bus.ending||bus.fileFailed||buses.get(bus.key)!==bus)return;bus.fileFailed=true;a.pause();bus.audio=null;bus.nodes=sustained(bus,bus.sc);bus.next=ctx.currentTime+.1;bus.bar=0;bus.step=0;ramp(master.gain,level(),.6);});
  fileFade(bus,1,2.5);fileVolumes();playFile(bus);return a;}
 function start(name){const key=trackKey(name),existing=buses.get(key);if(existing){existing.name=name;existing.sc=SCENES[name];if(existing.ending){clearTimeout(existing.cleanup);existing.ending=false;if(existing.audio)fileFade(existing,1,1.2);existing.next=Math.max(existing.next,ctx.currentTime+.08);ramp(existing.dry.gain,1,1.2);ramp(existing.send.gain,1,1.2);}return existing;}
  const sc=SCENES[name],bus={key,name,sc,dry:ctx.createGain(),send:ctx.createGain(),bar:0,step:0,next:ctx.currentTime+.15,nodes:[]};bus.dry.gain.value=0;bus.dry.connect(master);bus.send.gain.value=0;bus.send.connect(verb);
  buses.set(key,bus);if(FILES[name])bus.audio=fileBus(bus,FILES[name]);else bus.nodes=sustained(bus,sc);ramp(bus.dry.gain,1,2.5);ramp(bus.send.gain,1,2.5);return bus;}
 function stop(bus){if(bus.ending)return;if(bus.audio)fileFade(bus,0,2.5);ramp(bus.dry.gain,0,2.5);ramp(bus.send.gain,0,2.5);bus.ending=true;bus.cleanup=setTimeout(()=>{if(!bus.ending||buses.get(bus.key)!==bus)return;for(const n of bus.nodes)try{n.stop();}catch{}bus.audio?.pause();bus.mediaSource?.disconnect();bus.dry.disconnect();bus.send.disconnect();buses.delete(bus.key);},2700);}
 // Four steps per beat-pair; chords change every bar of eight steps.
 function schedule(bus){const sc=bus.sc,step=sc.beat/2;while(bus.next<ctx.currentTime+.5){const t=bus.next,chord=sc.chords[bus.bar%sc.chords.length],i=bus.step;
  if(i===0)pad(bus,chord.map(n=>midi(sc.root+n-12)),t,step*8);
  if(sc.pulse&&i%2===0)thump(bus,t,i%4===0?1:.55);
  if(sc.toll&&i===0&&bus.bar%2===0)bell(bus,midi(sc.root-12),t,1.3,6);
  if(Math.random()<sc.arp*(i%2?.55:1)){const n=chord[(i*3+bus.bar)%chord.length]+(i>3?12:0);pluck(bus,midi(sc.root+n),t,.6+Math.random()*.4,sc.box);}
  if(i%4===2&&Math.random()<sc.bell){const n=sc.scale[Math.floor(Math.random()*sc.scale.length)]+24;bell(bus,midi(sc.root+n),t,.5);}
  bus.next+=step;if(++bus.step===8){bus.step=0;bus.bar++;}}}
 // Sound effects: short synthesized voices on their own bus (muted with music, never ducked).
 function fxEnv(t,vol,dur,attack=.004){const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);g.connect(fxBus);return g;}
 function noise(t,dur,vol,type,f0,f1=f0,q=1){const src=ctx.createBufferSource(),f=ctx.createBiquadFilter();src.buffer=noiseBuf;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);src.connect(f).connect(fxEnv(t,vol,dur,.008));src.start(t,Math.random()*.5);src.stop(t+dur+.05);}
 function tone(t,f0,f1,dur,vol,type='sine'){const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);o.connect(fxEnv(t,vol,dur));o.start(t);o.stop(t+dur+.05);}
 function ring(t,freqs,dur,vol){for(const f of freqs)tone(t,f,f*.995,dur,vol/freqs.length);}
 function chime(t,notes,gap,vol,dur=1){notes.forEach((n,i)=>{const f=midi(n),at=t+i*gap;tone(at,f,f,dur,vol);tone(at,f*2.76,f*2.76,dur*.5,vol*.25);});}
 const FX={
  slash:(t,e)=>{const big=e.combo===3;noise(t,big?.2:.13,big?.3:.22,'bandpass',big?2600:3400,big?450:900,1.4);if(big)ring(t+.02,[2300,3450],.18,.05);if(e.counter)tone(t,900,1800,.1,.06,'triangle');},
  hit:(t,e)=>{tone(t,e.boss?110:160,e.boss?45:70,e.boss?.2:.13,.38);noise(t,.04,.14,'highpass',2500);if(e.source==='blade')ring(t,[1850,2780],.13,.07);else if(e.source==='lamp')noise(t,.16,.1,'bandpass',1300,600,2);},
  soul:t=>chime(t,[81,88,93,100],.05,.06,.6),
  dodge:t=>noise(t,.2,.18,'lowpass',600,2600,.7),
  jump:t=>tone(t,260,430,.09,.1),
  magic:t=>{noise(t,.26,.16,'bandpass',900,380,1.2);tone(t,880,880,.4,.04);},
  reap:t=>{noise(t,.32,.3,'bandpass',2600,480,1.1);ring(t+.03,[1200,1800],.3,.04);},
  candle:t=>{chime(t,[76],0,.05,.8);noise(t,.2,.06,'bandpass',1800,900,2);},
  candlePulse:t=>noise(t,.08,.035,'bandpass',2000,1200,3),
  cat:t=>{for(let i=0;i<3;i++)noise(t+i*.035,.03,.08,'highpass',3500);},
  hurt:t=>{tone(t,130,38,.28,.5);noise(t,.16,.28,'lowpass',900,200,.8);tone(t,320,160,.22,.06,'square');},
  warn:t=>{tone(t,330,330,.45,.07);tone(t,495,495,.35,.04);},
  slam:t=>{tone(t,90,34,.36,.45);noise(t,.42,.2,'lowpass',380,90,.7);},
  sweep:t=>{noise(t,.5,.24,'lowpass',260,1400,.8);tone(t,80,40,.45,.35);},
  dive:t=>tone(t,1500,480,.3,.08,'triangle'),
  enemySpell:t=>{noise(t,.32,.14,'lowpass',700,240,.8);tone(t,110,82,.35,.12,'triangle');},
  pillar:t=>{tone(t,70,40,.32,.3);noise(t,.18,.16,'highpass',1800,900);},
  guardSlash:t=>{noise(t,.16,.2,'bandpass',2200,700,1.3);ring(t+.05,[880,1320],.2,.08);},
  blocked:t=>ring(t,[940,1410,2120],.22,.14),
  guardBreak:t=>{noise(t,.28,.3,'highpass',2600,900);tone(t,720,180,.35,.08,'square');},
  level:t=>chime(t,[84,88,91,96],.07,.07,1.2),
  spellLearned:t=>chime(t,[79,83,86],.08,.05,1),
  lost:t=>tone(t,220,92,1.3,.12,'triangle'),
  ui:t=>tone(t,1250,1250,.035,.03),
  choice:t=>chime(t,[74,81],.06,.05,.9)
 };
 function tick(){fileVolumes();if(!ctx||ctx.state!=='running')return;for(const bus of buses.values())if(!bus.ending&&!bus.audio)schedule(bus);}
 function apply(){if(!ctx)return;if(!enabled||isHidden){pauseFiles();ramp(master.gain,0,.3);return;}const key=trackKey(want);for(const bus of buses.values())if(!bus.ending&&bus.key!==key)stop(bus);if(want&&SCENES[want])start(want);current=want;resumeFiles();ramp(master.gain,level(),.6);}
 return{
  scenes:Object.keys(SCENES),
  // Must be called from a user gesture (iOS will not start audio otherwise).
  unlock(){if(!enabled)return;if(!ctx&&!setup())return;resumeContext();apply();},
  setScene(name){if(name===want)return;want=name;apply();},
  sfx(type,e={}){if(!ctx||ctx.state!=='running'||!enabled||!FX[type])return;FX[type](ctx.currentTime+.005,e);},
  setEnabled(on){enabled=on;if(fxBus)ramp(fxBus.gain,on?.8:0,.2);if(on&&!isHidden)resumeContext();apply();fileVolumes();},
  duck(on){if(on===ducked)return;ducked=on;if(ctx)ramp(master.gain,level(),.4);fileVolumes();},
  pause(hidden){isHidden=hidden;if(!ctx)return;if(hidden){pauseFiles();ctx.suspend().catch(()=>{});}else if(enabled){resumeContext();apply();}},
  get state(){const bus=activeBus(),playing=enabled&&!isHidden&&(bus?.audio?!bus.audio.paused&&bus.audio.readyState>=2:!!bus&&ctx?.state==='running');return{playing,blocked,ctx:ctx?.state||'none',scene:current,enabled,buses:[...buses.values()].map(b=>b.name),source:activeBus()?.audio?.src||null};}
 };}
root.AkatsukiMusic={create};})(typeof globalThis!=='undefined'?globalThis:this);
