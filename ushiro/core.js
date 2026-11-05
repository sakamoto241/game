(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShadowCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const CATALOGUE={double:{name:'重なる影',text:'自分の足元に、もう一つの長い影。本物が背後にいる間だけ残り続ける。'},steps:{name:'もう一人の足音',text:'自分の歩幅と違う音。単発なら思い込みかもしれない。重なる影と組み合わせて判断する。'},light:{name:'途切れる灯り',text:'青白い蛍光灯の明滅。灯りだけで振り返ると、誰もいないこともある。'},edge:{name:'窓ぎわの人影',text:'視界の端を横切る黒い姿。現れてすぐ消える影は、背後のものとは別の怪異。'},speed:{name:'狂う歩幅',text:'足が重くなったり、少し速くなったりする。焦っても足元の影を見失わないこと。'},laugh:{name:'廊下の笑い声',text:'笑い声のように聞こえる風。声だけを信じると、恐怖に呑まれる。'},red:{name:'赤い残像',text:'背後の気配が迫ると、視界がうっすら赤く染まる。強くなる前に振り返りたい。'},final:{name:'出口のない一秒',text:'出口が近いほど、廊下は静かになる。いつもの見分け方は、最後まで変わらない。'}};
function rng(s){s.random=(Math.imul(1664525,s.random)+1013904223)>>>0;return s.random/4294967296;}
function signal(s,type,data={}){s.signals.push({type,...data});if(s.signals.length>24)s.signals.shift();}
function discover(s,id){if(!s.entries.includes(id)){s.entries.push(id);signal(s,'entry',{id});}}
function cue(s,id,duration=1.2,strength=.6){s.cues.push({id,left:duration,total:duration,strength});discover(s,id);signal(s,'cue',{id,strength});}
function newRun({seed=1,mode='normal'}={}){const initialSeed=(Number(seed)>>>0)||1;return{version:1,phase:'running',mode:mode==='endless'?'endless':'normal',initialSeed,random:initialSeed,time:0,distance:0,target:72,fear:0,lookLeft:0,lookResult:null,lookGhost:false,depart:0,event:null,nextAt:6.4,events:0,fakeStreak:0,finale:false,cues:[],signals:[],entries:[],lastFalse:-99,stats:{banished:0,falseLooks:0,looks:0,combo:0,maxCombo:0,reactions:[]},cause:null,variant:initialSeed%3};}
function level(s){return s.mode==='normal'?clamp(s.distance/s.target,0,1):clamp(s.time/100,0,1);}
function windowFor(s){return s.mode==='normal'?3.8-level(s)*1.3:Math.max(1.9,3.8-s.time*.011);}
function gap(s){return Math.max(2.65,5.7-level(s)*1.8)+rng(s)*1.3;}
function beginEvent(s,final=false){const lv=level(s);let real=final||s.events===0||s.fakeStreak>=2||rng(s)>(.2+lv*.27);const types=['steps','light','edge','speed','laugh'];const first=final?'final':types[Math.floor(rng(s)*types.length)];s.events++;s.fakeStreak=real?0:s.fakeStreak+1;s.event={real,phase:'warning',age:0,warning:final?1.05:.82,window:windowFor(s),activeAt:0,final,first};cue(s,first,final?2:1.3,final?.9:.55+lv*.25);if(!real&&lv>.65&&rng(s)<.35)cue(s,'light',.65,.25);}
function finishEvent(s){s.event=null;s.nextAt=s.time+gap(s);}
function fail(s,cause){s.phase='dead';s.cause=cause;s.variant=(s.initialSeed+Math.floor(s.time*7)+s.stats.falseLooks)%3;signal(s,'dead',{cause});}
function look(s){if(s.phase!=='running'||s.lookLeft>0)return{accepted:false};s.lookLeft=.64;s.stats.looks++;const e=s.event,hit=!!(e?.real&&e.phase==='active');s.lookGhost=hit;
 if(hit){const reaction=Math.max(0,s.time-e.activeAt);s.lookResult='banished';s.depart=.85;s.stats.banished++;s.stats.combo++;s.stats.maxCombo=Math.max(s.stats.maxCombo,s.stats.combo);s.stats.reactions.push(reaction);s.fear=Math.max(0,s.fear-5);finishEvent(s);signal(s,'banish',{reaction});}
 else{s.lookResult='empty';s.stats.falseLooks++;s.stats.combo=0;s.lastFalse=s.time;s.fear=Math.min(100,s.fear+26);signal(s,'empty');if(s.fear>=100)fail(s,'fear');}
 return{accepted:true,hit};}
function step(s,seconds){if(s.phase!=='running')return;const dt=clamp(Number(seconds)||0,0,.1);s.time+=dt;s.lookLeft=Math.max(0,s.lookLeft-dt);s.depart=Math.max(0,s.depart-dt);for(const c of s.cues)c.left-=dt;s.cues=s.cues.filter(c=>c.left>0);
 const speedCue=s.cues.some(c=>c.id==='speed');const speed=(speedCue?.94:1)*(s.lookLeft>0?.91:1);s.distance+=dt*1.2*speed;if(s.mode==='normal')s.distance=Math.min(s.target,s.distance);
 if(s.time-s.lastFalse>3&&!s.event&&s.lookLeft<=0)s.fear=Math.max(0,s.fear-dt*.32);
 const e=s.event;
 if(e){if(e.phase==='warning'){if(s.lookLeft<=0)e.age+=dt;if(e.age>=e.warning){if(e.real){e.phase='active';e.age=0;e.activeAt=s.time;discover(s,'double');signal(s,'approach',{final:e.final});if(level(s)>.5)cue(s,e.first==='light'?'steps':'light',1.4,.7);}else{e.phase='fake';e.age=0;}}}
 else if(e.phase==='fake'){e.age+=dt;if(e.age>=.65)finishEvent(s);}
 else{e.age+=dt;if(e.age>=e.window)fail(s,'caught');else if(e.age>e.window*.66&&!s.cues.some(c=>c.id==='red'))cue(s,'red',e.window*.34,.6);}}
 if(s.phase!=='running')return;
 if(!s.event){if(s.mode==='normal'&&!s.finale&&s.time>=52){s.finale=true;beginEvent(s,true);}else if(s.time>=s.nextAt&&(s.mode==='endless'||s.time<49.5))beginEvent(s);}
 if(s.mode==='normal'&&s.distance>=s.target&&s.finale&&!s.event){s.phase='clear';signal(s,'clear');}}
function danger(s){return s.event?.real&&s.event.phase==='active'?clamp(s.event.age/s.event.window,0,1):0;}
function hasGhost(s){return !!(s.event?.real&&s.event.phase==='active');}
function score(s){return Math.max(0,Math.floor(s.distance*10)+s.stats.banished*120+s.stats.maxCombo*25+s.stats.reactions.reduce((sum,r)=>sum+Math.round(100*clamp(1-r/.9,0,1)),0)-s.stats.falseLooks*60+(s.phase==='clear'?500:0));}
function grade(s){if(s.phase!=='clear')return s.mode==='endless'?`${Math.floor(s.distance)}m`:'—';const avg=s.stats.reactions.length?s.stats.reactions.reduce((a,b)=>a+b,0)/s.stats.reactions.length:9;return s.stats.falseLooks===0&&avg<.85?'S':s.stats.falseLooks<=2?'A':'B';}
function takeSignals(s){const out=s.signals;s.signals=[];return out;}
function readProfile(raw){const p={version:1,cleared:false,bestNormal:0,bestEndless:0,plays:0,entries:[],last:null};try{const d=typeof raw==='string'?JSON.parse(raw):raw;if(!d||d.version!==1)return p;p.cleared=d.cleared===true;for(const k of ['bestNormal','bestEndless','plays'])p[k]=Number.isFinite(d[k])?clamp(Math.floor(d[k]),0,9999999):0;p.entries=Array.isArray(d.entries)?[...new Set(d.entries.filter(k=>Object.hasOwn(CATALOGUE,k)))]:[];if(d.last&&['clear','dead'].includes(d.last.phase)&&['normal','endless'].includes(d.last.mode))p.last={phase:d.last.phase,mode:d.last.mode,score:Number.isFinite(d.last.score)?clamp(d.last.score,0,9999999):0};}catch{}return p;}
return{CATALOGUE,clamp,newRun,level,windowFor,beginEvent,step,look,danger,hasGhost,score,grade,takeSignals,readProfile};
});
