// 効果音とBGM。音源ファイルを使わず、Web Audio で合成・演奏する。
// スマホは最初のタップまで音を出せないので、タップされた時点で鳴らし始める。
(()=>{
'use strict';
const KEY='sword-sale-audio';
const prefs={se:true,bgm:true};
try{const p=JSON.parse(localStorage.getItem(KEY)||'null');if(p&&typeof p==='object'){prefs.se=p.se!==false;prefs.bgm=p.bgm!==false;}}catch{}
const savePrefs=()=>{try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}};

const SE_VOL=.55,BGM_VOL=.28;
const MUSIC=window.TomoriMusic;
let ac=null,seBus,bgmBus,noiseBuf;
function ensure(){
  if(ac)return ac;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  ac=new AC();
  const comp=ac.createDynamicsCompressor();comp.connect(ac.destination);
  seBus=ac.createGain();seBus.gain.value=prefs.se?SE_VOL:0;seBus.connect(comp);
  bgmBus=ac.createGain();bgmBus.gain.value=musicLevel();bgmBus.connect(comp);
  noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return ac;
}
const ready=()=>ac&&ac.state==='running';

// ---------- 音の部品 ----------
function tone(bus,f,t,dur,o={}){
  const osc=ac.createOscillator(),g=ac.createGain(),vol=o.vol??.2,a=o.attack??.005;
  osc.type=o.type||'square';osc.frequency.setValueAtTime(f,t);
  if(o.to)osc.frequency.exponentialRampToValueAtTime(o.to,t+dur);
  if(o.vib){const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=5.5;lg.gain.value=o.vib;l.connect(lg).connect(osc.frequency);l.start(t);l.stop(t+dur+.1);}
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);
  g.gain.setValueAtTime(vol,t+Math.max(a,dur*(o.hold??.3)));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  osc.connect(g).connect(bus);osc.onended=()=>{osc.disconnect();g.disconnect();};osc.start(t);osc.stop(t+dur+.02);
}
function noise(bus,t,dur,o={}){
  const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain(),vol=o.vol??.2;
  s.buffer=noiseBuf;f.type=o.filter||'bandpass';f.frequency.setValueAtTime(o.freq||2000,t);f.Q.value=o.q??1;
  if(o.to)f.frequency.exponentialRampToValueAtTime(o.to,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(f).connect(g).connect(bus);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};s.start(t,Math.random()*.5);s.stop(t+dur+.02);
}
const midi=n=>{const m=/^([A-G])(#|b)?(\d)$/.exec(n);return 12*(+m[3]+1)+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);};
const hz=m=>440*Math.pow(2,(m-69)/12);
const nhz=n=>hz(midi(n));

// ---------- 効果音 ----------
const SFX={
  tap(t){tone(seBus,1320,t,.05,{type:'triangle',vol:.12});},
  slash(t){noise(seBus,t,.16,{filter:'bandpass',freq:4200,to:700,q:.8,vol:.5});tone(seBus,170,t+.02,.12,{type:'sine',to:55,vol:.45});},
  arrow(t){tone(seBus,1500,t,.12,{type:'triangle',to:600,vol:.18});noise(seBus,t+.06,.08,{filter:'highpass',freq:3500,vol:.3});tone(seBus,220,t+.1,.08,{type:'sine',to:90,vol:.35});},
  light(t){[1047,1568,2093].forEach((f,i)=>tone(seBus,f,t+i*.035,.3,{type:'triangle',vol:.14}));noise(seBus,t,.25,{filter:'highpass',freq:6000,vol:.08});},
  star(t){[784,1047,1319,1568,2093].forEach((f,i)=>tone(seBus,f,t+i*.03,.35,{type:'sine',vol:.13}));tone(seBus,90,t+.12,.5,{type:'sine',to:35,vol:.55});noise(seBus,t+.12,.45,{filter:'lowpass',freq:1200,to:200,vol:.35});},
  fire(t){noise(seBus,t,.38,{filter:'lowpass',freq:1800,to:300,vol:.45});tone(seBus,120,t,.3,{type:'sawtooth',to:60,vol:.12});},
  normal(t){tone(seBus,160,t,.12,{type:'sine',to:60,vol:.45});noise(seBus,t,.08,{filter:'bandpass',freq:1800,vol:.25});},
  big(t){tone(seBus,70,t+.03,.45,{type:'sine',to:32,vol:.6});noise(seBus,t+.03,.3,{filter:'lowpass',freq:900,to:150,vol:.35});},
  break(t){noise(seBus,t,.3,{filter:'highpass',freq:2800,vol:.45});tone(seBus,1400,t,.22,{type:'square',to:320,vol:.12});[2349,3136].forEach((f,i)=>tone(seBus,f,t+.04+i*.05,.25,{type:'triangle',vol:.1}));},
  hurt(t){tone(seBus,200,t,.2,{type:'sawtooth',to:60,vol:.22});noise(seBus,t,.14,{filter:'lowpass',freq:700,vol:.45});},
  heal(t){[523,659,784,1047].forEach((f,i)=>tone(seBus,f,t+i*.07,.32,{type:'sine',vol:.16}));},
  guard(t){tone(seBus,330,t,.16,{type:'square',vol:.1});tone(seBus,495,t,.16,{type:'square',vol:.07});noise(seBus,t,.06,{filter:'highpass',freq:5000,vol:.2});},
  stagger(t){tone(seBus,700,t,.14,{type:'triangle',to:350,vol:.18});tone(seBus,500,t+.13,.16,{type:'triangle',to:250,vol:.16});},
  charge(t){tone(seBus,110,t,.7,{type:'sawtooth',to:440,vol:.13,hold:.8});noise(seBus,t,.7,{filter:'bandpass',freq:300,to:2500,q:2,vol:.18});},
  levelup(t){['C5','E5','G5','C6','E6'].forEach((n,i)=>tone(seBus,nhz(n),t+i*.07,.2,{type:'square',vol:.1}));tone(seBus,nhz('G6'),t+.38,.4,{type:'square',vol:.1});},
};
function sfx(name){
  if(!prefs.se||!ready()||!SFX[name])return;
  SFX[name](ac.currentTime+.005);
}

// ---------- ジングル（勝ち・負け・章クリア）。鳴っている間はBGMを下げる ----------
const STINGERS={
  win:[['G4',0,1],['C5',1,1],['E5',2,1],['G5',3,2],['E5',5,1],['G5',6,1],['C6',7,6]],
  lose:[['E4',0,3],['D4',3,3],['C4',6,3],['B3',9,2],['C4',11,6]],
  ending:[['C5',0,2],['G4',2,1],['C5',3,1],['E5',4,2],['D5',6,2],['G5',8,2],['F5',10,1],['E5',11,1],['D5',12,2],['C5',14,8]],
};
function stinger(name){
  const seq=STINGERS[name];if(!seq||!prefs.se||!ready())return;
  const t=ac.currentTime+.05,step=name==='lose'?.17:.11;
  for(const [n,s,l] of seq){tone(seBus,nhz(n),t+s*step,l*step+.08,{type:'triangle',vol:name==='lose'?.20:.15});if(name!=='lose')tone(seBus,nhz(n)/2,t+s*step,l*step+.08,{type:'triangle',vol:.12});}
  const len=Math.max(...seq.map(([,s,l])=>s+l))*step;
  if(prefs.bgm){duckUntil=Math.max(duckUntil,t+len+.3);applyMusicLevel();}
}

// ---------- BGM：同じ旋律のまま、柔らかい音色と16小節の展開 ----------
let want=null,cur=null,step=0,nextTime=0,timer=null,musicLayer=null;
let sceneScale=1,duckUntil=0;
function musicLevel(){return prefs.bgm?BGM_VOL*sceneScale:0;}
function applyMusicLevel(speed=.12){
 if(!bgmBus)return;
 const t=ac.currentTime,target=musicLevel();
 bgmBus.gain.cancelScheduledValues(t);
 bgmBus.gain.setTargetAtTime(target*(t<duckUntil?.22:1),t,speed);
 if(t<duckUntil)bgmBus.gain.setTargetAtTime(target,duckUntil,.35);
}
function retireMusicLayer(layer){
 if(!layer)return;
 const t=ac.currentTime;
 if(layer.gain.cancelAndHoldAtTime)layer.gain.cancelAndHoldAtTime(t);
 else{const value=layer.gain.value;layer.gain.cancelScheduledValues(t);layer.gain.setValueAtTime(value,t);}
 layer.gain.linearRampToValueAtTime(0,t+.18);
 setTimeout(()=>{try{layer.disconnect();}catch{}},450);
}
function stopMusic(){
 if(timer){clearInterval(timer);timer=null;}
 retireMusicLayer(musicLayer);musicLayer=null;cur=null;
}
function tick(){
 if(!cur||!musicLayer||!ready()||!MUSIC)return;
 const track=MUSIC.TRACKS[cur],duration=60/track.bpm/2;
 if(nextTime<ac.currentTime)nextTime=ac.currentTime+.035;
 while(nextTime<ac.currentTime+.15){MUSIC.renderStep(ac,musicLayer,track,step,nextTime,duration,noiseBuf);nextTime+=duration;step=(step+1)%track.length;}
}
function start(){
 if(!prefs.bgm||!want||!ready()||!MUSIC){stopMusic();return;}
 if(cur===want&&musicLayer)return;
 const t=ac.currentTime;
 retireMusicLayer(musicLayer);musicLayer=ac.createGain();musicLayer.gain.setValueAtTime(0,t);musicLayer.gain.linearRampToValueAtTime(1,t+.25);musicLayer.connect(bgmBus);
 cur=want;step=0;nextTime=t+.035;applyMusicLevel();
 if(!timer)timer=setInterval(tick,25);
 tick();
}
function scene(name,options={}){
 if(!MUSIC?.TRACKS[name])return;
 const scale=options.dialogue?.58:1;
 if(scale!==sceneScale){sceneScale=scale;applyMusicLevel();}
 want=name;start();
}

// ---------- 再生の開始・停止 ----------
// iPhone はマナーモードだと Web Audio の音を消す。無音のメディアを再生し続けて
// 「音楽を再生中」として扱わせると、マナーモードでも鳴る。
let mediaEl=null;
function silentWav(){
  const n=4000,buf=new ArrayBuffer(44+n),v=new DataView(buf),str=(o,t)=>[...t].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  str(0,'RIFF');v.setUint32(4,36+n,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,8000,true);v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);str(36,'data');v.setUint32(40,n,true);
  for(let i=0;i<n;i++)v.setUint8(44+i,128);
  return new Blob([buf],{type:'audio/wav'});
}
function holdMediaSession(){
  try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{}
  if(!prefs.se&&!prefs.bgm){mediaEl?.pause();return;}
  try{
    if(!mediaEl){mediaEl=new Audio(URL.createObjectURL(silentWav()));mediaEl.loop=true;mediaEl.setAttribute('playsinline','');}
    if(mediaEl.paused)mediaEl.play().catch(()=>{});
  }catch{}
}
function unlock(e){
  if(e&&!e.isTrusted)return;
  if(!ensure())return;
  holdMediaSession();
  if(ac.state!=='running')ac.resume().then(start,()=>{});else start();
}
for(const type of ['pointerdown','touchend','click','keydown'])document.addEventListener(type,unlock,true);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&!b.classList.contains('skill-button'))sfx('tap');},true);
document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden){ac.suspend().catch(()=>{});mediaEl?.pause();}else if(prefs.se||prefs.bgm)ac.resume().then(()=>{holdMediaSession();start();},()=>{});});

// ---------- 設定画面 ----------
function bindToggle(id,key,bus,vol){
  const el=document.getElementById(id);if(!el)return;
  el.checked=prefs[key];
  el.addEventListener('change',()=>{
    prefs[key]=el.checked;savePrefs();
    if(ensure()){
      if(key==='bgm'){if(prefs.bgm)unlock();else stopMusic();applyMusicLevel(.04);}
      else{bus().gain.cancelScheduledValues(ac.currentTime);bus().gain.setTargetAtTime(prefs[key]?vol:0,ac.currentTime,.02);}
    }
    if(!prefs.se&&!prefs.bgm)mediaEl?.pause();
  });
}
bindToggle('sound-se','se',()=>seBus,SE_VOL);
bindToggle('sound-bgm','bgm',()=>bgmBus,BGM_VOL);

window.TomoriAudio={sfx,scene,stinger};
})();
