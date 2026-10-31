/* 夜明けに、わたしを燃やして — deterministic, DOM-free combat */
(function(root,factory){if(typeof module==='object')module.exports=factory();else root.Akatsuki=factory()})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const BUFFER=.15,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const chapters=[{name:'パンの匂いがする街',goal:'街道の亡者を鎮め、灯台へ',length:2800,foes:[480,800,1130,1550,1920,2350],boss:false},{name:'名前のない巡礼路',goal:'巡礼者を越えて、古い鐘楼へ',length:3600,foes:[480,830,1200,1510,1950,2350,2740,3130],boss:false},{name:'夜明けを閉ざすもの',goal:'灯守のなれはてを鎮める',length:1600,foes:[1050],boss:true}];
const XP=[0,30,75,135,200,270,350,440,530,630];
const skills=[
 {id:'blade1',branch:'刃',name:'終の一太刀',description:'三連撃の最後が40ダメージになる。'},
 {id:'blade2',branch:'刃',name:'宙を裂く',description:'空中の近接攻撃が10強化され、高い位置からも届く。'},
 {id:'blade3',branch:'刃',name:'返しの刃',description:'回避後0.8秒以内の斬撃が前後に届き、12強化される。'},
 {id:'blade4',branch:'刃',name:'残月',description:'三連撃の最後から、灯火を使わない26ダメージの斬撃波を放つ。'},
 {id:'lamp1',branch:'灯',name:'小さな種火',description:'全呪文の消費灯火を4減らす（灯火弾20→16）。'},
 {id:'lamp2',branch:'灯',name:'夜を貫く',description:'灯火弾と鬼火が敵を貫通する。同じ弾は各敵に一度だけ命中。'},
 {id:'lamp3',branch:'灯',name:'還る灯',description:'灯術で敵を鎮めると、その一発分の灯火も戻る。'},
 {id:'lamp4',branch:'灯',name:'双灯',description:'灯火弾と鬼火を2発同時に撃つ。消費は1発分。'},
 {id:'shadow1',branch:'影',name:'夜渡り',description:'回避の再使用を0.85秒から0.65秒に短縮し、無敵を延ばす。'},
 {id:'shadow2',branch:'影',name:'黒猫の爪',description:'黒猫が2秒ごとに近くの敵を攻撃する。14ダメージ。'},
 {id:'shadow3',branch:'影',name:'九つの命',description:'敵を3体鎮めるごとに体力を1回復する。'},
 {id:'shadow4',branch:'影',name:'影の足場',description:'空中でもう一度ジャンプできる。着地で回復。'}
].map((v,i)=>({...v,requires:i%4?['blade','lamp','shadow'][Math.floor(i/4)]+(i%4):null}));
const spells=[
{id:'bolt',name:'灯火弾',short:'灯火弾',level:1,cost:20,cooldown:.8,description:'まっすぐ放つ灯火の弾。46ダメージ。'},
{id:'reap',name:'灯の鎌',short:'灯の鎌',level:2,cost:24,cooldown:.95,description:'前方を大きく薙ぎ払い、52ダメージ。盾を崩し、空中の敵にも届く。'},
{id:'wisp',name:'追憶の鬼火',short:'鬼火',level:4,cost:26,cooldown:1,description:'近くの敵を追う鬼火。34ダメージ。飛ぶ敵を狙いやすい。'},
{id:'candle',name:'弔いの燭台',short:'燭台',level:6,cost:32,cooldown:1.8,description:'前方に4秒設置。近くの敵に0.5秒ごとに14ダメージ。最大2台。'}
];
function spell(s){return spells.find(k=>k.id===s.progress.spell)||spells[0];}
function equipSpell(s,id){const value=spells.find(k=>k.id===id);if(!value||level(s.progress)<value.level)return false;s.progress.spell=id;return true;}
function enemyKind(chapter,index,boss){return boss?'boss':(chapter?['bat','caster','guard','wraith','bat','guard','caster','guard']:['wraith','bat','wraith','guard','wraith','caster'])[index];}
function enemyHeight(e){return e.kind==='bat'?e.y+30:e.boss?100:65;}
const validRewards=new Set([...chapters.flatMap((c,i)=>c.foes.map((_,j)=>`${i}:${j}`)),'trial:0','trial:1']);
function level(prog){let n=1;while(n<10&&(prog?.xp||0)>=XP[n])n++;return n;}
function normalizeProgress(raw,chapter=0){
 if(!raw||typeof raw!=='object'){
  let xp=0,earned=[];for(let i=0;i<chapter;i++)for(let j=0;j<chapters[i].foes.length;j++){xp+=i?35:25;earned.push(`${i}:${j}`);}
  return {xp,skills:[],earned,spell:'bolt'};
 }
 const xp=clamp(Number.isFinite(raw.xp)?Math.floor(raw.xp):0,0,810),out={xp,skills:[],earned:[...new Set(Array.isArray(raw.earned)?raw.earned.filter(x=>validRewards.has(x)):[])]};
 for(const skill of skills)if(Array.isArray(raw.skills)&&raw.skills.includes(skill.id)&&(!skill.requires||out.skills.includes(skill.requires))&&out.skills.length<level(out)-1)out.skills.push(skill.id);
 out.spell=spells.some(k=>k.id===raw.spell&&k.level<=level(out))?raw.spell:'bolt';return out;
}
function has(s,id){return s.progress.skills.includes(id);}
function points(prog){return level(prog)-1-prog.skills.length;}
function maxHP(prog){return 6+Math.floor((level(prog)-1)/2);}
function syncProgress(s,prog){s.progress=normalizeProgress(prog);s.p.maxHp=maxHP(s.progress);s.p.hp=Math.min(s.p.hp,s.p.maxHp);}
function learn(s,id){const skill=skills.find(k=>k.id===id);if(!skill||has(s,id)||points(s.progress)<=0||(skill.requires&&!has(s,skill.requires)))return false;s.progress.skills.push(id);return true;}
function respec(s){s.progress.skills=[];s.p.airJumpUsed=false;}
function grant(s,id,amount){if(s.progress.earned.includes(id))return;s.progress.earned.push(id);const old=level(s.progress);s.progress.xp=Math.min(810,s.progress.xp+amount);const next=level(s.progress);if(next>old){const before=s.p.maxHp;s.p.maxHp=maxHP(s.progress);s.p.hp=Math.min(s.p.maxHp,s.p.hp+s.p.maxHp-before);s.events.push({type:'level',level:next,points:points(s.progress),x:s.p.x,y:s.p.y+65});for(const k of spells)if(k.level>old&&k.level<=next)s.events.push({type:'spellLearned',id:k.id,name:k.name});}s.events.push({type:'progress'});}
function cost(s){return spell(s).cost-(has(s,'lamp1')?4:0);}
function cleared(s){return s.enemies.every(e=>e.hp<=0);}
function create(chapter=0,memories=[],progress=null){chapter=clamp(Math.floor(chapter)||0,0,2);const def=chapters[chapter],prog=normalizeProgress(progress,chapter);return {progress:prog,trial:false,chapter,memories:[...memories],t:0,status:'fight',p:{x:120,y:0,vy:0,face:1,hp:maxHP(prog),maxHp:maxHP(prog),airJumpUsed:false,counter:0,catCD:1.5,healCount:0,light:85,inv:0,dash:0,dashCD:0,attackCD:0,magicCD:0,attack:0,combo:0,comboAge:0},enemies:def.foes.map((x,i)=>({x,spawn:x,hp:def.boss?900:chapter?120:90,max:def.boss?900:chapter?120:90,boss:def.boss,id:i,kind:enemyKind(chapter,i,def.boss),y:enemyKind(chapter,i,def.boss)==='bat'?95:0,face:-1,guardBroken:0,phase:'idle',timer:1+i*.24,aim:x,hit:false,stagger:0,flash:0,pattern:0})).map(e=>{if(e.kind==='bat')e.hp=e.max=chapter?68:54;if(e.kind==='guard')e.hp=e.max=chapter?170:140;if(e.kind==='caster')e.hp=e.max=chapter?96:76;return e;}),orbs:[],hazards:[],totems:[],events:[],kills:0,stats:{damage:0,dodges:0,spells:0},exit:def.length-90,length:def.length};}
function createTrial(chapter,memories,progress){const s=create(chapter,memories,progress);s.trial=true;s.length=1200;s.exit=1080;s.enemies=[{x:800,spawn:800,hp:chapter?480:340,max:chapter?480:340,boss:true,kind:'boss',y:0,face:-1,guardBroken:0,id:0,phase:'idle',timer:1,aim:800,stagger:0,flash:0,pattern:0}];return s;}
function damageEnemy(s,e,n,source='blade',origin=s.p.x,paid=cost(s),breakGuard=false){if(e.hp<=0)return;if(s.p.rage>0&&source!=='flare')n*=3;if(s.p.fearless>0&&source!=='flare')n=Math.round(n*1.5);if(e.kind==='guard'){if(breakGuard||source==='finisher'){e.guardBroken=1.2;e.phase='recover';e.timer=1.2;s.events.push({type:'guardBreak',x:e.x,y:65});}else if(e.guardBroken<=0&&e.phase!=='recover'&&(origin-e.x)*e.face>=0){n=Math.round(n*.4);s.events.push({type:'blocked',x:e.x,y:65});}}const actual=Math.min(e.hp,n);e.hp=Math.max(0,e.hp-n);e.flash=.17;e.stagger=e.boss?.03:.10;s.stats.damage+=actual;s.events.push({type:'hit',x:e.x,y:enemyHeight(e),boss:e.boss,source,amount:n});if(!e.hp){s.kills++;s.p.light=clamp(s.p.light+(e.boss?35:24)+(source==='lamp'&&has(s,'lamp3')?paid:0),0,100);if(has(s,'shadow3')&&++s.p.healCount%3===0)s.p.hp=Math.min(s.p.maxHp,s.p.hp+1);grant(s,s.trial?'trial:'+s.chapter:`${s.chapter}:${e.id}`,s.trial?100:e.boss?180:s.chapter?35:25);s.events.push({type:'soul',x:e.x,y:enemyHeight(e)-10});}}
function castSpell(s){const p=s.p,k=spell(s),paid=p.rage>0||p.grief>0?0:cost(s);if(p.magicCD>0||p.light<paid)return false;p.light-=paid;p.magicCD=p.grief>0?.12:k.cooldown;s.stats.spells++;
if(k.id==='reap'){for(const e of s.enemies)if(e.hp>0&&Math.abs(e.x-p.x)<200&&(e.x-p.x)*p.face>-35&&Math.abs(enemyHeight(e)-(p.y+65))<180)damageEnemy(s,e,52,'lamp',p.x,paid,true);s.events.push({type:'reap',x:p.x+p.face*80,y:p.y+75,face:p.face});}
else if(k.id==='candle'){if(s.totems.length>=2)s.totems.shift();s.totems.push({x:clamp(p.x+p.face*110,45,s.length-40),life:4,tick:0,paid});s.events.push({type:'candle',x:p.x+p.face*110,y:0});}
else{for(let i=0;i<(has(s,'lamp4')?2:1);i++)s.orbs.push({x:p.x+p.face*(35-i*38),y:p.y+62+i*15,vx:p.face*(k.id==='wisp'?360:660),vy:0,life:k.id==='wisp'?2.6:1.5,ally:true,damage:k.id==='wisp'?34:46,source:'lamp',homing:k.id==='wisp',paid,pierce:has(s,'lamp2'),hits:[]});s.events.push({type:'magic',x:p.x,y:p.y+60});}}
function specialEnemy(s,e,dt){const p=s.p,dx=p.x-e.x;e.face=dx<0?-1:1;
if(e.kind==='bat'){
 if(e.phase==='strike'){e.x=clamp(e.x+e.vx*dt,40,s.length-40);e.y=Math.max(12,e.y-360*dt);e.timer-=dt;if(!e.hit&&Math.abs(p.x-e.x)<42&&Math.abs(p.y+55-(e.y+28))<55){hurt(s);e.hit=true;}if(e.timer<=0){e.phase='recover';e.timer=.8;}}
 else if(e.phase==='warn'){e.timer-=dt;if(e.timer<=0){e.phase='strike';e.timer=.30;e.vx=Math.sign(e.aim-e.x||e.face)*430;e.hit=false;s.events.push({type:'dive',x:e.x,y:e.y+30});}}
 else {e.y+=(95+Math.sin(s.t*4+e.id)*12-e.y)*Math.min(1,dt*6);if(e.phase==='idle'&&Math.abs(dx)>125&&Math.abs(dx)<650)e.x+=Math.sign(dx)*110*dt;e.timer-=dt;if(e.timer<=0){if(e.phase==='recover'){e.phase='idle';e.timer=.55;}else if(Math.abs(dx)<260){e.phase='warn';e.timer=.65;e.aim=p.x;e.pattern=3;}}}return true;
}
if(e.kind==='guard'){
 if(e.phase==='idle'){if(Math.abs(dx)>85&&Math.abs(dx)<600)e.x+=Math.sign(dx)*48*dt;e.timer-=dt;if(e.timer<=0&&Math.abs(dx)<190){e.phase='warn';e.timer=.9;e.aim=p.x;e.pattern=0;}}
 else if(e.phase==='warn'){e.timer-=dt;if(e.timer<=0){e.x=clamp(e.x+Math.sign(e.aim-e.x)*Math.min(110,Math.abs(e.aim-e.x)),40,s.length-40);if(Math.abs(p.x-e.x)<90&&p.y<140)hurt(s);s.events.push({type:'guardSlash',x:e.x,y:65,face:e.face});e.phase='recover';e.timer=1.15;}}
 else{e.timer-=dt;if(e.timer<=0){e.phase='idle';e.timer=.5;}}return true;
}
if(e.kind==='caster'){
 if(e.phase==='idle'){if(Math.abs(dx)>360&&Math.abs(dx)<650)e.x+=Math.sign(dx)*40*dt;else if(Math.abs(dx)<155)e.x=clamp(e.x-Math.sign(dx)*30*dt,50,s.length-50);e.timer-=dt;if(e.timer<=0&&Math.abs(dx)<560){e.phase='warn';e.timer=1.05;e.aim=p.x;e.pattern=4;}}
 else if(e.phase==='warn'){e.timer-=dt;if(e.timer<=0){for(const offset of [-80,0,80]){const x=clamp(e.aim+offset,30,s.length-30);s.hazards.push({x,life:.24,radius:26,hit:false});s.events.push({type:'pillar',x,y:0});}e.phase='recover';e.timer=1.5;}}
 else{e.timer-=dt;if(e.timer<=0){e.phase='idle';e.timer=.7;}}return true;
}return false;}
// Memories Emma can burn in a fight. Each is gone for good; the client also blanks their words in the story.
const combatMemories=[
 {id:'bread',name:'半分こしたパンの匂い',effect:'体力をすべて取り戻し、3秒間傷つかない。',words:['パン']},
 {id:'song',name:'母の子守唄',effect:'6秒間、敵の動きがほとんど止まる。',words:['子守唄']},
 {id:'cat',name:'黒猫の名前',effect:'黒猫が影の獣となり、8秒間敵を裂き続ける。そのあと黒猫はいなくなる。',words:['黒猫']},
 {id:'lantern',name:'初めて灯をともした夜',effect:'まわりの敵すべてを灼く。ボスにも深い傷を負わせる。',words:['ランタン']},
 {id:'self',name:'自分の名前',effect:'10秒間、すべての攻撃が三倍になり、灯火が尽きない。',words:['エマ']},
 {id:'fear',name:'怖いという気持ち',effect:'8秒間、どんな攻撃を受けても倒れない。攻撃も1.5倍になる。',words:['怖']},
 {id:'grief',name:'悲しみ',effect:'8秒間、呪文を待ち時間も灯火もなしで撃ち続けられる。',words:['悲し']},
 {id:'wish',name:'弟に会いたいという願い',effect:'見えるすべての敵を焼き尽くす。ボスにも深い傷を負わせる。',words:['会いたい','会う']}];
const memoryIds=['mother','brother',...combatMemories.map(m=>m.id)];
function burnable(s){return combatMemories.filter(m=>!s.memories.includes(m.id));}
function burn(s,id){if(!burnable(s).some(m=>m.id===id)||!['fight','dying'].includes(s.status))return false;const p=s.p;s.memories.push(id);
 if(s.status==='dying'){s.status='fight';p.hp=Math.max(1,Math.ceil(p.maxHp/2));}
 p.light=100;p.inv=Math.max(p.inv,1.5);
 if(id==='bread'){p.hp=p.maxHp;p.inv=3;}
 if(id==='song')s.slow=6;
 if(id==='cat'){p.frenzy=8;p.frenzyCD=0;}
 if(id==='self')p.rage=10;
 if(id==='fear')p.fearless=8;
 if(id==='grief')p.grief=8;
 s.events.push({type:'burn',id,x:p.x,y:p.y+60});
 if(id==='lantern')for(const e of s.enemies)if(e.hp>0&&Math.abs(e.x-p.x)<720)damageEnemy(s,e,e.boss?Math.round(e.max*.2):120,'flare',p.x,0,true);
 if(id==='wish')for(const e of s.enemies)if(e.hp>0&&Math.abs(e.x-p.x)<1000)damageEnemy(s,e,e.boss?Math.round(e.max*.35):300,'flare',p.x,0,true);
 return true;}
function hollow(s){return burnable(s).length===0;}
function giveUp(s){if(s.status!=='dying')return;s.status='lost';s.events.push({type:'lost'});}
function hurt(s){let p=s.p;if(p.inv>0)return;p.hp--;if(p.fearless>0&&p.hp<1)p.hp=1;p.inv=1.1;p.combo=0;s.events.push({type:'hurt',x:p.x,y:p.y+40});if(p.hp<=0){p.hp=0;if(s.lastStand&&burnable(s).length){s.status='dying';s.events.push({type:'dying'});}else{s.status='lost';s.events.push({type:'lost'});}}}
function step(s,dt,input={}){s.events=[];if(s.status!=='fight')return s;dt=clamp(dt,0,1/30);s.t+=dt;let p=s.p;for(const k of ['inv','dash','dashCD','attackCD','magicCD','attack','counter','catCD','frenzy','frenzyCD','rage','fearless','grief'])p[k]=Math.max(0,(p[k]||0)-dt);s.slow=Math.max(0,(s.slow||0)-dt);
// Presses made slightly early (in the air, during a cooldown) are kept briefly instead of dropped.
// An attack tap is kept for a whole swing's recovery so mashing at any rhythm keeps the combo going.
const buf=p.buffer||(p.buffer={jump:0,dodge:0,attack:0,magic:0});for(const k in buf)buf[k]=Math.max(0,buf[k]-dt);if(input.jump)buf.jump=BUFFER;if(input.dodge)buf.dodge=BUFFER;if(input.attackPress)buf.attack=.3;if(input.magicPress)buf.magic=.2;p.comboAge+=dt;if(p.comboAge>1)p.combo=0;
let axis=clamp(input.axis||0,-1,1);if(axis)p.face=axis>0?1:-1;
if(buf.dodge>0&&p.dashCD<=0){buf.dodge=0;p.dash=.22;p.inv=Math.max(p.inv,has(s,'shadow1')?.35:.27);p.dashCD=has(s,'shadow1')?.65:.85;p.counter=.8;s.stats.dodges++;s.events.push({type:'dodge',x:p.x,y:p.y+40});}
if(buf.jump>0&&(p.y===0||(has(s,'shadow4')&&!p.airJumpUsed))){buf.jump=0;if(p.y>0)p.airJumpUsed=true;p.vy=570;s.events.push({type:'jump',x:p.x,y:0});}
p.x=clamp(p.x+(p.dash>0?p.face*680:axis*225)*dt,45,s.length-40);if(p.y>0||p.vy>0){p.vy-=1550*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0){p.vy=0;p.airJumpUsed=false;}}
p.light=Math.max(12,p.light-dt*.65);if(p.rage>0)p.light=100;
if((input.attack||buf.attack>0)&&p.attackCD<=0){buf.attack=0;p.combo=p.combo%3+1;p.comboAge=0;p.attack=.22;p.attackCD=p.combo===3?.46:.30;const counter=has(s,'blade3')&&p.counter>0;let dealt=false;for(const e of s.enemies)if(e.hp>0&&Math.abs(e.x-p.x)<(e.boss?160:115)&&(counter||(e.x-p.x)*p.face>-32)&&p.y<(has(s,'blade2')?220:140)){damageEnemy(s,e,(p.combo===3?(has(s,'blade1')?40:28):18)+(has(s,'blade2')&&p.y>0?10:0)+(counter?12:0),p.combo===3?'finisher':'blade');dealt=true;}s.events.push({type:'slash',x:p.x+p.face*55,y:p.y+65,face:p.face,combo:p.combo,hit:dealt,counter});p.counter=0;if(p.combo===3&&has(s,'blade4'))s.orbs.push({x:p.x+p.face*35,y:p.y+62,vx:p.face*600,vy:0,life:1.1,ally:true,damage:26,source:'blade',hits:[]});}
if(input.magic||buf.magic>0){if(castSpell(s)!==false)buf.magic=0;};
if(has(s,'shadow2')&&!s.memories.includes('cat')&&p.catCD<=0){const enemy=s.enemies.filter(e=>e.hp>0&&Math.abs(e.x-p.x)<240).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(enemy){damageEnemy(s,enemy,14,'cat');p.catCD=2;s.events.push({type:'cat',x:enemy.x,y:65});}}
const edt=s.slow>0?dt*.3:dt;
if(p.frenzy>0&&p.frenzyCD<=0){const prey=s.enemies.filter(e=>e.hp>0&&Math.abs(e.x-p.x)<420).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(prey){damageEnemy(s,prey,22,'cat');p.frenzyCD=.3;s.events.push({type:'cat',x:prey.x,y:65,frenzy:true});}}
for(const e of s.enemies){if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-edt);e.stagger=Math.max(0,e.stagger-edt);e.guardBroken=Math.max(0,(e.guardBroken||0)-edt);if(e.stagger>0)continue;if(specialEnemy(s,e,edt))continue;e.face=s.p.x<e.x?-1:1;const dx=p.x-e.x;
if(e.phase==='idle'){if(Math.abs(dx)> (e.boss?270:88)&&Math.abs(dx)<650)e.x+=Math.sign(dx)*(e.boss?48:65+12*s.chapter)*edt;e.timer-=edt;if(e.timer<=0&&Math.abs(dx)<(e.boss?650:210)){e.phase='warn';e.timer=e.boss?(e.hp<e.max*.5?.72:1):.85;e.aim=p.x;e.hit=false;e.pattern=(e.pattern+1)%(e.boss?3:2);s.events.push({type:'warn',x:e.aim,y:0});}}
else if(e.phase==='warn'){e.timer-=edt;if(e.timer<=0){e.phase='recover';e.timer=e.boss?1.25:.95;
if(e.pattern===1){const speed=e.boss?320:245;e.orb=true;s.orbs.push({x:e.x,y:e.boss?100:65,vx:Math.sign(dx)*speed,vy:0,life:5,ally:false});s.events.push({type:'enemySpell',x:e.x,y:80});}
else{const sweep=e.boss&&e.pattern===2;const range=sweep?900:e.boss?135:83;if((sweep||Math.abs(p.x-e.aim)<range)&&(sweep?p.y<85:p.y<185))hurt(s);s.events.push({type:sweep?'sweep':'slam',x:e.aim,y:0,range});}}
}else{e.timer-=edt;if(e.timer<=0){e.phase='idle';e.timer=e.boss?.65:.7;}}}
for(const o of s.orbs){if(o.homing){const target=s.enemies.filter(e=>e.hp>0&&!o.hits.includes(e.id)&&Math.abs(e.x-o.x)<640).sort((a,b)=>Math.abs(a.x-o.x)-Math.abs(b.x-o.x))[0];if(target){const dx=target.x-o.x,dy=enemyHeight(target)-o.y,len=Math.hypot(dx,dy)||1;o.vx+=(dx/len*430-o.vx)*Math.min(1,dt*7);o.vy+=(dy/len*430-o.vy)*Math.min(1,dt*7);}}const odt=o.ally?dt:edt;o.x+=o.vx*odt;o.y+=o.vy*odt;o.life-=odt;if(o.ally){for(const e of s.enemies)if(e.hp>0&&!(o.hits||[]).includes(e.id)&&Math.abs(o.x-e.x)<(e.boss?95:35)&&(e.kind==='bat'?Math.abs(o.y-enemyHeight(e))<42:o.y<(e.boss?200:140))){damageEnemy(s,e,o.damage||46,o.source||'lamp',o.x-Math.sign(o.vx)*55,o.paid||20);(o.hits||(o.hits=[])).push(e.id);if(!o.pierce){o.life=0;break;}}}else if(Math.abs(o.x-p.x)<25&&Math.abs(o.y-(p.y+55))<42){hurt(s);o.life=0;}}
for(const h of s.hazards){h.life-=dt;if(!h.hit&&Math.abs(p.x-h.x)<h.radius&&p.y<80){hurt(s);h.hit=true;}}s.hazards=s.hazards.filter(h=>h.life>0);
for(const t of s.totems){t.life-=dt;t.tick-=dt;if(t.tick<=0&&t.life>1e-6){t.tick+=.5;for(const e of s.enemies)if(e.hp>0&&Math.abs(e.x-t.x)<100&&enemyHeight(e)<200)damageEnemy(s,e,14,'lamp',t.x,t.paid,true);s.events.push({type:'candlePulse',x:t.x,y:35});}}s.totems=s.totems.filter(t=>t.life>0);
s.orbs=s.orbs.filter(o=>o.life>0&&o.x>0&&o.x<s.length);if(s.status==='fight'&&cleared(s)&&p.x>=s.exit){s.status='clear';s.events.push({type:'clear'});}return s;}
function makeSave(chapter,memories,ending=null,progress=null){chapter=clamp(chapter,0,2);return{version:2,chapter,memories:[...new Set(memories.filter(x=>memoryIds.includes(x)))],ending,progress:normalizeProgress(progress,chapter)};}
function readSave(raw){try{const d=JSON.parse(raw);if(![1,2].includes(d.version)||!Number.isInteger(d.chapter)||d.chapter<0||d.chapter>2||!Array.isArray(d.memories))return null;return makeSave(d.chapter,d.memories,['dawn','home','ash'].includes(d.ending)?d.ending:null,d.version===2?d.progress:null);}catch{return null;}}
return{combatMemories,burnable,burn,giveUp,hollow,chapters,create,createTrial,step,makeSave,readSave,skills,XP,level,points,maxHP,normalizeProgress,learn,respec,syncProgress,cost,cleared,spells,spell,equipSpell};});
