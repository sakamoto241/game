/* Yoru no Tomodachi — deterministic battle rules shared by the game and tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.YoruGame=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const ELEMENTS={fire:{name:'火',icon:'炎',color:'#df8b65'},water:{name:'水',icon:'雫',color:'#79acbb'},wood:{name:'木',icon:'葉',color:'#9bb582'},night:{name:'夜',icon:'月',color:'#ad99be'}};
 const FOODS={dango:{name:'みたらし団子',icon:'🍡',color:'#d7b48c'},soda:{name:'ラムネ',icon:'🫧',color:'#92c6d0'},rice:{name:'おにぎり',icon:'🍙',color:'#e0dfc6'}};
 const SPECIES=[
  {id:'akari',name:'あかりこ',element:'fire',hp:45,atk:11,def:2,fav:'dango',role:'攻撃',skill:'あかりの舞',effect:'burn',power:1.8,description:'小さな提灯に、帰り道のぬくもりが宿った。',tip:'敵1体に大ダメージ。2ターン、やけど。'},
  {id:'shizu',name:'しずぽん',element:'water',hp:49,atk:9,def:3,fav:'soda',role:'回復',skill:'しずくの輪',effect:'heal',power:0,description:'雨あがりの水たまりから、こっそりついてきた。',tip:'味方全員のHPを大きく回復。'},
  {id:'koke',name:'こけもち',element:'wood',hp:57,atk:8,def:4,fav:'rice',role:'守備',skill:'木もれび結界',effect:'shield',power:1.1,description:'古い石段のこけ。なでると、少し元気になる。',tip:'敵1体を攻撃し、味方全員にバリア。'},
  {id:'mame',name:'まめだま',element:'night',hp:42,atk:7,def:2,fav:'rice',role:'回復',skill:'まめなおすそわけ',effect:'heal',power:0,description:'ポケットの忘れ豆。意外と面倒見がいい。',tip:'味方全員のHPを回復。3体編成の支え役。'},
  {id:'yakan',name:'やかん坊',element:'fire',hp:53,atk:12,def:3,fav:'dango',role:'全体攻撃',skill:'ふきこぼれ噴火',effect:'aoe',power:1.45,description:'火を消し忘れられたやかん。湯気で気持ちを伝える。',tip:'敵全員を攻撃。相手が多いほど得意。'},
  {id:'kasa',name:'かさぼん',element:'water',hp:46,atk:11,def:2,fav:'soda',role:'吸収',skill:'あめあめ返し',effect:'drain',power:1.75,description:'傘立てに残された一本。相合い傘にあこがれている。',tip:'敵1体を攻撃し、与えたダメージの半分を回復。'},
  {id:'maki',name:'まきものん',element:'wood',hp:44,atk:10,def:2,fav:'rice',role:'妨害',skill:'しばり書き',effect:'stun',power:1.15,description:'読まれなかった手紙が、巻き物のふりをしている。',tip:'敵1体を攻撃し、次の行動を1回止める。'},
  {id:'hiba',name:'ひばねず',element:'fire',hp:39,atk:14,def:1,fav:'dango',role:'攻撃',skill:'火花のとっしん',effect:'double',power:1.2,description:'たき火から飛び出した、ちいさな負けずぎらい。',tip:'敵1体に2回攻撃。守備は苦手。'},
  {id:'nemu',name:'ねむくらげ',element:'water',hp:58,atk:8,def:3,fav:'soda',role:'妨害',skill:'おやすみの波',effect:'stun',power:1.0,description:'眠れない夜のため息が、ふわりと泳ぎだした。',tip:'敵1体を攻撃し、次の行動を1回止める。'},
  {id:'neji',name:'ねじりだま',element:'wood',hp:64,atk:10,def:5,fav:'rice',role:'守備',skill:'どっしり根ばり',effect:'fortress',power:1.25,description:'抜かれなかった雑草たちの、ちょっとした意地。',tip:'敵1体を攻撃。全員に強いバリア、自分は追加回復。'},
  {id:'neko',name:'よるねこ',element:'night',hp:43,atk:13,def:2,fav:'dango',role:'攻撃',skill:'月かげの一撃',effect:'strike',power:2.2,description:'街灯と街灯のすきまを歩く。約束には遅れない。',tip:'敵1体に強力な一撃。属性に左右されない。'},
  {id:'fuku',name:'ほしふくろう',element:'night',hp:51,atk:10,def:3,fav:'soda',role:'連携',skill:'星よみの合図',effect:'charge',power:0,description:'迷いそうな夜だけ、看板の上に現れる道案内。',tip:'自分以外の妖気を2増やし、味方全員を少し回復。'}
 ];
 const MONSTERS=Object.fromEntries(SPECIES.map(s=>[s.id,s]));
 const BOSS={id:'lantern',name:'まよい灯籠',element:'fire',hp:250,atk:15,def:5,fav:null,role:'夜の主',skill:'百鬼の灯',description:'街の帰り道を、ひとりで抱えこんだ大きな灯。'};
 const AREAS=[
  {id:0,name:'おかえり横丁',subtitle:'まずは、ごあいさつ。',level:1,pool:['akari','shizu','koke'],count:1,color:'#dbc493',symbol:'🏮'},
  {id:1,name:'あめふり商店街',subtitle:'傘の下で、だれかが笑う。',level:2,pool:['kasa','nemu','shizu'],count:2,color:'#a4c1c9',symbol:'☂'},
  {id:2,name:'うら庭のぬけ道',subtitle:'足元にも、友だちはいる。',level:3,pool:['maki','neji','koke'],count:2,color:'#b2c39b',symbol:'葉'},
  {id:3,name:'わすれもの通り',subtitle:'忘れたものが、待っている。',level:4,pool:['yakan','hiba','neko'],count:3,color:'#d2a992',symbol:'♨'},
  {id:4,name:'まよなかの駅',subtitle:'最終電車の、そのあとに。',level:5,pool:['fuku','neko','nemu'],count:3,color:'#baa9cf',symbol:'月'},
  {id:5,name:'帰らずの芝居小屋',subtitle:'今宵の舞台、いざ開幕。',level:6,pool:[],count:3,color:'#b99bb6',symbol:'灯',boss:true}
 ];
 const STARTERS=['akari','shizu','koke'];
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const isMonster=id=>Object.hasOwn(MONSTERS,id);
 function affinity(a,b){if(a==='night'||b==='night'||a===b)return 1;if((a==='fire'&&b==='wood')||(a==='wood'&&b==='water')||(a==='water'&&b==='fire'))return 1.65;return .65;}
 function stats(id,level=1,bond=1){const d=id==='lantern'?BOSS:MONSTERS[id];level=clamp(level,1,6);return{maxHp:d.hp+(id==='lantern'?0:(level-1)*6)+Math.min(4,Math.max(0,bond-1)),atk:d.atk+(level-1)*2,def:d.def+Math.floor((level-1)/3),element:d.element};}
 function newGame(starter){if(!STARTERS.includes(starter))throw Error('Choose a starter');return{version:1,starter,roster:[{id:starter,level:1,xp:0,bond:1},{id:'mame',level:1,xp:0,bond:1}],team:[starter,'mame'],coins:60,foods:{rice:4,dango:4,soda:4},cleared:[],boss:false,battleCount:0,wins:0,losses:0,newest:null};}
 function load(value){
  if(!value||value.version!==1||!STARTERS.includes(value.starter)||!Array.isArray(value.roster))return null;
  const s=newGame(value.starter),seen=new Set();s.roster=[];
  for(const p of value.roster){if(!p||!isMonster(p.id)||seen.has(p.id))continue;seen.add(p.id);s.roster.push({id:p.id,level:clamp(Math.floor(Number(p.level)||1),1,6),xp:clamp(Math.floor(Number(p.xp)||0),0,120),bond:clamp(Math.floor(Number(p.bond)||1),1,5)});}
  if(!s.roster.length)return null;
  s.team=Array.isArray(value.team)?[...new Set(value.team)].filter(id=>seen.has(id)).slice(0,3):[];if(!s.team.length)s.team=s.roster.slice(0,3).map(p=>p.id);
  s.coins=clamp(Math.floor(Number(value.coins)||0),0,999999);
  for(const key of Object.keys(FOODS))s.foods[key]=clamp(Math.floor(Number(value.foods?.[key])||0),0,99);
  s.cleared=Array.isArray(value.cleared)?[...new Set(value.cleared.filter(n=>Number.isInteger(n)&&n>=0&&n<=5))]:[];s.boss=!!value.boss&&s.cleared.includes(5);
  for(const key of ['battleCount','wins','losses'])s[key]=clamp(Math.floor(Number(value[key])||0),0,999999);
  s.newest=isMonster(value.newest)?value.newest:null;return s;
 }
 function unlock(s,area){return area===0||s.cleared.includes(area-1);}
 function makeUnit(id,level,bond=1){const st=stats(id,level,bond);return{id,level,bond,...st,hp:st.maxHp,charge:0,shield:0,burn:0,stun:0,stunResist:0,rapport:15,captured:false,guard:false};}
 function encounter(s,areaId){
  const area=AREAS[areaId];if(!area||!unlock(s,areaId))throw Error('Area locked');
  if(area.boss)return[{id:'lantern',level:6},{id:'fuku',level:5},{id:'neji',level:5}];
  if(areaId===0&&s.battleCount===0){const counters={akari:'koke',shizu:'akari',koke:'shizu'};return[{id:counters[s.starter],level:1}];}
  const seed=s.battleCount*7+areaId*11;
  return Array.from({length:area.count},(_,i)=>({id:area.pool[(seed+i*2)%area.pool.length],level:area.level}));
 }
 function createBattle(s,areaId){
  const enemies=encounter(s,areaId).map(p=>makeUnit(p.id,p.level));s.battleCount++;
  const allies=s.team.map(id=>s.roster.find(p=>p.id===id)).filter(Boolean).map(p=>makeUnit(p.id,p.level,p.bond));
  const b={area:areaId,turn:1,allies,enemies,target:0,selected:0,log:[],events:[],done:false,victory:false,captures:[],fed:false,reward:null};
  b.enemies.forEach((e,i)=>e.slot=i);plan(b);return b;
 }
 function living(list){return list.filter(u=>u.hp>0&&!u.captured);}
 function name(u){return u.id==='lantern'?BOSS.name:MONSTERS[u.id].name;}
 function emit(b,text,type='info',target=null){b.log.push(text);b.events.push({text,type,target});if(b.log.length>45)b.log.shift();}
 function targetIndex(b,e){let best=-1,score=-Infinity;b.allies.forEach((a,i)=>{if(a.hp<=0)return;const rank=affinity(e.element,a.element)*2+(1-a.hp/a.maxHp);if(rank>score){score=rank;best=i;}});return best;}
 function plan(b){
  for(const e of b.enemies){if(e.hp<=0||e.captured){e.intent=null;continue;}const target=targetIndex(b,e),phase=(b.turn+(e.id==='lantern'?0:e.slot))%4;
   if(e.stun>0)e.intent={kind:'stunned',label:'ひるんでいる',target};
   else if(e.id==='fuku'&&b.turn%3===2)e.intent={kind:'heal',label:'仲間を回復',target};
   else if(e.id==='neji'&&b.turn%3===2)e.intent={kind:'shield',label:'全員にバリア',target};
   else if(phase===2)e.intent={kind:'charge',label:'大技をためる',target};
   else if(phase===3)e.intent={kind:'big',label:e.id==='lantern'?'大技：味方全員！':'大技：'+(b.allies[target]?name(b.allies[target]):'味方'),target};
   else e.intent={kind:'attack',label:'攻撃 → '+(b.allies[target]?name(b.allies[target]):'味方'),target};
  }
 }
 function damage(attacker,defender,power=1){return Math.max(2,Math.round((attacker.atk*power-defender.def*.7)*affinity(attacker.element,defender.element)));}
 function hit(b,attacker,defender,power=1,mercy=false,guarded=false){
  let n=damage(attacker,defender,power);if(guarded)n=Math.max(1,Math.floor(n*.4));const absorbed=Math.min(defender.shield,n);defender.shield-=absorbed;n-=absorbed;
  const actual=Math.min(defender.hp,mercy?Math.min(n,Math.max(0,defender.hp-1)):n);defender.hp-=actual;
  emit(b,name(attacker)+' → '+name(defender)+' に '+actual+'ダメージ'+(absorbed?'（バリア '+absorbed+'）':''),'damage',defender.id);
  const event=b.events[b.events.length-1],side=b.enemies.includes(defender)?'enemy':'ally';
  event.side=side;event.slot=(side==='enemy'?b.enemies:b.allies).indexOf(defender);event.amount=actual;
  if(b.enemies.includes(defender)&&actual>0)defender.rapport=clamp(defender.rapport+(affinity(attacker.element,defender.element)>1?8:5),0,100);
  if(defender.hp<=0)emit(b,name(defender)+' は力つきた。','down',defender.id);
  return actual;
 }
 function heal(b,u,amount){if(u.hp<=0)return;const n=Math.min(u.maxHp-u.hp,amount);u.hp+=n;if(n>0)emit(b,name(u)+' のHPが '+n+' 回復。','heal',u.id);}
 function foodGain(enemy,food,firstFriend=false){if(enemy.id==='lantern'||enemy.hp<=0||enemy.captured)return 0;const ratio=enemy.hp/enemy.maxHp,fav=MONSTERS[enemy.id].fav===food;
  if(firstFriend&&ratio<=.45&&fav)return 100;
  return (ratio<=.4?55:ratio<=.7?35:15)+(fav?25:0);
 }
 function checkEnd(b){if(!living(b.enemies).length){b.done=true;b.victory=true;return true;}if(!living(b.allies).length){b.done=true;b.victory=false;return true;}return false;}
 function selectedEnemy(b){let e=b.enemies[b.target];if(!e||e.hp<=0||e.captured){b.target=b.enemies.findIndex(e=>e.hp>0&&!e.captured);e=b.enemies[b.target];}return e;}
 function act(b,s,command,option){
  if(b.done)return{ok:false,error:'戦いは終わっています。'};
  const actor=b.allies[b.selected];if((command==='skill'||command==='mercy')&&(!actor||actor.hp<=0))return{ok:false,error:'元気な仲間を選んでください。'};
  if(command==='skill'&&actor.charge<3)return{ok:false,error:'妖気が足りません。攻撃や守るでためよう。'};
  const target=selectedEnemy(b);
  if(command==='food'){
   if(!Object.hasOwn(FOODS,option)||!s.foods[option])return{ok:false,error:'そのおやつを持っていません。'};
   if(target?.id==='lantern')return{ok:false,error:'まよい灯籠は、今はおやつを受け取らない。'};
  }
  if(!['attack','mercy','guard','skill','food'].includes(command))return{ok:false,error:'指示を選んでください。'};
  b.events=[];for(const a of b.allies)a.guard=false;
  if(command==='attack'){
   for(const a of living(b.allies)){const e=selectedEnemy(b);if(!e)break;hit(b,a,e);a.charge=Math.min(3,a.charge+1);}
  }else if(command==='mercy'){
   hit(b,actor,target,.85,true);actor.charge=Math.min(3,actor.charge+1);emit(b,'手かげんした！ 相手のHPを1より下にはしない。');
  }else if(command==='guard'){
   for(const a of living(b.allies)){a.guard=true;a.charge=Math.min(3,a.charge+1);}emit(b,'全員で守りを固めた。ダメージを60%軽減！','guard');
   for(const e of living(b.enemies))if(e.intent?.kind==='big')e.rapport=Math.min(100,e.rapport+8);
  }else if(command==='food'){
   s.foods[option]--;const gain=foodGain(target,option,s.roster.length===2);target.rapport=Math.min(100,target.rapport+gain);b.fed=true;
   emit(b,name(target)+' に '+FOODS[option].name+' をおすそわけ。なつき ＋'+gain,'food',target.id);
   if(target.rapport>=100){target.captured=true;b.captures.push({id:target.id,level:target.level});emit(b,name(target)+' と、ともだちになった！','capture',target.id);}
  }else if(command==='skill'){
   const d=MONSTERS[actor.id];actor.charge=0;emit(b,name(actor)+' の「'+d.skill+'」！','skill',actor.id);
   for(const a of living(b.allies))if(a!==actor)a.charge=Math.min(3,a.charge+1);
   if(d.effect==='heal'){const amount=(actor.id==='shizu'?19:14)+actor.level*2;for(const a of living(b.allies))heal(b,a,amount);}
   else if(d.effect==='charge'){for(const a of living(b.allies)){if(a!==actor)a.charge=Math.min(3,a.charge+1);heal(b,a,7+actor.level);}}
   else if(d.effect==='aoe'){for(const e of living(b.enemies))hit(b,actor,e,d.power);}
   else if(d.effect==='double'){for(let i=0;i<2;i++){const e=selectedEnemy(b);if(e)hit(b,actor,e,d.power);}}
   else {const n=hit(b,actor,target,d.power);
    if(d.effect==='burn'&&target.hp>0){target.burn=2;emit(b,name(target)+' は、やけどした。');}
    if(d.effect==='drain')heal(b,actor,Math.round(n*.5));
    if(d.effect==='shield'||d.effect==='fortress'){for(const a of living(b.allies))a.shield=Math.max(a.shield,(d.effect==='fortress'?12:8)+actor.level);if(d.effect==='fortress')heal(b,actor,12+actor.level*2);emit(b,'仲間全員にバリアを張った。','guard');}
    if(d.effect==='stun'&&target.hp>0){if(target.stunResist>0)emit(b,name(target)+' は、連続の足止めをこらえた。');else{target.stun=1;target.stunResist=3;emit(b,name(target)+' の次の行動を止めた！','stun',target.id);}}
   }
  }
  if(checkEnd(b))return{ok:true};
  for(const e of b.enemies){
   if(e.hp<=0||e.captured)continue;
   if(e.burn>0){e.burn--;const n=Math.min(e.hp,4+e.level);e.hp-=n;emit(b,name(e)+' にやけど '+n);if(e.hp<=0){emit(b,name(e)+' は力つきた。','down',e.id);continue;}}
   if(e.stun>0){e.stun--;emit(b,name(e)+' は、ひるんで動けない。','stun',e.id);continue;}
   const intent=e.intent;if(!intent)continue;
   if(intent.kind==='charge'){emit(b,name(e)+' は、大技をためている……','warning',e.id);continue;}
   if(intent.kind==='heal'){const allies=living(b.enemies).sort((a,z)=>a.hp/a.maxHp-z.hp/z.maxHp);if(allies[0])heal(b,allies[0],20+e.level*2);continue;}
   if(intent.kind==='shield'){for(const friend of living(b.enemies))friend.shield=Math.max(friend.shield,9+e.level);emit(b,'敵のねじりだまが全員にバリアを張った。','guard');continue;}
   if(intent.kind==='big'&&e.id==='lantern'){emit(b,'まよい灯籠の「百鬼の灯」！','warning',e.id);for(const a of living(b.allies))hit(b,e,a,1.25,false,a.guard);}
   else {let a=b.allies[intent.target];if(!a||a.hp<=0)a=living(b.allies)[0];if(a)hit(b,e,a,intent.kind==='big'?1.65:1,false,a.guard);}
   if(!living(b.allies).length)break;
  }
  if(checkEnd(b))return{ok:true};
  for(const e of b.enemies){if(e.stunResist>0)e.stunResist--;if(e.id==='lantern'&&e.hp>0){const old=e.element;e.element=e.hp/e.maxHp>2/3?'fire':e.hp/e.maxHp>1/3?'water':'wood';if(old!==e.element)emit(b,'まよい灯籠の属性が「'+ELEMENTS[e.element].name+'」に変わった！','warning');}}
  b.turn++;if(!b.allies[b.selected]||b.allies[b.selected].hp<=0)b.selected=b.allies.findIndex(a=>a.hp>0);selectedEnemy(b);plan(b);return{ok:true};
 }
 function needed(level){return 22+level*12;}
 function finishBattle(s,b){
  if(!b.done)return null;if(b.reward)return b.reward;
  const area=AREAS[b.area],coins=b.victory?20+area.level*9:6,exp=b.victory?24+area.level*14:0,levels=[],friends=[];
  s.coins+=coins;
  for(const captured of b.captures){const old=s.roster.find(p=>p.id===captured.id);if(old){old.bond=Math.min(5,old.bond+1);friends.push({id:old.id,duplicate:true});}else{s.roster.push({id:captured.id,level:captured.level,xp:0,bond:1});friends.push({id:captured.id,duplicate:false});s.newest=captured.id;if(s.team.length<3)s.team.push(captured.id);}}
  if(b.victory){s.wins++;if(!s.cleared.includes(b.area))s.cleared.push(b.area);if(area.boss)s.boss=true;
   for(const a of b.allies){const p=s.roster.find(p=>p.id===a.id);if(!p)continue;p.xp+=exp;const before=p.level;while(p.level<6&&p.xp>=needed(p.level)){p.xp-=needed(p.level);p.level++;}if(p.level===6)p.xp=0;if(p.level>before)levels.push({id:p.id,from:before,to:p.level});}
  }else s.losses++;
  b.reward={coins,exp,levels,friends,victory:b.victory,boss:!!area.boss,area:b.area,turns:b.turn};return b.reward;
 }
 function buyFood(s,id){if(!Object.hasOwn(FOODS,id))return{ok:false,error:'おやつを選んでください。'};if(s.coins<12)return{ok:false,error:'こばんが足りません。探索で集めよう。'};if(s.foods[id]>=99)return{ok:false,error:'そのおやつは、もういっぱいです。'};s.coins-=12;s.foods[id]++;return{ok:true};}
 function setTeam(s,index,id){if(!Number.isInteger(index)||index<0||index>2||!s.roster.some(p=>p.id===id))return false;const existing=s.team.indexOf(id);if(existing===index)return true;if(existing>=0){const before=s.team[index];s.team[index]=id;if(before)s.team[existing]=before;else s.team.splice(existing,1);}else s.team[index]=id;s.team=s.team.filter(Boolean).slice(0,3);return true;}
 return{ELEMENTS,FOODS,SPECIES,MONSTERS,BOSS,AREAS,STARTERS,affinity,stats,newGame,load,unlock,encounter,createBattle,act,finishBattle,buyFood,setTeam,foodGain,damage,needed};
});
