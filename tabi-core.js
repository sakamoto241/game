/* Deterministic simulation for ちいさな魔女の旅じたく. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Tabi=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const HEROES={lili:{name:'リリ',role:'魔法・後衛',art:0},noa:{name:'ノア',role:'剣士・前衛',art:1},mina:{name:'ミナ',role:'回復・後衛',art:2}};
const UPGRADES={fire:{name:'火の玉',base:24,growth:1.35,max:20},staff:{name:'木の杖',base:36,growth:1.36,max:20},noa:{name:'ノア',base:28,growth:1.34,max:20},mina:{name:'ミナ',base:32,growth:1.34,max:20}};
const SKILLS={double:{name:'ふたつの火',cost:6,description:'火の玉が2つに。合計威力が50%アップ。'},ward:{name:'まもりの盾',cost:4,description:'ノアが3回攻撃するたび、全員にバリア。'},bloom:{name:'花の祈り',cost:4,description:'ミナの3回目の回復が、仲間全員に届く。'}};
const PLACES=['森の入り口','花咲く小道','こもれびの丘','きのこの広場','小川のほとり','祈りの石橋','風のぬけ道','大樹の根もと','迷いの林','朝露の泉','守り人の道','森の主の庭'];
const ENCOUNTERS=7;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const integer=(v,a,b,f=a)=>Number.isFinite(Number(v))?clamp(Math.floor(Number(v)),a,b):f;
function newGame(now=Date.now()){return{version:1,coins:40,wood:0,crystals:0,upgrades:{fire:1,staff:1,noa:1,mina:1},skills:{double:false,ward:false,bloom:false},highest:0,stage:1,encounter:0,unlocked:{noa:false,mina:false},wagon:0,completed:false,crafted:false,exploring:false,cycles:0,wins:0,defeats:0,rally:100,playtime:0,savedAt:now};}
function load(raw,now=Date.now()){
 if(!raw||raw.version!==1||!raw.upgrades)return null;const s=newGame(now);
 for(const k of ['coins','wood','crystals','wins','defeats'])s[k]=integer(raw[k],0,9999999);
 for(const k of Object.keys(UPGRADES))s.upgrades[k]=integer(raw.upgrades[k],1,20);
 for(const k of Object.keys(SKILLS))s.skills[k]=raw.skills?.[k]===true;
 s.highest=integer(raw.highest,0,12);s.stage=integer(raw.stage,1,12);s.encounter=integer(raw.encounter,0,ENCOUNTERS-1);s.cycles=integer(raw.cycles,0,999);
 s.unlocked.noa=s.highest>=3;s.unlocked.mina=s.highest>=6;s.wagon=raw.wagon===1&&s.highest>=12?1:0;s.completed=!!s.wagon;s.crafted=!!raw.crafted&&!!s.wagon;s.exploring=!!raw.exploring&&s.completed;
 if(!s.unlocked.noa)s.skills.ward=false;if(!s.unlocked.mina)s.skills.bloom=false;
 s.rally=integer(raw.rally,0,100);s.playtime=integer(raw.playtime,0,315360000);s.savedAt=integer(raw.savedAt,0,now,now);return s;
}
function cost(s,key){const d=UPGRADES[key];return !d||s.upgrades[key]>=d.max?Infinity:Math.floor(d.base*d.growth**(s.upgrades[key]-1));}
function stats(s,id){
 const u=s.upgrades;if(id==='lili')return{maxHp:85+(u.staff-1)*13+(s.crafted?20:0),atk:9+(u.fire-1)*4+(u.staff-1)*2+(s.crafted?6:0),heal:0,interval:1.7};
 if(id==='noa')return{maxHp:140+(u.noa-1)*28,atk:12+(u.noa-1)*4,heal:0,interval:1.5};
 return{maxHp:85+(u.mina-1)*16,atk:7+(u.mina-1)*2,heal:18+(u.mina-1)*5,interval:2.25};
}
function ids(s){return['lili',...(s.unlocked.noa?['noa']:[]),...(s.unlocked.mina?['mina']:[])];}
function freshHero(s,id){return{id,...stats(s,id),hp:stats(s,id).maxHp,shield:0,cooldown:id==='lili'?.5:id==='noa'?.8:1.2,actions:0,heals:0,pose:0};}
function emit(r,type,text,data={}){r.events.push({type,text,...data});r.log.push(text);if(r.log.length>24)r.log.shift();}
function sync(s,r){for(const id of ids(s)){let h=r.heroes.find(h=>h.id===id);if(!h){h=freshHero(s,id);r.heroes.push(h);}else{const st=stats(s,id),delta=st.maxHp-h.maxHp;h.hp=Math.min(st.maxHp,h.hp+delta);Object.assign(h,st);}}}
function enemies(s){
 const stage=s.stage,round=s.encounter,boss=stage===12&&round===ENCOUNTERS-1,mini=[4,8].includes(stage)&&round===ENCOUNTERS-1,multi=stage>=7&&!boss&&!mini;
 const power=1+s.cycles*.18,baseHp=38*1.18**(stage-1)*power,atk=(6+stage*1.5)*power;
 if(boss)return[{id:'golem',name:'こけむす守り人',art:5,hp:Math.round(baseHp*3.4),maxHp:Math.round(baseHp*3.4),atk:atk*1.35,cooldown:2.6,interval:2.4,actions:0,boss:true}];
 return Array.from({length:multi?2:1},(_,i)=>{const mush=(stage+round+i)%3===0,hp=Math.round(baseHp*(mini?1.8:multi?.72:1));return{id:mush||mini?'mushroom':'slime',name:mini?'きのこのおやぶん':mush?'もりきのこ':'しずくスライム',art:mush||mini?4:3,hp,maxHp:hp,atk:atk*(multi?.67:mini?1.2:1),cooldown:1.5+i*.65,interval:2.2,actions:0,boss:mini};});
}
function spawn(s,r){sync(s,r);r.enemies=enemies(s);r.mode='fight';r.timer=0;r.heroBuff=0;r.label='';emit(r,'encounter',s.stage===12&&s.encounter===ENCOUNTERS-1?'森の主が、道をふさいでいる。':PLACES[s.stage-1]+'を進んでいる。');}
function createRun(s){const r={heroes:ids(s).map(id=>freshHero(s,id)),enemies:[],mode:'fight',timer:0,events:[],log:[],heroBuff:0,time:0,label:'',bossSeen:false};spawn(s,r);if(s.highest>=12&&!s.wagon){r.mode='camp';r.label='木材を使って、はじめての改築を。';}else if(s.completed&&!s.exploring){r.mode='complete';r.label='旅のつづきは、ここから。';}return r;}
function upgrade(s,r,key){if(!Object.hasOwn(UPGRADES,key))return{ok:false,error:'強化を選んでください。'};if((key==='noa'||key==='mina')&&!s.unlocked[key])return{ok:false,error:'道中で仲間になるのを待とう。'};const c=cost(s,key);if(!Number.isFinite(c))return{ok:false,error:'最大レベルです。'};if(s.coins<c)return{ok:false,error:'コインが足りません。戦闘で集めよう。'};s.coins-=c;s.upgrades[key]++;sync(s,r);emit(r,'upgrade',UPGRADES[key].name+'が Lv.'+s.upgrades[key]+' に！',{hero:key==='noa'||key==='mina'?key:'lili'});return{ok:true};}
function learn(s,r,key){const d=SKILLS[key];if(!d||s.skills[key])return{ok:false,error:'すでに覚えています。'};if((key==='ward'&&!s.unlocked.noa)||(key==='bloom'&&!s.unlocked.mina))return{ok:false,error:'先に仲間と出会おう。'};if(s.crystals<d.cost)return{ok:false,error:'魔石が足りません。新しい道を進もう。'};s.crystals-=d.cost;s.skills[key]=true;emit(r,'upgrade',d.name+'を覚えた！',{hero:key==='ward'?'noa':key==='bloom'?'mina':'lili'});return{ok:true};}
function hurt(r,unit,amount,side){const absorbed=Math.min(unit.shield||0,amount);if(absorbed)unit.shield-=absorbed;const n=Math.min(unit.hp,Math.max(0,amount-absorbed));unit.hp-=n;emit(r,'damage',unit.id==='golem'?'守り人に '+Math.round(n):side==='hero'?HEROES[unit.id].name+' に '+Math.round(n)+'ダメージ':unit.name+' に '+Math.round(n)+'ダメージ',{side,id:unit.id,index:side==='enemy'?r.enemies.indexOf(unit):r.heroes.indexOf(unit),amount:Math.round(n)});}
function heal(r,h,n){const actual=Math.min(h.maxHp-h.hp,n);if(h.hp<=0||actual<=0)return;h.hp+=actual;emit(r,'heal',HEROES[h.id].name+'のHPが '+Math.round(actual)+' 回復。',{id:h.id,amount:Math.round(actual)});}
function rally(s,r){if(s.rally<100||r.mode!=='fight')return{ok:false,error:'星の力がたまるまで待とう。'};s.rally=0;r.heroBuff=7;for(const h of r.heroes.filter(h=>h.hp>0)){heal(r,h,h.maxHp*.16);h.shield=Math.max(h.shield,h.maxHp*.22);h.cooldown=Math.min(h.cooldown,.2);}emit(r,'rally','連携技「木漏れ日の約束」！ 7秒間、攻撃1.6倍・バリアと回復。');return{ok:true};}
function clear(s,r){
 const final=s.stage===12&&s.encounter===ENCOUNTERS-1;
 s.wins++;const coins=5+Math.floor(s.stage*1.6)+(s.encounter===ENCOUNTERS-1?8+s.stage*2:0);s.coins+=coins;s.rally=Math.min(100,s.rally+7);
 emit(r,'reward','コイン ＋'+coins,{coins});
 for(const h of r.heroes){if(h.hp<=0)h.hp=h.maxHp*.3;else heal(r,h,h.maxHp*(s.wagon?.2:.12));}
 if(s.encounter===ENCOUNTERS-1){const first=s.highest<s.stage;s.highest=Math.max(s.highest,s.stage);
  if(first){const wood=final?16:s.stage===1?0:2;s.wood+=wood;s.crystals+=final?4:1;emit(r,'material','木材 ＋'+wood+'・魔石 ＋'+(final?4:1),{wood,crystals:final?4:1});}
  if(s.highest>=3&&!s.unlocked.noa){s.unlocked.noa=true;sync(s,r);emit(r,'join','剣士ノアが仲間になった。前に立って、一行を守ってくれる。',{hero:'noa'});}
  if(s.highest>=6&&!s.unlocked.mina){s.unlocked.mina=true;sync(s,r);emit(r,'join','癒やし手ミナが仲間になった。傷ついた仲間を回復してくれる。',{hero:'mina'});}
  if(final){s.exploring=false;r.mode=s.wagon?'complete':'camp';r.timer=0;r.label=s.wagon?'森をもう一度、歩ききった。':'森に、帰り道が戻った。荷馬車を改築しよう。';s.wood=Math.max(30,s.wood);emit(r,s.wagon?'expedition':'bossclear','森の主を倒した！ 手押し車を、屋根付き馬車に改築できる。');return;}
  r.nextStage=s.stage+1;r.nextEncounter=0;
 }else{r.nextStage=s.stage;r.nextEncounter=s.encounter+1;}
 r.mode='travel';r.timer=1.7;r.label='素材をしまって、次の道へ。';
}
function step(s,r,seconds){
 const dt=clamp(Number(seconds)||0,0,.25);r.events=[];if(dt<=0)return r.events;r.time+=dt;s.playtime+=dt;s.rally=Math.min(100,s.rally+dt*1.25);r.heroBuff=Math.max(0,r.heroBuff-dt);
 if(r.mode==='complete'||r.mode==='camp')return r.events;
 if(r.mode==='travel'||r.mode==='rest'){r.timer-=dt;if(r.timer<=0){s.stage=r.nextStage;s.encounter=r.nextEncounter;if(r.mode==='rest'){r.heroes=ids(s).map(id=>freshHero(s,id));}spawn(s,r);}return r.events;}
 for(const h of r.heroes){h.pose=Math.max(0,h.pose-dt);if(h.hp<=0)continue;h.cooldown-=dt*(r.heroBuff>0?1.25:1);if(h.cooldown>0)continue;h.cooldown+=h.interval;h.actions++;h.pose=.36;
  const weak=r.heroes.filter(a=>a.hp>0&&a.hp<a.maxHp*.92).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(h.id==='mina'&&weak){h.heals=(h.heals||0)+1;if(s.skills.bloom&&h.heals%3===0)for(const a of r.heroes)heal(r,a,h.heal*.75);else heal(r,weak,h.heal);emit(r,'cast','ミナの、花の祈り。',{hero:'mina'});}
  else {const enemy=r.enemies.find(e=>e.hp>0);if(!enemy)break;const n=h.atk*(r.heroBuff>0?1.6:1);hurt(r,enemy,n,'enemy');if(h.id==='lili'&&s.skills.double&&enemy.hp>0)hurt(r,enemy,n*.5,'enemy');emit(r,'attack',HEROES[h.id].name+'の攻撃。',{hero:h.id,target:r.enemies.indexOf(enemy),double:h.id==='lili'&&s.skills.double});}
  if(h.id==='noa'&&s.skills.ward&&h.actions%3===0){for(const a of r.heroes.filter(a=>a.hp>0))a.shield=Math.max(a.shield,5+s.upgrades.noa*2);emit(r,'shield','ノアが全員に、まもりの盾。');}
 }
 if(r.enemies.every(e=>e.hp<=0)){clear(s,r);return r.events;}
 for(const e of r.enemies){if(e.hp<=0)continue;e.cooldown-=dt;if(e.cooldown>0)continue;e.cooldown+=e.interval;const big=e.boss&&e.actions%3===2;e.actions++;
  if(big){emit(r,'big','森の力が、押し寄せる！');for(const h of r.heroes.filter(h=>h.hp>0))hurt(r,h,e.atk*.95,'hero');}
  else{const h=['noa','lili','mina'].map(id=>r.heroes.find(a=>a.id===id&&a.hp>0)).find(Boolean);if(h)hurt(r,h,e.atk,'hero');}
 }
 if(r.heroes.every(h=>h.hp<=0)){s.defeats++;r.mode='rest';r.timer=3;r.nextStage=Math.floor((s.stage-1)/3)*3+1;r.nextEncounter=0;r.label='荷馬車でひと休み。素材と強化は、そのまま。';emit(r,'defeat',r.label);}
 return r.events;
}
function renovate(s,r){if(s.wagon)return{ok:false,error:'すでに改築しています。'};if(s.highest<12)return{ok:false,error:'森の主を倒すと改築できます。'};if(s.wood<30)return{ok:false,error:'木材があと'+(30-s.wood)+'必要です。'};s.wood-=30;s.wagon=1;s.completed=true;s.exploring=false;r.mode='complete';for(const h of r.heroes){h.hp=h.maxHp;h.shield=0;}emit(r,'ending','小さな旅が、帰る場所になった。');return{ok:true};}
function replay(s,r){if(!s.completed)return false;s.cycles++;s.exploring=true;s.stage=1;s.encounter=0;s.rally=100;r.heroes=ids(s).map(id=>freshHero(s,id));spawn(s,r);return true;}
function craft(s,r){if(!s.wagon||s.crafted)return{ok:false,error:'改築後に一度だけ仕立て直せます。'};if(s.wood<6||s.crystals<1)return{ok:false,error:'木材6と魔石1が必要です。'};s.wood-=6;s.crystals--;s.crafted=true;sync(s,r);emit(r,'upgrade','花飾りの杖ができた！ リリの魔力＋6・HP＋20。',{hero:'lili'});return{ok:true};}
function offline(s,now=Date.now()){const elapsed=clamp((now-s.savedAt)/1000,0,14400);s.savedAt=now;if(elapsed<60||s.highest===0||s.completed)return{seconds:0,coins:0};const coins=Math.floor(elapsed*(.012+s.highest*.004));s.coins+=coins;return{seconds:Math.floor(elapsed),coins};}
return{HEROES,UPGRADES,SKILLS,PLACES,ENCOUNTERS,newGame,load,cost,stats,createRun,upgrade,learn,rally,step,renovate,replay,craft,offline};
});
