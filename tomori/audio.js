// 効果音とBGM。音源ファイルを使わず、Web Audio で合成・演奏する。
// スマホは最初のタップまで音を出せないので、タップされた時点で鳴らし始める。
(()=>{
'use strict';
const KEY='sword-sale-audio';
const prefs={se:true,bgm:true};
try{const p=JSON.parse(localStorage.getItem(KEY)||'null');if(p&&typeof p==='object'){prefs.se=p.se!==false;prefs.bgm=p.bgm!==false;}}catch{}
const savePrefs=()=>{try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}};

const SE_VOL=.55,BGM_VOL=.3;
let ac=null,seBus,bgmBus,noiseBuf;
function ensure(){
  if(ac)return ac;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  ac=new AC();
  const comp=ac.createDynamicsCompressor();comp.connect(ac.destination);
  seBus=ac.createGain();seBus.gain.value=prefs.se?SE_VOL:0;seBus.connect(comp);
  bgmBus=ac.createGain();bgmBus.gain.value=prefs.bgm?BGM_VOL:0;bgmBus.connect(comp);
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
  osc.connect(g).connect(bus);osc.start(t);osc.stop(t+dur+.02);
}
function noise(bus,t,dur,o={}){
  const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain(),vol=o.vol??.2;
  s.buffer=noiseBuf;f.type=o.filter||'bandpass';f.frequency.setValueAtTime(o.freq||2000,t);f.Q.value=o.q??1;
  if(o.to)f.frequency.exponentialRampToValueAtTime(o.to,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(f).connect(g).connect(bus);s.start(t,Math.random()*.5);s.stop(t+dur+.02);
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
  for(const [n,s,l] of seq){tone(seBus,nhz(n),t+s*step,l*step+.08,{type:name==='lose'?'triangle':'square',vol:name==='lose'?.22:.11});if(name!=='lose')tone(seBus,nhz(n)/2,t+s*step,l*step+.08,{type:'triangle',vol:.12});}
  const len=Math.max(...seq.map(([,s,l])=>s+l))*step;
  if(prefs.bgm){bgmBus.gain.cancelScheduledValues(ac.currentTime);bgmBus.gain.setTargetAtTime(BGM_VOL*.15,ac.currentTime,.05);bgmBus.gain.setTargetAtTime(BGM_VOL,t+len+.3,.6);}
}

// ---------- BGM ----------
// 1マス＝8分音符。メロディは「開始マス 音 長さ」。和音は小節ごと（配列なら半小節ずつ）。
const CH={F:['F2','F3','A3','C4'],C:['C2','C3','E3','G3'],Dm:['D2','D3','F3','A3'],Bb:['Bb1','Bb2','D3','F3'],Am:['A1','A2','C3','E3'],G:['G1','G2','B2','D3'],Em:['E2','E3','G3','B3'],E:['E2','E3','G#3','B3'],Gm:['G1','G2','Bb2','D3'],A:['A1','A2','C#3','E3']};
const TRACKS={
  // 古道具屋：のんびりした昼下がり
  shop:{bpm:92,chords:['F','C','Dm','Bb','F','C',['Bb','C'],'F'],lead:'triangle',leadVol:.2,vib:3,
    melody:'0 A4 2,2 C5 2,4 A4 1,5 G4 1,6 F4 2,8 G4 2,10 E4 2,12 C4 4,16 F4 2,18 A4 2,20 D5 2,22 C5 1,23 Bb4 1,24 A4 4,28 G4 4,32 A4 2,34 C5 2,36 F5 2,38 E5 1,39 D5 1,40 C5 3,43 Bb4 1,44 A4 2,46 G4 2,48 F4 2,50 G4 2,52 A4 2,54 Bb4 2,56 A4 2,58 G4 2,60 F4 4',
    arp:[1,2,3,2,1,2,3,2],arpVol:.05,bass:[[0,0,3],[4,1,3]],drums:{h:[2,6]},hatVol:.04},
  // 道中の戦闘：軽快に
  battle:{bpm:144,chords:['Am','F','G','Em','Am','F','G','E'],lead:'square',leadVol:.09,vib:0,
    melody:'0 A4 1,1 C5 1,2 E5 2,4 D5 1,5 C5 1,6 B4 2,8 A4 3,11 G4 1,12 A4 2,14 C5 2,16 B4 1,17 D5 1,18 G5 2,20 F5 1,21 E5 1,22 D5 2,24 E5 6,30 B4 2,32 A4 1,33 C5 1,34 E5 2,36 A5 2,38 G5 1,39 E5 1,40 F5 2,42 E5 2,44 D5 2,46 C5 2,48 B4 2,50 D5 2,52 G5 2,54 F5 2,56 E5 4,60 G#4 2,62 B4 2',
    arp:[1,3,2,3,1,3,2,3],arpVol:.035,bass:[[0,0,1],[1,0,1],[2,1,1],[3,0,1],[4,0,1],[5,0,1],[6,1,1],[7,0,1]],bassUp:12,drums:{k:[0,3,4],s:[2,6],h:[0,1,2,3,4,5,6,7]},hatVol:.035},
  // ボス戦：重く、急かす
  boss:{bpm:160,chords:['Dm','Dm','Bb','C','Dm','Dm','Gm','A'],lead:'sawtooth',leadVol:.06,vib:0,
    melody:'0 D5 2,2 A4 2,4 F5 2,6 E5 1,7 D5 1,8 C#5 3,11 D5 1,12 E5 4,16 F5 2,18 D5 2,20 Bb4 2,22 D5 2,24 E5 2,26 C5 2,28 G5 4,32 A5 2,34 F5 2,36 D5 2,38 A4 2,40 Bb4 1,41 A4 1,42 G4 1,43 F4 1,44 E4 4,48 G4 2,50 Bb4 2,52 D5 2,54 G5 2,56 A5 6,62 C#5 2',
    arp:[1,1,2,1,3,1,2,1],arpVol:.03,bass:[[0,0,1],[1,0,1],[2,1,1],[3,0,1],[4,0,1],[5,0,1],[6,1,1],[7,0,1]],bassUp:12,drums:{k:[0,2,4,6],s:[2,6],h:[0,1,2,3,4,5,6,7]},hatVol:.045},
};
for(const T of Object.values(TRACKS)){
  T.notes=T.melody.split(',').map(s=>{const [st,n,l]=s.trim().split(' ');return{st:+st,f:nhz(n),l:+l};});
  T.len=T.chords.length*8;
}
const chordAt=(T,step)=>{const c=T.chords[Math.floor(step/8)];return CH[Array.isArray(c)?c[step%8<4?0:1]:c];};

let want=null,cur=null,step=0,nextTime=0,timer=null;
function scheduleStep(T,s,t,dur){
  const inBar=s%8,ch=chordAt(T,s);
  for(const n of T.notes)if(n.st===s)tone(bgmBus,n.f,t,n.l*dur*.95,{type:T.lead,vol:T.leadVol,vib:T.vib,hold:.6,attack:.01});
  const a=T.arp[inBar];if(a!=null)tone(bgmBus,nhz(ch[a]),t,dur*.9,{type:'square',vol:T.arpVol,hold:.1});
  for(const [b,which,l] of T.bass)if(b===inBar)tone(bgmBus,nhz(ch[0])*(which&&T.bassUp?2:which?1.5:1),t,l*dur*.9,{type:'triangle',vol:.3,hold:.5});
  const dr=T.drums;
  if(dr.k?.includes(inBar))tone(bgmBus,150,t,.14,{type:'sine',to:45,vol:.45});
  if(dr.s?.includes(inBar)){noise(bgmBus,t,.13,{filter:'bandpass',freq:1800,vol:.22});tone(bgmBus,190,t,.06,{type:'triangle',vol:.12});}
  if(dr.h?.includes(inBar))noise(bgmBus,t,.035,{filter:'highpass',freq:7000,vol:T.hatVol});
}
function tick(){
  if(!cur||!ready())return;
  const T=TRACKS[cur],dur=60/T.bpm/2;
  if(nextTime<ac.currentTime)nextTime=ac.currentTime+.05;
  while(nextTime<ac.currentTime+.15){scheduleStep(T,step,nextTime,dur);nextTime+=dur;step=(step+1)%T.len;}
}
function start(){
  if(!prefs.bgm||!want||!ready()){cur=null;return;}
  if(cur===want)return;
  if(cur){bgmBus.gain.cancelScheduledValues(ac.currentTime);bgmBus.gain.setValueAtTime(0,ac.currentTime+.12);bgmBus.gain.setTargetAtTime(BGM_VOL,ac.currentTime+.15,.3);}
  cur=want;step=0;nextTime=ac.currentTime+.15;
  if(!timer)timer=setInterval(tick,25);
}
function scene(name){if(!TRACKS[name])return;want=name;start();}

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
  if(!prefs.se&&!prefs.bgm)return;
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
document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden){ac.suspend();mediaEl?.pause();}else if(cur||want)ac.resume().then(start,()=>{});});

// ---------- 設定画面 ----------
function bindToggle(id,key,bus,vol){
  const el=document.getElementById(id);if(!el)return;
  el.checked=prefs[key];
  el.addEventListener('change',()=>{
    prefs[key]=el.checked;savePrefs();
    if(ensure()){bus().gain.cancelScheduledValues(ac.currentTime);bus().gain.setValueAtTime(prefs[key]?vol:0,ac.currentTime);}
    if(key==='bgm'){if(prefs.bgm){cur=null;unlock();}else cur=null;}
  });
}
bindToggle('sound-se','se',()=>seBus,SE_VOL);
bindToggle('sound-bgm','bgm',()=>bgmBus,BGM_VOL);

window.TomoriAudio={sfx,scene,stinger};
})();
