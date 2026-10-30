/* Combat and timing are deterministic; rendering never applies damage. */
(function(root){'use strict';
const W=1040,MAX_HP=1440;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function create(mode='normal'){return{mode:mode==='hard'?'hard':'normal',status:'fight',time:0,clock:0,events:[],hitstop:0,slow:0,locked:false,ending:0,buffer:{attack:0,dodge:0,ult:0},p:{x:425,y:0,face:1,hp:6,maxHp:6,inv:0,attackCD:0,attack:null,chain:-1,chainAge:0,parry:0,parryCD:0,dash:0,dashCD:0,dashDir:1,gauge:0,ult:0,ultHit:false,hurt:0},b:{x:740,hp:mode==='hard'?1900:MAX_HP,maxHp:mode==='hard'?1900:MAX_HP,phase:1,next:.85,pattern:0,attack:null,stun:0,flash:0},bullets:[],stats:{hits:0,maxChain:0,chain:0,parries:0,perfects:0,taken:0,ults:0,damage:0},serial:0};}
function emit(r,type,data={}){r.events.push({type,...data});}
function gain(r,n){r.p.gauge=Math.min(100,r.p.gauge+n);}
function hitBoss(r,n,kind='slash'){const b=r.b;if(b.hp<=0)return;const damage=Math.min(b.hp,n);b.hp-=damage;b.flash=.12;r.stats.damage+=damage;r.stats.hits++;r.stats.chain++;r.stats.maxChain=Math.max(r.stats.maxChain,r.stats.chain);gain(r,kind==='reflect'?12:kind==='ult'?0:6);emit(r,'hit',{damage,kind,x:b.x});r.hitstop=Math.max(r.hitstop,kind==='ult'?.11:kind==='dash'?.065:.035);
 if(b.hp<=0){r.status='finish';r.ending=.85;r.bullets=[];b.attack=null;emit(r,'fatal',{kind,x:b.x});return;}
 const phase=b.hp/b.maxHp<.3?3:b.hp/b.maxHp<.65?2:1;if(phase>b.phase){b.phase=phase;b.next=.85;b.attack=null;b.stun=.65;emit(r,'phase',{phase});}
}
function hurt(r,source){const p=r.p;if(p.inv>0||p.dash>0||p.ult>0||r.status!=='fight')return false;p.hp--;p.inv=1.05;p.hurt=.26;r.stats.taken++;r.stats.chain=0;r.hitstop=Math.max(r.hitstop,.09);emit(r,'hurt',{source,x:p.x});if(p.hp<=0){r.status='lost';emit(r,'lost');}return true;}
function danger(r){const p=r.p,b=r.b,a=b.attack;if(a&&a.left<=.18&&a.left>0&&(a.kind==='sweep'||a.kind==='rush'||a.kind==='slam'&&Math.abs(p.x-a.target)<125))return true;return r.bullets.some(v=>!v.reflected&&Math.abs(v.x-p.x)<95&&v.y<125&&v.y>0&&Math.sign(v.vx)===Math.sign(p.x-v.x));}
function startAttack(r,manual){const p=r.p,chain=p.chainAge<.85?(p.chain+1)%3:0;p.chain=chain;p.chainAge=0;p.attack={step:chain,t:0,hit:false,dash:p.dash>0};p.attackCD=[.33,.37,.52][chain];emit(r,'attack',{step:chain,dash:p.dash>0,x:p.x,face:p.face});}
function beginBoss(r){const b=r.b,fast=r.mode==='hard'?.85:1,lists=b.phase===1?['slam','orbs','sweep']:b.phase===2?['orbs','slam','rush','sweep']:['rush','orbs','sweep','slam'];const kind=lists[b.pattern++%lists.length],duration=(kind==='orbs'?.7:kind==='rush'?.85:kind==='sweep'?.9:.95)*(b.phase===3?.82:1)*fast;b.attack={kind,total:duration,left:duration,target:r.p.x};emit(r,'warning',{kind,target:r.p.x,duration});}
function executeBoss(r,a){const b=r.b,p=r.p;emit(r,'impact',{kind:a.kind,target:a.target});if(a.kind==='slam'){if(Math.abs(p.x-a.target)<115)hurt(r,'slam');if(b.phase>=2)r.bullets.push({id:++r.serial,x:a.target,y:35,vx:p.x<a.target?-240:240,vy:0,life:2.5,reflected:false});}
 if(a.kind==='sweep'){hurt(r,'sweep');}
 if(a.kind==='rush'){if(p.inv<=0&&p.dash<=0)hurt(r,'rush');b.x=clamp(p.x+(p.x<b.x?-100:100),140,900);}
 if(a.kind==='orbs'){const n=b.phase===1?3:5,angle=Math.atan2(52-125,p.x-b.x);for(let i=0;i<n;i++){const q=angle+(i-(n-1)/2)*.075,speed=(b.phase===3?350:285)*(r.mode==='hard'?1.12:1);r.bullets.push({id:++r.serial,x:b.x,y:125,vx:Math.cos(q)*speed,vy:Math.sin(q)*speed,life:4,reflected:false});}}
 b.next=(b.phase===3?.6:.85)*(r.mode==='hard'?.8:1);
}
function step(r,input={},real=1/120){if(r.locked||['won','lost'].includes(r.status))return;real=clamp(real,0,1/60);r.clock+=real;
 if(r.status==='finish'){r.ending-=real;if(r.ending<=0){r.status='won';emit(r,'won');}return;}
 r.time+=real;for(const [key,flag]of [['attack','attackPress'],['dodge','dodge'],['ult','ult']])if(input[flag])r.buffer[key]=.24;
 if(r.hitstop>0){r.hitstop=Math.max(0,r.hitstop-real);return;}
 const dt=real*(r.slow>0?.3:1);r.slow=Math.max(0,r.slow-real);for(const k of Object.keys(r.buffer))r.buffer[k]=Math.max(0,r.buffer[k]-dt);
 const p=r.p,b=r.b;for(const k of ['inv','attackCD','parry','parryCD','dash','dashCD','hurt'])p[k]=Math.max(0,p[k]-dt);p.chainAge+=dt;b.stun=Math.max(0,b.stun-dt);b.flash=Math.max(0,b.flash-dt);
 const axis=(input.right?1:0)-(input.left?1:0);if(axis)p.face=axis;else if(!p.dash)p.face=b.x>=p.x?1:-1;
 if(r.buffer.ult>0&&p.gauge>=100&&!p.ult){r.buffer.ult=0;p.gauge=0;p.ult=.94;p.ultHit=false;p.attack=null;p.inv=1.1;r.stats.ults++;emit(r,'ultimate',{x:p.x,face:b.x>=p.x?1:-1});}
 if(p.ult>0){const before=p.ult;p.ult=Math.max(0,p.ult-real);if(before>.5&&p.ult<=.5&&!p.ultHit){p.ultHit=true;p.x=clamp(b.x+(p.x<b.x?110:-110),50,W-50);p.face=b.x>=p.x?1:-1;hitBoss(r,220,'ult');emit(r,'ultimateCut',{x:b.x});}return;}
 if(r.buffer.dodge>0&&p.dashCD<=0){r.buffer.dodge=0;const perfect=danger(r);p.dash=.23;p.dashCD=1.02;p.dashDir=axis||p.face;p.inv=Math.max(p.inv,.29);if(perfect){r.slow=.8;gain(r,28);r.stats.perfects++;emit(r,'perfect',{x:p.x});}emit(r,'dash',{x:p.x,dir:p.dashDir,perfect});if(input.attack||r.buffer.attack>0){p.attackCD=0;startAttack(r,true);r.buffer.attack=0;}}
 if(r.buffer.attack>0&&p.parryCD<=0){p.parry=.16;p.parryCD=.32;emit(r,'guard',{x:p.x});}
 if((input.attack||r.buffer.attack>0)&&p.attackCD<=0){startAttack(r,r.buffer.attack>0);r.buffer.attack=0;}
 const speed=p.dash>0?p.dashDir*880:axis*245*(p.attack?.t<.17?.62:1);p.x=clamp(p.x+speed*dt,45,W-45);
 if(p.attack){const a=p.attack;a.t+=dt;if(!a.hit&&a.t>=(a.dash?.035:.075)){a.hit=true;const reach=a.dash?240:155;if(Math.abs(p.x-b.x)<reach){hitBoss(r,a.dash?38:[16,21,34][a.step],a.dash?'dash':'slash');}else emit(r,'miss',{x:p.x});}if(a.t>.3)p.attack=null;}
 if(r.status!=='fight')return;
 if(!b.stun){if(b.attack){b.attack.left-=dt;if(b.attack.left<=0){const a=b.attack;b.attack=null;executeBoss(r,a);}}else{b.next-=dt;if(b.next<=0)beginBoss(r);else if(Math.abs(b.x-p.x)>190)b.x=clamp(b.x+Math.sign(p.x-b.x)*32*dt,140,900);}}
 for(const v of r.bullets){v.x+=v.vx*dt;v.y+=v.vy*dt;v.life-=dt;if(v.reflected){if(Math.abs(v.x-b.x)<65&&v.y>10&&v.y<230){v.life=0;hitBoss(r,65,'reflect');}}
 else if(p.parry>0&&Math.abs(v.x-p.x)<105&&v.y>5&&v.y<155){v.reflected=true;v.vx=Math.sign(b.x-v.x)*880;v.vy=(100-v.y)*2;v.life=2;p.parry=0;gain(r,24);r.stats.parries++;r.slow=Math.max(r.slow,.45);r.hitstop=Math.max(r.hitstop,.065);emit(r,'parry',{x:v.x,y:v.y});}
 else if(Math.abs(v.x-p.x)<22&&v.y>8&&v.y<95){if(hurt(r,'orb'))v.life=0;}}
 r.bullets=r.bullets.filter(v=>v.life>0&&v.x>-80&&v.x<W+80&&v.y>-60);
}
function rank(r){if(r.status!=='won')return '—';return r.stats.taken===0?(r.time<70?'S+':'S'):r.stats.taken<=2?'A':r.stats.taken<=4?'B':'C';}
function score(r){return Math.max(0,Math.round(r.stats.damage*2+r.stats.parries*180+r.stats.perfects*140+r.stats.maxChain*12-r.stats.taken*250+(r.status==='won'?3000+Math.max(0,120-r.time)*15:0)));}
const api={W,MAX_HP,create,step,rank,score,hitBoss};if(typeof module!=='undefined')module.exports=api;else root.Noa=api;
})(typeof window!=='undefined'?window:globalThis);
