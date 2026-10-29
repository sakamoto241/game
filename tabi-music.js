/* 木漏れ日のお茶会 — an original 32-bar, 3/4 miniature for Lili's journey. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TabiMusic=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TEMPO=76,BEAT=60/TEMPO,BAR=BEAT*3;
const NOTE={C3:130.8128,D3:146.8324,E3:164.8138,F3:174.6141,G3:195.9977,A3:220,B3:246.9417,C4:261.6256,D4:293.6648,E4:329.6276,F4:349.2282,G4:391.9954,A4:440,B4:493.8833,C5:523.2511,D5:587.3295,E5:659.2551,F5:698.4565,G5:783.9909,A5:880,C6:1046.5023};
const CHORDS={C:['C3','E4','G4','B4'],G:['B3','D4','G4','A4'],Am:['A3','C4','E4','G4'],Em:['E3','G4','B4','D5'],F:['F3','A3','C4','E4'],CE:['E3','G3','C4','E4'],Dm:['D3','F4','A4','C5'],Gs:['G3','C4','D4','A4'],Cend:['C3','E4','G4','C5']};
// [beat offset, pitch, duration in beats]; rests are intentional spaces.
const A=[
 [[0,'E5',1.25],[1.5,'D5',.4],[2,'C5',.8]],
 [[0,'D5',.8],[1,'B4',.7],[2,'G4',.8]],
 [[0,'A4',1.65],[2,'C5',.8]],
 [[0,'G4',.8],[1.5,'B4',.4],[2,'E5',.8]],
 [[0,'A4',.8],[1,'C5',.8],[2,'E5',.8]],
 [[0,'G4',1.6],[2,'E4',.8]],
 [[0,'F4',1.6],[2,'A4',.8]],
 [[0,'G4',2.5]]
];
const B=[
 [[0,'C5',.85],[1,'D5',.65],[2,'E5',.8]],
 [[0,'D5',1.6],[2,'B4',.8]],
 [[0,'C5',1.25],[1.5,'B4',.4],[2,'A4',.8]],
 [[0,'B4',2.35]],
 [[0,'A4',.8],[1,'C5',.8],[2,'F5',.8]],
 [[0,'E5',1.5],[2,'D5',.8]],
 [[0,'D5',.75],[1,'C5',.75],[2,'A4',.7]],
 [[0,'B4',2.4]]
];
const AV=[
 [[0,'E5',1.4],[1.75,'D5',.35],[2.25,'C5',.6]],
 [[0,'B4',.8],[1,'D5',.8],[2,'G4',.8]],
 [[0,'A4',1.4],[1.75,'B4',.35],[2.25,'C5',.6]],
 [[0,'B4',1.5],[2,'G4',.8]],
 [[0,'C5',1],[1.5,'E5',1.1]],
 [[0,'G4',1.5],[2,'E4',.8]],
 [[0,'F4',.8],[1,'A4',.8],[2,'C5',.7]],
 [[0,'B4',1.2],[1.5,'G4',1.2]]
];
const C=[
 [[0,'A4',1.6],[2,'C5',.8]],
 [[0,'B4',.8],[1,'A4',.7],[2,'G4',.7]],
 [[0,'E5',1.6],[2,'C5',.8]],
 [[0,'D5',.8],[1.5,'B4',1.2]],
 [[0,'A4',.85],[1,'G4',.85],[2,'F4',.8]],
 [[0,'E4',1.5],[2,'G4',.8]],
 [[0,'D5',1],[1.5,'B4',1]],
 [[0,'C5',2.4]]
];
const progression=[...Array(3).fill(['C','G','Am','Em','F','CE','Dm','Gs']).flat(), 'F','G','Am','Em','Dm','CE','Gs','Cend'];
const melodies=[...A,...B,...AV,...C];
function eventsForBar(index){
 const i=((index%32)+32)%32,chord=CHORDS[progression[i]],events=[];
 for(const [at,pitch,len] of melodies[i])events.push({instrument:'bell',at:at*BEAT,freq:NOTE[pitch],duration:len*BEAT+.35,velocity:.84+(i%4===0?.06:0),pan:-.06});
 events.push({instrument:'bass',at:0,freq:NOTE[chord[0]],duration:BEAT*2.65,velocity:.9,pan:0});
 // The accompaniment moves gently on beats two and three, with tiny natural offsets.
 for(const [beat,tone] of [[1,1],[2,2]])events.push({instrument:'felt',at:beat*BEAT+.025,freq:NOTE[chord[tone]],duration:BEAT*1.6,velocity:.45,pan:beat===1?-.3:.3});
 if(i%2===0)events.push({instrument:'felt',at:2.5*BEAT+.02,freq:NOTE[chord[3]],duration:BEAT*1.2,velocity:.24,pan:.2});
 for(const pitch of chord.slice(1,4))events.push({instrument:'pad',at:0,freq:NOTE[pitch]/2,duration:BAR+.3,velocity:.32,pan:.13});
 return events.sort((a,b)=>a.at-b.at);
}
function impulse(ctx){
 const length=Math.floor(ctx.sampleRate*1.65),buffer=ctx.createBuffer(2,length,ctx.sampleRate);let seed=17417;
 for(let channel=0;channel<2;channel++){const out=buffer.getChannelData(channel);let smooth=0;for(let i=0;i<length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/4294967296*2-1;smooth=smooth*.63+n*.37;out[i]=smooth*Math.pow(1-i/length,2.7)*.48;}}return buffer;
}
function makeGraph(ctx,volume=.7){
 const input=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),room=ctx.createConvolver(),filter=ctx.createBiquadFilter(),compressor=ctx.createDynamicsCompressor(),master=ctx.createGain();
 dry.gain.value=.88;wet.gain.value=.15;room.buffer=impulse(ctx);filter.type='lowpass';filter.frequency.value=4800;filter.Q.value=.4;
 compressor.threshold.value=-22;compressor.knee.value=18;compressor.ratio.value=2.2;compressor.attack.value=.012;compressor.release.value=.35;master.gain.value=volume;
 input.connect(dry);dry.connect(filter);input.connect(room);room.connect(wet);wet.connect(filter);filter.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
 return{input,master};
}
function voice(ctx,graph,event,when,track){
 const at=Math.max(ctx.currentTime,when),duration=Math.max(.08,event.duration),end=at+duration+.08,gain=ctx.createGain(),panner=ctx.createStereoPanner(),sources=[];
 panner.pan.value=event.pan||0;gain.connect(panner);panner.connect(graph.input);
 const type=event.instrument,peak=(type==='bell'?.17:type==='bass'?.09:type==='felt'?.075:.028)*(event.velocity??1);
 gain.gain.setValueAtTime(0,at);
 if(type==='pad'){gain.gain.linearRampToValueAtTime(peak,at+.32);gain.gain.setValueAtTime(peak*.65,at+Math.max(.33,duration-.5));gain.gain.linearRampToValueAtTime(0,at+duration);}
 else {gain.gain.linearRampToValueAtTime(peak,at+(type==='bass'?.035:.015));gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak*.2),at+Math.min(.35,duration*.4));gain.gain.exponentialRampToValueAtTime(.0001,at+duration);gain.gain.linearRampToValueAtTime(0,end);}
 const partials=type==='bell'?[[1,.83],[2.01,.13],[3.98,.025]]:type==='felt'?[[1,.83],[2,.13],[3,.02]]:type==='bass'?[[1,.88],[2,.08]]:[[1,.85],[2,.08]];
 let remaining=partials.length;const record={stop(time){const now=ctx.currentTime;if(gain.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(now);else{const held=gain.gain.value;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(held,now);}gain.gain.linearRampToValueAtTime(0,Math.max(now+.002,time-.003));for(const o of sources){try{o.stop(time);}catch(_){}}}};if(track)track.add(record);
 for(const [ratio,amplitude] of partials){const o=ctx.createOscillator(),weight=ctx.createGain();o.type='sine';o.frequency.value=event.freq*ratio;weight.gain.value=amplitude;o.connect(weight);weight.connect(gain);sources.push(o);o.onended=()=>{o.disconnect();weight.disconnect();if(--remaining===0){gain.disconnect();panner.disconnect();if(track)track.delete(record);}};o.start(at);o.stop(end);}
 return record;
}
class Player{
 constructor(options={}){this.ctx=null;this.graph=null;this.on=false;this.timer=null;this.next=0;this.bar=0;this.volume=options.volume??.7;this.sources=new Set();this.busy=false;this.generation=0;}
 init(){if(this.ctx)return;const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)throw Error('このブラウザでは音楽を再生できません。');this.ctx=new C();this.graph=makeGraph(this.ctx,0);}
 clear(){if(this.timer!==null)clearInterval(this.timer);this.timer=null;for(const source of this.sources)source.stop(this.ctx.currentTime+.035);}
 schedule(){if(!this.on||!this.ctx||this.ctx.state!=='running'||globalThis.document?.hidden)return;if(this.next<this.ctx.currentTime)this.next=this.ctx.currentTime+.04;while(this.next<this.ctx.currentTime+.25){for(const e of eventsForBar(this.bar))voice(this.ctx,this.graph,e,this.next+e.at,this.sources);this.bar=(this.bar+1)%32;this.next+=BAR;}}
 async enable(){this.init();const token=++this.generation;this.on=true;this.clear();await this.ctx.resume();if(token!==this.generation||!this.on)return;this.bar=0;this.next=this.ctx.currentTime+.06;this.graph.master.gain.cancelScheduledValues(this.ctx.currentTime);this.graph.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.14);this.schedule();this.timer=setInterval(()=>this.schedule(),40);}
 async disable(){this.on=false;++this.generation;if(!this.ctx)return;this.clear();this.graph.master.gain.cancelScheduledValues(this.ctx.currentTime);this.graph.master.gain.setTargetAtTime(0,this.ctx.currentTime,.015);const token=this.generation;await new Promise(resolve=>setTimeout(resolve,90));if(token===this.generation&&!this.on)await this.ctx.suspend();}
 async background(hidden){if(!this.on||!this.ctx)return;const token=++this.generation;this.clear();if(hidden){this.graph.master.gain.cancelScheduledValues(this.ctx.currentTime);this.graph.master.gain.setValueAtTime(0,this.ctx.currentTime);await this.ctx.suspend();return;}await this.ctx.resume();if(token!==this.generation||!this.on)return;this.next=this.ctx.currentTime+.06;this.graph.master.gain.cancelScheduledValues(this.ctx.currentTime);this.graph.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.1);this.schedule();this.timer=setInterval(()=>this.schedule(),40);}
 note(freq,duration=.4,when){if(!this.on||!this.ctx||this.ctx.state!=='running'||globalThis.document?.hidden)return;voice(this.ctx,this.graph,{instrument:'felt',freq,duration:Math.min(1,duration+.2),velocity:.36,pan:0},when??this.ctx.currentTime,this.sources);}
 chime(){if(!this.on||!this.ctx)return;[523.2511,659.2551,783.9909].forEach((freq,i)=>this.note(freq,.7,this.ctx.currentTime+i*.17));}
}
// Also used by offline-render verification, so the score and instruments stay identical.
function render(ctx,seconds=32*BAR+2){const graph=makeGraph(ctx,.7);for(let b=0;b<32&&b*BAR<seconds-1;b++)for(const e of eventsForBar(b))voice(ctx,graph,e,.15+b*BAR+e.at);return graph;}
return{Player,render,eventsForBar,TEMPO,BEAT,BAR,DURATION:32*BAR,TITLE:'木漏れ日のお茶会'};
});
