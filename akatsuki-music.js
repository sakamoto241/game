/* 夜明けに、わたしを燃やして — background music.
   Each scene is generated live with Web Audio (no audio files needed). When a recorded track is
   listed in FILES, that file loops instead. Scenes cross-fade; nothing plays before a user gesture. */
(function(root){'use strict';
// Recorded tracks override the generated ones, e.g. town:'akatsuki-bgm-town.mp3'.
const FILES={};
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
 let ctx=null,master=null,verb=null,enabled=true,want=null,current=null,timer=null,ducked=false;const buses=new Map();
 function impulse(){const len=ctx.sampleRate*3.4,buf=ctx.createBuffer(2,len,ctx.sampleRate);for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}return buf;}
 function setup(){const AC=root.AudioContext||root.webkitAudioContext;if(!AC)return false;ctx=new AC();const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;master=ctx.createGain();master.gain.value=0;master.connect(comp).connect(ctx.destination);verb=ctx.createConvolver();verb.buffer=impulse();const wet=ctx.createGain();wet.gain.value=.55;verb.connect(wet).connect(master);timer=setInterval(tick,90);return true;}
 function level(){return !enabled?0:ducked?.22:.55;}
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
 function fileBus(bus,url){const a=new Audio(url);a.loop=true;a.crossOrigin='anonymous';const src=ctx.createMediaElementSource(a);src.connect(bus.dry);a.play().catch(()=>{});return a;}
 function start(name){const sc=SCENES[name],bus={name,sc,dry:ctx.createGain(),send:ctx.createGain(),bar:0,step:0,next:ctx.currentTime+.15,nodes:[]};bus.dry.gain.value=0;bus.dry.connect(master);bus.send.gain.value=0;bus.send.connect(verb);
  if(FILES[name])bus.audio=fileBus(bus,FILES[name]);else bus.nodes=sustained(bus,sc);ramp(bus.dry.gain,1,2.5);ramp(bus.send.gain,1,2.5);buses.set(name,bus);return bus;}
 function stop(bus){ramp(bus.dry.gain,0,2.5);ramp(bus.send.gain,0,2.5);bus.ending=true;setTimeout(()=>{for(const n of bus.nodes)try{n.stop();}catch{}bus.audio?.pause();bus.dry.disconnect();bus.send.disconnect();buses.delete(bus.name);},2700);}
 // Four steps per beat-pair; chords change every bar of eight steps.
 function schedule(bus){const sc=bus.sc,step=sc.beat/2;while(bus.next<ctx.currentTime+.5){const t=bus.next,chord=sc.chords[bus.bar%sc.chords.length],i=bus.step;
  if(i===0)pad(bus,chord.map(n=>midi(sc.root+n-12)),t,step*8);
  if(sc.pulse&&i%2===0)thump(bus,t,i%4===0?1:.55);
  if(sc.toll&&i===0&&bus.bar%2===0)bell(bus,midi(sc.root-12),t,1.3,6);
  if(Math.random()<sc.arp*(i%2?.55:1)){const n=chord[(i*3+bus.bar)%chord.length]+(i>3?12:0);pluck(bus,midi(sc.root+n),t,.6+Math.random()*.4,sc.box);}
  if(i%4===2&&Math.random()<sc.bell){const n=sc.scale[Math.floor(Math.random()*sc.scale.length)]+24;bell(bus,midi(sc.root+n),t,.5);}
  bus.next+=step;if(++bus.step===8){bus.step=0;bus.bar++;}}}
 function tick(){if(!ctx||ctx.state!=='running')return;for(const bus of buses.values())if(!bus.ending&&!bus.audio)schedule(bus);}
 function apply(){if(!ctx)return;if(want!==current){for(const bus of buses.values())if(!bus.ending)stop(bus);if(want&&SCENES[want])start(want);current=want;}ramp(master.gain,level(),.6);}
 return{
  scenes:Object.keys(SCENES),
  // Must be called from a user gesture (iOS will not start audio otherwise).
  unlock(){if(!enabled)return;if(!ctx&&!setup())return;if(ctx.state==='suspended')ctx.resume();apply();},
  setScene(name){if(name===want)return;want=name;apply();},
  setEnabled(on){enabled=on;if(on&&ctx?.state==='suspended')ctx.resume();apply();},
  duck(on){if(on===ducked)return;ducked=on;if(ctx)ramp(master.gain,level(),.4);},
  pause(hidden){if(!ctx)return;if(hidden)ctx.suspend();else if(enabled)ctx.resume();},
  get state(){return{ctx:ctx?.state||'none',scene:current,enabled,buses:[...buses.keys()]};}
 };}
root.AkatsukiMusic={create};})(typeof globalThis!=='undefined'?globalThis:this);
