/* 夜明けに、わたしを燃やして — deterministic, DOM-free combat */
(function(root,factory){if(typeof module==='object')module.exports=factory();else root.Akatsuki=factory()})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const chapters=[{name:'パンの匂いがする街',goal:'街道の亡者を鎮め、灯台へ',length:2800,foes:[480,800,1130,1550,1920,2350],boss:false},{name:'名前のない巡礼路',goal:'巡礼者を越えて、古い鐘楼へ',length:3600,foes:[480,830,1200,1510,1950,2350,2740,3130],boss:false},{name:'夜明けを閉ざすもの',goal:'灯守のなれはてを鎮める',length:1600,foes:[1050],boss:true}];
function create(chapter=0,memories=[]){chapter=clamp(Math.floor(chapter)||0,0,2);const def=chapters[chapter];return {chapter,memories:[...memories],t:0,status:'fight',p:{x:120,y:0,vy:0,face:1,hp:6,light:85,inv:0,dash:0,dashCD:0,attackCD:0,magicCD:0,attack:0,combo:0,comboAge:0},enemies:def.foes.map((x,i)=>({x,spawn:x,hp:def.boss?900:chapter?120:90,max:def.boss?900:chapter?120:90,boss:def.boss,id:i,phase:'idle',timer:1+i*.24,aim:x,hit:false,stagger:0,flash:0,pattern:0})),orbs:[],events:[],kills:0,stats:{damage:0,dodges:0,spells:0},exit:def.length-90,length:def.length};}
function damageEnemy(s,e,n){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-n);e.flash=.17;e.stagger=e.boss?.03:.10;s.stats.damage+=n;s.events.push({type:'hit',x:e.x,y:65,boss:e.boss});if(!e.hp){s.kills++;s.p.light=clamp(s.p.light+(e.boss?35:24),0,100);s.events.push({type:'soul',x:e.x,y:55});}}
function hurt(s){let p=s.p;if(p.inv>0)return;p.hp--;p.inv=1.1;p.combo=0;s.events.push({type:'hurt',x:p.x,y:p.y+40});if(p.hp<=0){s.status='lost';s.events.push({type:'lost'});}}
function step(s,dt,input={}){s.events=[];if(s.status!=='fight')return s;dt=clamp(dt,0,1/30);s.t+=dt;let p=s.p;for(const k of ['inv','dash','dashCD','attackCD','magicCD','attack'])p[k]=Math.max(0,p[k]-dt);p.comboAge+=dt;if(p.comboAge>1)p.combo=0;
let axis=clamp(input.axis||0,-1,1);if(axis)p.face=axis>0?1:-1;
if(input.dodge&&p.dashCD<=0){p.dash=.22;p.inv=Math.max(p.inv,.27);p.dashCD=.85;s.stats.dodges++;s.events.push({type:'dodge',x:p.x,y:p.y+40});}
if(input.jump&&p.y===0){p.vy=570;s.events.push({type:'jump',x:p.x,y:0});}
p.x=clamp(p.x+(p.dash>0?p.face*680:axis*225)*dt,45,s.length-40);if(p.y>0||p.vy>0){p.vy-=1550*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0)p.vy=0;}
p.light=Math.max(12,p.light-dt*.65);
if(input.attack&&p.attackCD<=0){p.combo=p.combo%3+1;p.comboAge=0;p.attack=.22;p.attackCD=p.combo===3?.46:.30;let dealt=false;for(const e of s.enemies)if(e.hp>0&&Math.abs(e.x-p.x)<(e.boss?160:115)&&(e.x-p.x)*p.face>-32&&p.y<140){damageEnemy(s,e,p.combo===3?28:18);dealt=true;}s.events.push({type:'slash',x:p.x+p.face*55,y:p.y+65,face:p.face,combo:p.combo,hit:dealt});}
if(input.magic&&p.magicCD<=0&&p.light>=20){p.light-=20;p.magicCD=.8;s.stats.spells++;s.orbs.push({x:p.x+p.face*35,y:p.y+62,vx:p.face*660,vy:0,life:1.5,ally:true});s.events.push({type:'magic',x:p.x,y:p.y+60});}
for(const e of s.enemies){if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);e.stagger=Math.max(0,e.stagger-dt);if(e.stagger>0)continue;const dx=p.x-e.x;
if(e.phase==='idle'){if(Math.abs(dx)> (e.boss?270:88)&&Math.abs(dx)<650)e.x+=Math.sign(dx)*(e.boss?48:65+12*s.chapter)*dt;e.timer-=dt;if(e.timer<=0&&Math.abs(dx)<(e.boss?650:210)){e.phase='warn';e.timer=e.boss?(e.hp<e.max*.5?.72:1):.85;e.aim=p.x;e.hit=false;e.pattern=(e.pattern+1)%(e.boss?3:2);s.events.push({type:'warn',x:e.aim,y:0});}}
else if(e.phase==='warn'){e.timer-=dt;if(e.timer<=0){e.phase='recover';e.timer=e.boss?1.25:.95;
if(e.pattern===1){const speed=e.boss?320:245;e.orb=true;s.orbs.push({x:e.x,y:e.boss?100:65,vx:Math.sign(dx)*speed,vy:0,life:5,ally:false});s.events.push({type:'enemySpell',x:e.x,y:80});}
else{const sweep=e.boss&&e.pattern===2;const range=sweep?900:e.boss?135:83;if((sweep||Math.abs(p.x-e.aim)<range)&&(sweep?p.y<85:p.y<185))hurt(s);s.events.push({type:sweep?'sweep':'slam',x:e.aim,y:0,range});}}
}else{e.timer-=dt;if(e.timer<=0){e.phase='idle';e.timer=e.boss?.65:.7;}}}
for(const o of s.orbs){o.x+=o.vx*dt;o.y+=o.vy*dt;o.life-=dt;if(o.ally){for(const e of s.enemies)if(e.hp>0&&Math.abs(o.x-e.x)<(e.boss?95:35)&&o.y<(e.boss?200:140)){damageEnemy(s,e,46);o.life=0;break;}}else if(Math.abs(o.x-p.x)<25&&Math.abs(o.y-(p.y+55))<42){hurt(s);o.life=0;}}
s.orbs=s.orbs.filter(o=>o.life>0&&o.x>0&&o.x<s.length);if(s.status==='fight'&&s.kills===s.enemies.length&&p.x>=s.exit){s.status='clear';s.events.push({type:'clear'});}return s;}
function makeSave(chapter,memories,ending=null){return{version:1,chapter:clamp(chapter,0,2),memories:[...new Set(memories.filter(x=>['mother','brother'].includes(x)))],ending};}
function readSave(raw){try{const d=JSON.parse(raw);if(d.version!==1||!Number.isInteger(d.chapter)||d.chapter<0||d.chapter>2||!Array.isArray(d.memories))return null;return makeSave(d.chapter,d.memories,['dawn','home'].includes(d.ending)?d.ending:null);}catch{return null;}}
return{chapters,create,step,makeSave,readSave};});
