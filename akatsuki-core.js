/* 夜明けに、わたしを燃やして — deterministic, DOM-free combat */
(function(root,factory){if(typeof module==='object')module.exports=factory();else root.Akatsuki=factory()})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const chapters=[{name:'パンの匂いがする街',goal:'街道の亡者を鎮め、灯台へ',length:2800,foes:[480,800,1130,1550,1920,2350],boss:false},{name:'名前のない巡礼路',goal:'巡礼者を越えて、古い鐘楼へ',length:3600,foes:[480,830,1200,1510,1950,2350,2740,3130],boss:false},{name:'夜明けを閉ざすもの',goal:'灯守のなれはてを鎮める',length:1600,foes:[1050],boss:true}];
const XP=[0,30,75,135,200,270,350,440,530,630];
const skills=[
 {id:'blade1',branch:'刃',name:'終の一太刀',description:'三連撃の最後が40ダメージになる。'},
 {id:'blade2',branch:'刃',name:'宙を裂く',description:'空中の近接攻撃が10強化され、高い位置からも届く。'},
 {id:'blade3',branch:'刃',name:'返しの刃',description:'回避後0.8秒以内の斬撃が前後に届き、12強化される。'},
 {id:'blade4',branch:'刃',name:'残月',description:'三連撃の最後から、灯火を使わない26ダメージの斬撃波を放つ。'},
 {id:'lamp1',branch:'灯',name:'小さな種火',description:'灯術の消費灯火が20から16になる。'},
 {id:'lamp2',branch:'灯',name:'夜を貫く',description:'灯術が敵を貫通する。同じ弾は各敵に一度だけ命中。'},
 {id:'lamp3',branch:'灯',name:'還る灯',description:'灯術で敵を鎮めると、その一発分の灯火も戻る。'},
 {id:'lamp4',branch:'灯',name:'双灯',description:'灯術を一度放つと、2発の火を同時に撃つ。消費は1発分。'},
 {id:'shadow1',branch:'影',name:'夜渡り',description:'回避の再使用を0.85秒から0.65秒に短縮し、無敵を延ばす。'},
 {id:'shadow2',branch:'影',name:'黒猫の爪',description:'黒猫が2秒ごとに近くの敵を攻撃する。14ダメージ。'},
 {id:'shadow3',branch:'影',name:'九つの命',description:'敵を3体鎮めるごとに体力を1回復する。'},
 {id:'shadow4',branch:'影',name:'影の足場',description:'空中でもう一度ジャンプできる。着地で回復。'}
].map((v,i)=>({...v,requires:i%4?['blade','lamp','shadow'][Math.floor(i/4)]+(i%4):null}));
const validRewards=new Set([...chapters.flatMap((c,i)=>c.foes.map((_,j)=>`${i}:${j}`)),'trial:0','trial:1']);
function level(prog){let n=1;while(n<10&&(prog?.xp||0)>=XP[n])n++;return n;}
function normalizeProgress(raw,chapter=0){
 if(!raw||typeof raw!=='object'){
  let xp=0,earned=[];for(let i=0;i<chapter;i++)for(let j=0;j<chapters[i].foes.length;j++){xp+=i?35:25;earned.push(`${i}:${j}`);}
  return {xp,skills:[],earned};
 }
 const xp=clamp(Number.isFinite(raw.xp)?Math.floor(raw.xp):0,0,810),out={xp,skills:[],earned:[...new Set(Array.isArray(raw.earned)?raw.earned.filter(x=>validRewards.has(x)):[])]};
 for(const skill of skills)if(Array.isArray(raw.skills)&&raw.skills.includes(skill.id)&&(!skill.requires||out.skills.includes(skill.requires))&&out.skills.length<level(out)-1)out.skills.push(skill.id);
 return out;
}
function has(s,id){return s.progress.skills.includes(id);}
function points(prog){return level(prog)-1-prog.skills.length;}
function maxHP(prog){return 6+Math.floor((level(prog)-1)/2);}
function syncProgress(s,prog){s.progress=normalizeProgress(prog);s.p.maxHp=maxHP(s.progress);s.p.hp=Math.min(s.p.hp,s.p.maxHp);}
function learn(s,id){const skill=skills.find(k=>k.id===id);if(!skill||has(s,id)||points(s.progress)<=0||(skill.requires&&!has(s,skill.requires)))return false;s.progress.skills.push(id);return true;}
function respec(s){s.progress.skills=[];s.p.airJumpUsed=false;}
function grant(s,id,amount){if(s.progress.earned.includes(id))return;s.progress.earned.push(id);const old=level(s.progress);s.progress.xp=Math.min(810,s.progress.xp+amount);const next=level(s.progress);if(next>old){const before=s.p.maxHp;s.p.maxHp=maxHP(s.progress);s.p.hp=Math.min(s.p.maxHp,s.p.hp+s.p.maxHp-before);s.events.push({type:'level',level:next,points:points(s.progress),x:s.p.x,y:s.p.y+65});}s.events.push({type:'progress'});}
function cost(s){return has(s,'lamp1')?16:20;}
function cleared(s){return s.enemies.every(e=>e.hp<=0);}
function create(chapter=0,memories=[],progress=null){chapter=clamp(Math.floor(chapter)||0,0,2);const def=chapters[chapter],prog=normalizeProgress(progress,chapter);return {progress:prog,trial:false,chapter,memories:[...memories],t:0,status:'fight',p:{x:120,y:0,vy:0,face:1,hp:maxHP(prog),maxHp:maxHP(prog),airJumpUsed:false,counter:0,catCD:1.5,healCount:0,light:85,inv:0,dash:0,dashCD:0,attackCD:0,magicCD:0,attack:0,combo:0,comboAge:0},enemies:def.foes.map((x,i)=>({x,spawn:x,hp:def.boss?900:chapter?120:90,max:def.boss?900:chapter?120:90,boss:def.boss,id:i,phase:'idle',timer:1+i*.24,aim:x,hit:false,stagger:0,flash:0,pattern:0})),orbs:[],events:[],kills:0,stats:{damage:0,dodges:0,spells:0},exit:def.length-90,length:def.length};}
function createTrial(chapter,memories,progress){const s=create(chapter,memories,progress);s.trial=true;s.length=1200;s.exit=1080;s.enemies=[{x:800,spawn:800,hp:chapter?480:340,max:chapter?480:340,boss:true,id:0,phase:'idle',timer:1,aim:800,stagger:0,flash:0,pattern:0}];return s;}
function damageEnemy(s,e,n,source='blade'){if(e.hp<=0)return;const actual=Math.min(e.hp,n);e.hp=Math.max(0,e.hp-n);e.flash=.17;e.stagger=e.boss?.03:.10;s.stats.damage+=actual;s.events.push({type:'hit',x:e.x,y:65,boss:e.boss});if(!e.hp){s.kills++;s.p.light=clamp(s.p.light+(e.boss?35:24)+(source==='lamp'&&has(s,'lamp3')?cost(s):0),0,100);if(has(s,'shadow3')&&++s.p.healCount%3===0)s.p.hp=Math.min(s.p.maxHp,s.p.hp+1);grant(s,s.trial?'trial:'+s.chapter:`${s.chapter}:${e.id}`,s.trial?100:e.boss?180:s.chapter?35:25);s.events.push({type:'soul',x:e.x,y:55});}}
function hurt(s){let p=s.p;if(p.inv>0)return;p.hp--;p.inv=1.1;p.combo=0;s.events.push({type:'hurt',x:p.x,y:p.y+40});if(p.hp<=0){s.status='lost';s.events.push({type:'lost'});}}
function step(s,dt,input={}){s.events=[];if(s.status!=='fight')return s;dt=clamp(dt,0,1/30);s.t+=dt;let p=s.p;for(const k of ['inv','dash','dashCD','attackCD','magicCD','attack','counter','catCD'])p[k]=Math.max(0,p[k]-dt);p.comboAge+=dt;if(p.comboAge>1)p.combo=0;
let axis=clamp(input.axis||0,-1,1);if(axis)p.face=axis>0?1:-1;
if(input.dodge&&p.dashCD<=0){p.dash=.22;p.inv=Math.max(p.inv,has(s,'shadow1')?.35:.27);p.dashCD=has(s,'shadow1')?.65:.85;p.counter=.8;s.stats.dodges++;s.events.push({type:'dodge',x:p.x,y:p.y+40});}
if(input.jump&&(p.y===0||(has(s,'shadow4')&&!p.airJumpUsed))){if(p.y>0)p.airJumpUsed=true;p.vy=570;s.events.push({type:'jump',x:p.x,y:0});}
p.x=clamp(p.x+(p.dash>0?p.face*680:axis*225)*dt,45,s.length-40);if(p.y>0||p.vy>0){p.vy-=1550*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0){p.vy=0;p.airJumpUsed=false;}}
p.light=Math.max(12,p.light-dt*.65);
if(input.attack&&p.attackCD<=0){p.combo=p.combo%3+1;p.comboAge=0;p.attack=.22;p.attackCD=p.combo===3?.46:.30;const counter=has(s,'blade3')&&p.counter>0;let dealt=false;for(const e of s.enemies)if(e.hp>0&&Math.abs(e.x-p.x)<(e.boss?160:115)&&(counter||(e.x-p.x)*p.face>-32)&&p.y<(has(s,'blade2')?220:140)){damageEnemy(s,e,(p.combo===3?(has(s,'blade1')?40:28):18)+(has(s,'blade2')&&p.y>0?10:0)+(counter?12:0));dealt=true;}s.events.push({type:'slash',x:p.x+p.face*55,y:p.y+65,face:p.face,combo:p.combo,hit:dealt,counter});p.counter=0;if(p.combo===3&&has(s,'blade4'))s.orbs.push({x:p.x+p.face*35,y:p.y+62,vx:p.face*600,vy:0,life:1.1,ally:true,damage:26,source:'blade',hits:[]});}
if(input.magic&&p.magicCD<=0&&p.light>=cost(s)){p.light-=cost(s);p.magicCD=.8;s.stats.spells++;for(let i=0;i<(has(s,'lamp4')?2:1);i++)s.orbs.push({x:p.x+p.face*(35-i*38),y:p.y+62+i*15,vx:p.face*660,vy:0,life:1.5,ally:true,damage:46,source:'lamp',pierce:has(s,'lamp2'),hits:[]});s.events.push({type:'magic',x:p.x,y:p.y+60});}
if(has(s,'shadow2')&&p.catCD<=0){const enemy=s.enemies.filter(e=>e.hp>0&&Math.abs(e.x-p.x)<240).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(enemy){damageEnemy(s,enemy,14,'cat');p.catCD=2;s.events.push({type:'cat',x:enemy.x,y:65});}}
for(const e of s.enemies){if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);e.stagger=Math.max(0,e.stagger-dt);if(e.stagger>0)continue;const dx=p.x-e.x;
if(e.phase==='idle'){if(Math.abs(dx)> (e.boss?270:88)&&Math.abs(dx)<650)e.x+=Math.sign(dx)*(e.boss?48:65+12*s.chapter)*dt;e.timer-=dt;if(e.timer<=0&&Math.abs(dx)<(e.boss?650:210)){e.phase='warn';e.timer=e.boss?(e.hp<e.max*.5?.72:1):.85;e.aim=p.x;e.hit=false;e.pattern=(e.pattern+1)%(e.boss?3:2);s.events.push({type:'warn',x:e.aim,y:0});}}
else if(e.phase==='warn'){e.timer-=dt;if(e.timer<=0){e.phase='recover';e.timer=e.boss?1.25:.95;
if(e.pattern===1){const speed=e.boss?320:245;e.orb=true;s.orbs.push({x:e.x,y:e.boss?100:65,vx:Math.sign(dx)*speed,vy:0,life:5,ally:false});s.events.push({type:'enemySpell',x:e.x,y:80});}
else{const sweep=e.boss&&e.pattern===2;const range=sweep?900:e.boss?135:83;if((sweep||Math.abs(p.x-e.aim)<range)&&(sweep?p.y<85:p.y<185))hurt(s);s.events.push({type:sweep?'sweep':'slam',x:e.aim,y:0,range});}}
}else{e.timer-=dt;if(e.timer<=0){e.phase='idle';e.timer=e.boss?.65:.7;}}}
for(const o of s.orbs){o.x+=o.vx*dt;o.y+=o.vy*dt;o.life-=dt;if(o.ally){for(const e of s.enemies)if(e.hp>0&&!(o.hits||[]).includes(e.id)&&Math.abs(o.x-e.x)<(e.boss?95:35)&&o.y<(e.boss?200:140)){damageEnemy(s,e,o.damage||46,o.source||'lamp');(o.hits||(o.hits=[])).push(e.id);if(!o.pierce){o.life=0;break;}}}else if(Math.abs(o.x-p.x)<25&&Math.abs(o.y-(p.y+55))<42){hurt(s);o.life=0;}}
s.orbs=s.orbs.filter(o=>o.life>0&&o.x>0&&o.x<s.length);if(s.status==='fight'&&cleared(s)&&p.x>=s.exit){s.status='clear';s.events.push({type:'clear'});}return s;}
function makeSave(chapter,memories,ending=null,progress=null){chapter=clamp(chapter,0,2);return{version:2,chapter,memories:[...new Set(memories.filter(x=>['mother','brother'].includes(x)))],ending,progress:normalizeProgress(progress,chapter)};}
function readSave(raw){try{const d=JSON.parse(raw);if(![1,2].includes(d.version)||!Number.isInteger(d.chapter)||d.chapter<0||d.chapter>2||!Array.isArray(d.memories))return null;return makeSave(d.chapter,d.memories,['dawn','home'].includes(d.ending)?d.ending:null,d.version===2?d.progress:null);}catch{return null;}}
return{chapters,create,createTrial,step,makeSave,readSave,skills,XP,level,points,maxHP,normalizeProgress,learn,respec,syncProgress,cost,cleared};});
