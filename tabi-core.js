/* Deterministic simulation for ちいさな魔女の旅じたく. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Tabi=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const HEROES={lili:{name:'リリ',role:'魔法・後衛',art:0},noa:{name:'ノア',role:'剣士・前衛',art:1},mina:{name:'ミナ',role:'回復・後衛',art:2},koharu:{name:'コハル',role:'弓職人・後衛',art:8}};
const UPGRADES={fire:{name:'火の玉',base:24,growth:1.35,max:20},staff:{name:'木の杖',base:36,growth:1.36,max:20},noa:{name:'ノア',base:28,growth:1.34,max:20},mina:{name:'ミナ',base:32,growth:1.34,max:20},koharu:{name:'コハル',base:32,growth:1.34,max:20}};
const SKILLS={double:{name:'ふたつの火',cost:6,description:'火の玉が2つに。合計威力が50%アップ。'},ward:{name:'まもりの盾',cost:4,description:'ノアが3回攻撃するたび、全員にバリア。'},bloom:{name:'花の祈り',cost:4,description:'ミナの3回目の回復が、仲間全員に届く。'}};
const PLACES=['森の入り口','花咲く小道','こもれびの丘','きのこの広場','小川のほとり','祈りの石橋','風のぬけ道','大樹の根もと','迷いの林','朝露の泉','守り人の道','森の主の庭','麦穂の門','風車へ続く道','もぐらの畑','黄金色の丘','夕風の農道','眠れる風車','潮風の坂','貝がらの浜','波音の桟橋','灯りの岬','月あかりの磯','大潮の洞門','雪の登り口','白樺の小径','霜の石段','星屑の尾根','天文台への道','星見の山頂'];
const TOTAL_STAGES=30;
const REGIONS=[{id:'forest',name:'朝つゆの森',start:1,end:12,bg:'forest',need:0,description:'仲間と出会う、はじまりの森。'}, {id:'fields',name:'こむぎの丘',start:13,end:18,bg:'fields',need:12,description:'風の速い敵に注意。盾と回復で支えよう。'}, {id:'coast',name:'灯りの海岸',start:19,end:24,bg:'coast',need:18,description:'貝のよろいをまとった敵。火の玉と装備を育てよう。'}, {id:'snow',name:'星見の雪山',start:25,end:30,bg:'snow',need:24,description:'大技で足が凍ることも。薬草茶で冷えを払おう。'}];
const TOWNS={wheat:{name:'こむぎの町',need:12,bg:'village',text:'焼きたてのパンと、ミナの帰りを待つ町。',next:'fields'},mill:{name:'水車の町',need:18,bg:'village',text:'水音と織物の町。止まった水車をみんなで直そう。',next:'coast'},port:{name:'灯台の港町',need:24,bg:'coast',text:'船を見送る、小さな港。雪山への道を支度しよう。',next:'snow'}};
const GOODS={tea:{name:'薬草茶',price:35,reward:{tea:1}},pie:{name:'木の実パイ',price:50,reward:{pie:1}},charm:{name:'お守りスープ',price:55,reward:{charm:1}},herb:{name:'薬草の包み',price:24,reward:{herb:3}},berry:{name:'木の実のかご',price:25,reward:{berry:4}},ore:{name:'鉱石の袋',price:40,reward:{ore:2}}};
const TOWN_REQUESTS=[{id:'medicine',town:'wheat',name:'薬屋さんの空っぽの棚',person:'薬屋のサナ',text:'帰ってきたよ。待っていた人へ、温かい薬草茶を届けよう。',cost:{tea:2},reward:{coins:200,crystals:2}}, {id:'bakery',town:'wheat',name:'明日のパンの仕込み',person:'パン屋のマル',text:'パン屋さんへ、森の香りをおすそ分け。',cost:{berry:8,herb:4},reward:{coins:220,wood:8}}, {id:'waterwheel',town:'mill',name:'止まった水車を直そう',person:'水車番のトト',text:'歯が欠けた水車に、新しい木と留め具を。',cost:{wood:6,ore:6},reward:{coins:320,crystals:3}}, {id:'millmeal',town:'mill',name:'織り子たちのおやつ',person:'織り子のイナ',text:'夜まで働くみんなに、甘いパイを差し入れ。',cost:{pie:3},reward:{coins:500,wood:10}}, {id:'lighthouse',town:'port',name:'灯台の灯りをもう一度',person:'灯台守のルカ',text:'曇った灯りの部品を取り替えて、帰る船の目印に。',cost:{ore:10,herb:8},reward:{coins:500,crystals:4}}, {id:'sailors',town:'port',name:'雪山へ向かう人へ',person:'港の料理人ノエ',text:'冷たい山道を行く人のために、温まる料理を。',cost:{charm:3,tea:3},reward:{coins:900,crystals:4}}];
function region(s){return REGIONS.find(d=>s.stage>=d.start&&s.stage<=d.end)||REGIONS[0];}
function scenery(s){return s.location==='town'?TOWNS[s.townId].bg:region(s).bg;}
const ENCOUNTERS=7;
function encounters(s){return region(s).id==='fields'?4:ENCOUNTERS;}
const CHARM_MILESTONES=[3,6,9,12,18,24];
const CHARMS={
 acorn:{name:'どんぐりの留め具',hero:'noa',icon:'equipment',tag:'守り',text:'ノアの3回目の攻撃で、全員に最大HP8%のバリア。',hint:'バリアが割れた時の反撃につながる。'},
 ember:{name:'星くずの鈴',hero:'lili',icon:'crystals',tag:'魔法',text:'リリの3回目の攻撃に小さな流星。敵全体に攻撃力35%の追加ダメージ。',hint:'敵が2体の道で活躍。'},
 clover:{name:'旅人のクローバー',hero:'lili',icon:'herb',tag:'立て直し',text:'各戦闘で一度、仲間のHPが25%未満になると、その子のHPを20%回復。',hint:'大技を受けた仲間を助ける。'},
 dew:{name:'しずくの小瓶',hero:'mina',icon:'tea',tag:'回復 → 守り',text:'ミナの余った回復量の50%をバリアに。上限は最大HPの25%。',hint:'元気な時も祈り、バリアを蓄える。'},
 thorn:{name:'こもれびの火種',hero:'lili',icon:'magic',tag:'守り → 反撃',text:'仲間のバリアが割れると、リリが攻撃力60%で反撃。1秒に1回まで。',hint:'しずくの小瓶・どんぐりの留め具と好相性。'},
 ribbon:{name:'朝風のリボン',hero:'lili',icon:'rally',tag:'速攻',text:'各戦闘のはじめの6秒間、全員の行動速度が20%アップ。',hint:'3回ごとの攻撃やバリアも早く発動。'},
 bread:{name:'はちみつの包み',hero:'mina',icon:'pie',tag:'回復の輪',text:'ミナの3回目の祈りで、全員に回復力40%のおすそわけ。',hint:'しずくの小瓶で、余りもバリアに。'},
 lantern:{name:'小さな灯り',hero:'lili',icon:'star',tag:'連携',text:'「おねがい！」を使うと、敵全体にリリの攻撃力80%の追い火。',hint:'連携のバリアは火種の反撃にもつながる。'},
 feather:{name:'つばめの羽根',hero:'koharu',icon:'book',tag:'貫通',text:'コハルの3本目の矢が貫通。ほかの敵にもその矢の威力70%で命中。',hint:'朝風のリボンで3本目を早く放てる。'}
};
function hasCharm(s,id){return s.charms?.selected?.includes(id)||false;}
function charmCount(s){return Math.max(0,CHARM_MILESTONES.filter(n=>s.highest>=n).length-(s.charms?.selected?.length||0));}
function charmEligible(s,id){return Object.hasOwn(CHARMS,id)&&(CHARMS[id].hero==='lili'||s.unlocked[CHARMS[id].hero]);}
function charmOffer(s){
 if(!s.charms)s.charms={selected:[],offers:[]};if(!charmCount(s)){s.charms.offers=[];return [];}
 if(s.charms.offers.length===3&&s.charms.offers.every(id=>charmEligible(s,id)&&!hasCharm(s,id)))return s.charms.offers;
 const preferred={};for(const[a,b]of [['acorn','thorn'],['dew','thorn'],['thorn','dew'],['dew','bread'],['bread','dew'],['ember','lantern'],['ribbon','feather']])if(hasCharm(s,a))preferred[b]=1;
 const ids=Object.keys(CHARMS),offset=s.charms.selected.length*3%ids.length;
 s.charms.offers=ids.filter(id=>charmEligible(s,id)&&!hasCharm(s,id)).sort((a,b)=>(preferred[b]||0)-(preferred[a]||0)||((ids.indexOf(a)-offset+ids.length)%ids.length)-((ids.indexOf(b)-offset+ids.length)%ids.length)).slice(0,3);return s.charms.offers;
}
function chooseCharm(s,r,id){if(!charmCount(s)||!charmOffer(s).includes(id))return{ok:false,error:'いま選べる3つのおまもりから選んでください。'};s.charms.selected.push(id);s.charms.offers=[];charmOffer(s);emit(r,'charm_pick',CHARMS[id].name+'を旅のおともに。',{charm:id});return{ok:true};}
const SPOTS={meadow:{name:'花の草原',need:0,text:'薬草2・木の実1',items:{herb:2,berry:1}},grove:{name:'木の実の林',need:3,text:'木の実3・木材1',items:{berry:3,wood:1}},cave:{name:'こだまの洞窟',need:6,text:'鉱石2・薬草1',items:{ore:2,herb:1}}};
const ITEMS={star:'星の歯車',herb:'薬草',berry:'木の実',ore:'鉱石',tea:'薬草茶',pie:'木の実パイ',charm:'お守りスープ'};
const RECIPES={tea:{name:'薬草茶',cost:{herb:3},text:'生きている仲間全員のHPを45%回復'},pie:{name:'木の実パイ',cost:{berry:4,herb:1},text:'45秒間、全員の攻撃と回復が25%アップ'},charm:{name:'お守りスープ',cost:{berry:2,ore:1},text:'全員に最大HPの40%のバリア'}};
const GEAR={lili:{name:'月葉のブローチ',cost:{herb:4,ore:2},text:'1段階ごとに 魔力＋3・HP＋8'},noa:{name:'こだまの剣飾り',cost:{ore:4,berry:2},text:'1段階ごとに 攻撃＋4・HP＋12'},mina:{name:'花糸のリボン',cost:{herb:5,berry:3},text:'1段階ごとに 回復＋4・HP＋10'}};
const WEAPON_THEMES={forest:{name:'森',need:0,cost:{},hp:0,atk:0,heal:0,text:'いつもの装備。仕立て強化をそのまま引き継ぐ。'},moon:{name:'月',need:12,cost:{coins:60,ore:6,crystals:2},hp:-8,atk:6,heal:3,text:'攻撃＋6・回復＋3・HP−8'},sea:{name:'海',need:18,cost:{coins:120,herb:8,ore:8,crystals:3},hp:8,atk:3,heal:6,text:'HP＋8・攻撃＋3・回復＋6'},snow:{name:'雪',need:24,cost:{coins:180,wood:6,ore:12,crystals:4},hp:30,atk:2,heal:2,text:'HP＋30・攻撃＋2・回復＋2'}};
const weaponNames={lili:['森の芽吹き','月の導き','珊瑚のささやき','雪明かりの杖'],noa:['花の騎士剣','月影の剣','潮風の剣','白雪の剣'],mina:['森の祈り','月の祈り','海の祈り','雪の祈り']};
const WEAPONS=Object.fromEntries(Object.entries(weaponNames).flatMap(([hero,names])=>Object.keys(WEAPON_THEMES).map((theme,i)=>[hero+'-'+theme,{id:hero+'-'+theme,hero,theme,...WEAPON_THEMES[theme],name:names[i],text:theme==='forest'?WEAPON_THEMES[theme].text:('HP'+(WEAPON_THEMES[theme].hp>=0?'＋':'−')+Math.abs(WEAPON_THEMES[theme].hp)+'・攻撃＋'+WEAPON_THEMES[theme].atk+(hero==='mina'?'・回復＋'+WEAPON_THEMES[theme].heal:''))}])));
function newArmory(){return{owned:['lili-forest','noa-forest','mina-forest'],equipped:{lili:'forest',noa:'forest',mina:'forest'}};}
const TACTICS={balanced:{name:'いつもの旅',text:'攻撃・守りをバランスよく'},rush:{name:'いっきに攻める',text:'全員の攻撃＋20%・最大HP－15%'},safe:{name:'じっくり守る',text:'全員の最大HP＋25%・攻撃－10%'}};
const MISSIONS=[{id:'firstGather',name:'森のおすそわけ',key:'gathers',goal:1,reward:{coins:35,herb:3}}, {id:'firstCook',name:'はじめてのお料理',key:'cooks',goal:1,reward:{coins:45,berry:4}}, {id:'tenWins',name:'小さな一行の腕だめし',key:'wins',goal:10,reward:{coins:70,ore:2}}, {id:'firstGear',name:'おそろいの旅支度',key:'gears',goal:1,reward:{crystals:2,herb:4}}, {id:'threeMeals',name:'おいしい作戦',key:'meals',goal:3,reward:{coins:100,ore:4}}, {id:'gatherer',name:'森を知るひと',key:'gathers',goal:12,reward:{crystals:3,berry:8}}, {id:'threeFriends',name:'三人の帰り道',key:'highest',goal:6,reward:{coins:160,ore:4}}, {id:'allGear',name:'一行の仕立て屋さん',key:'gears',goal:6,reward:{crystals:4,coins:220}}];
function supplies(){return{star:0,herb:0,berry:0,ore:0,tea:1,pie:0,charm:0};}
function progressValue(s,key){return Object.hasOwn(s.counts,key)?s.counts[key]:s[key]||0;}
function canPay(s,cost){return Object.entries(cost).every(([k,n])=>(Object.hasOwn(s.bag,k)?s.bag[k]:s[k])>=n);}
function pay(s,cost){for(const[k,n]of Object.entries(cost)){if(Object.hasOwn(s.bag,k))s.bag[k]-=n;else s[k]-=n;}}
function grant(s,reward){for(const[k,n]of Object.entries(reward)){if(Object.hasOwn(s.bag,k))s.bag[k]+=n;else s[k]+=n;}}

SPOTS.fields={name:'町はずれの麦畑',need:12,text:'木の実4・薬草2',items:{berry:4,herb:2}};SPOTS.beach={name:'潮だまりの浜',need:18,text:'鉱石3・木材1',items:{ore:3,wood:1}};SPOTS.ridge={name:'雪どけの尾根',need:24,text:'鉱石4・薬草2',items:{ore:4,herb:2}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const integer=(v,a,b,f=a)=>Number.isFinite(Number(v))?clamp(Math.floor(Number(v)),a,b):f;
function newGame(now=Date.now()){return{charms:{selected:[],offers:[]},armory:newArmory(),location:'road',townId:'wheat',resume:null,town:{visited:[],claimed:[],reputation:0,rests:0,workshop:false},story:{active:null,pending:[],choices:{},read:[],bond:{lili:0,noa:0,mina:0,koharu:0}},bag:supplies(),gear:{lili:0,noa:0,mina:0},tactic:'balanced',gatherJob:null,foodTime:0,counts:{gathers:0,cooks:0,gears:0,meals:0,deliveries:0},claimed:[],bestiary:{slime:0,mushroom:0,golem:0,straw:0,mole:0,crab:0,owl:0},version:1,coins:40,wood:0,crystals:0,upgrades:{fire:1,staff:1,noa:1,mina:1,koharu:1},skills:{double:false,ward:false,bloom:false},highest:0,stage:1,encounter:0,unlocked:{noa:false,mina:false,koharu:false},wagon:0,completed:false,crafted:false,exploring:false,cycles:0,wins:0,defeats:0,rally:100,playtime:0,savedAt:now};}
function load(raw,now=Date.now()){
 if(!raw||raw.version!==1||!raw.upgrades)return null;const s=newGame(now);
 for(const k of ['coins','wood','crystals','wins','defeats'])s[k]=integer(raw[k],0,9999999);
 for(const k of Object.keys(UPGRADES))s.upgrades[k]=integer(raw.upgrades[k],1,20);
 for(const k of Object.keys(SKILLS))s.skills[k]=raw.skills?.[k]===true;
 s.highest=integer(raw.highest,0,TOTAL_STAGES);s.stage=integer(raw.stage,1,TOTAL_STAGES);s.encounter=integer(raw.encounter,0,ENCOUNTERS-1);s.cycles=integer(raw.cycles,0,999);
 s.unlocked.noa=s.highest>=3;s.unlocked.mina=s.highest>=6;s.wagon=raw.wagon===1&&s.highest>=12?1:0;s.completed=!!s.wagon;s.crafted=!!raw.crafted&&!!s.wagon;s.exploring=!!raw.exploring&&s.completed;
 if(!s.wagon){s.highest=Math.min(12,s.highest);s.stage=Math.min(12,s.stage);}
 s.encounter=Math.min(s.encounter,encounters(s)-1);
 s.town.visited=Object.keys(TOWNS).filter(id=>s.wagon&&s.highest>=TOWNS[id].need&&Array.isArray(raw.town?.visited)&&raw.town.visited.includes(id));
 s.town.claimed=TOWN_REQUESTS.filter(d=>s.town.visited.includes(d.town)&&Array.isArray(raw.town?.claimed)&&raw.town.claimed.includes(d.id)).map(d=>d.id);s.town.reputation=s.town.claimed.length;
 s.unlocked.koharu=raw.unlocked?.koharu===true&&s.wagon===1&&s.town.visited.includes('wheat');
 s.armory.owned=[...new Set([...s.armory.owned,...(Array.isArray(raw.armory?.owned)?raw.armory.owned.filter(id=>Object.hasOwn(WEAPONS,id)&&s.highest>=WEAPONS[id].need&&(WEAPONS[id].theme==='forest'||s.wagon)):[])])];for(const hero of ['lili','noa','mina']){const theme=raw.armory?.equipped?.[hero];if(Object.hasOwn(WEAPON_THEMES,theme)&&s.armory.owned.includes(hero+'-'+theme))s.armory.equipped[hero]=theme;}
 s.town.rests=integer(raw.town?.rests,0,99999);s.town.workshop=!!raw.town?.workshop&&s.highest>=30&&!!s.wagon;
 s.townId=Object.hasOwn(TOWNS,raw.townId)&&s.wagon&&s.highest>=TOWNS[raw.townId].need?raw.townId:'wheat';s.location=raw.location==='town'&&s.wagon?'town':'road';if(s.location==='town'&&!s.town.visited.includes(s.townId))s.town.visited.push(s.townId);
 if(raw.resume&&s.wagon&&raw.resume.stage>=1&&raw.resume.stage<=Math.min(TOTAL_STAGES,s.highest+1))s.resume={stage:integer(raw.resume.stage,1,TOTAL_STAGES),encounter:integer(raw.resume.encounter,0,encounters(raw.resume)-1)};

 if(!s.unlocked.noa)s.skills.ward=false;if(!s.unlocked.mina)s.skills.bloom=false;
 for(const k of Object.keys(s.bag))s.bag[k]=integer(raw.bag?.[k],0,99999,k==='tea'&&!raw.bag?1:0);
 for(const k of Object.keys(s.gear))s.gear[k]=integer(raw.gear?.[k],0,s.town.workshop?5:3);
 for(const k of Object.keys(s.counts))s.counts[k]=integer(raw.counts?.[k],0,999999);
 for(const k of Object.keys(s.bestiary))s.bestiary[k]=integer(raw.bestiary?.[k],0,999999);
 s.tactic=Object.hasOwn(TACTICS,raw.tactic)?raw.tactic:'balanced';s.claimed=MISSIONS.filter(m=>Array.isArray(raw.claimed)&&raw.claimed.includes(m.id)).map(m=>m.id);
 s.foodTime=integer(raw.foodTime,0,45);
 for(const k of ['lost','market','bridge','lantern','gate']){const v=raw.story?.choices?.[k];if(v===0||v===1)s.story.choices[k]=v;}
 for(const k of Object.keys(HEROES))s.story.bond[k]=integer(raw.story?.bond?.[k],0,6);
 s.story.read=Array.isArray(raw.story?.read)?[...new Set(raw.story.read.filter(v=>typeof v==='string'&&/^(chapter-(?:[0-9]|1[01])|bond-(lili|noa|mina|koharu)-[123])$/.test(v)))]:[];
 const active=raw.story?.active;if(active&&['scene','event','result'].includes(active.kind)&&typeof active.id==='string'&&/^(chapter-(?:[0-9]|1[01])|bond-(lili|noa|mina|koharu)-[123]|lost|market|bridge|lantern|gate)$/.test(active.id))s.story.active={kind:active.kind,id:active.id,index:integer(active.index,0,20)};
 s.story.pending=Array.isArray(raw.story?.pending)?raw.story.pending.filter(q=>q&&['scene','event'].includes(q.kind)&&typeof q.id==='string'&&/^(chapter-(?:[0-9]|1[01])|lost|market|bridge|lantern|gate)$/.test(q.id)).slice(0,12).map(q=>({kind:q.kind,id:q.id,index:0})):[];
 if(raw.gatherJob&&Object.hasOwn(SPOTS,raw.gatherJob.spot)&&s.highest>=SPOTS[raw.gatherJob.spot].need)s.gatherJob={spot:raw.gatherJob.spot,left:integer(raw.gatherJob.left,1,8,8)};
 s.charms.selected=[...new Set(Array.isArray(raw.charms?.selected)?raw.charms.selected.filter(id=>charmEligible(s,id)):[])].slice(0,CHARM_MILESTONES.filter(n=>s.highest>=n).length);
 s.charms.offers=[...new Set(Array.isArray(raw.charms?.offers)?raw.charms.offers.filter(id=>charmEligible(s,id)&&!hasCharm(s,id)):[])].slice(0,3);charmOffer(s);
 s.rally=integer(raw.rally,0,100);s.playtime=integer(raw.playtime,0,315360000);s.savedAt=integer(raw.savedAt,0,now,now);return s;
}
function cost(s,key){const d=UPGRADES[key];return !d||s.upgrades[key]>=d.max?Infinity:Math.floor(d.base*d.growth**(s.upgrades[key]-1));}
function stats(s,id){
 const u=s.upgrades;let st;
 if(id==='lili')st={maxHp:85+(u.staff-1)*13+(s.crafted?20:0),atk:9+(u.fire-1)*4+(u.staff-1)*2+(s.crafted?6:0),heal:0,interval:1.7};
 else if(id==='noa')st={maxHp:140+(u.noa-1)*28,atk:12+(u.noa-1)*4,heal:0,interval:1.5};
 else if(id==='koharu')st={maxHp:95+(u.koharu-1)*16,atk:11+(u.koharu-1)*3,heal:0,interval:1.9};
 else st={maxHp:85+(u.mina-1)*16,atk:7+(u.mina-1)*2,heal:18+(u.mina-1)*5,interval:2.25};
 const lv=s.gear[id]||0;st.maxHp+=lv*(id==='lili'?8:id==='noa'?12:10);st.atk+=lv*(id==='noa'?4:id==='lili'?3:0);st.heal+=lv*(id==='mina'?4:0);
 if(id!=='koharu'){const w=WEAPON_THEMES[s.armory.equipped[id]];st.maxHp+=w.hp;st.atk+=w.atk;st.heal+=w.heal;}
 if(s.story.bond[id]>=6){if(id==='lili'||id==='koharu')st.atk+=4;else if(id==='noa')st.maxHp+=25;else st.heal+=6;}
 if(s.town.workshop){st.maxHp+=25;st.atk*=1.15;st.heal*=1.15;}
 const tactic=s.tactic;st.maxHp=Math.round(st.maxHp*(tactic==='rush'?.85:tactic==='safe'?1.25:1));st.atk*=tactic==='rush'?1.2:tactic==='safe'?.9:1;return st;
}
function ids(s){return['lili',...(s.unlocked.noa?['noa']:[]),...(s.unlocked.mina?['mina']:[]),...(s.unlocked.koharu?['koharu']:[])];}
function freshHero(s,id){return{id,...stats(s,id),hp:stats(s,id).maxHp,shield:0,cooldown:id==='lili'?.5:id==='noa'?.8:1.2,actions:0,heals:0,pose:0};}
function emit(r,type,text,data={}){r.events.push({type,text,...data});r.log.push(text);if(r.log.length>24)r.log.shift();}
function sync(s,r){for(const id of ids(s)){let h=r.heroes.find(h=>h.id===id);if(!h){h=freshHero(s,id);r.heroes.push(h);}else{const st=stats(s,id),delta=st.maxHp-h.maxHp;h.hp=Math.min(st.maxHp,h.hp+delta);Object.assign(h,st);}}}
function enemies(s){
 if(s.stage>12)return frontierEnemies(s);
 const stage=s.stage,round=s.encounter,boss=stage===12&&round===ENCOUNTERS-1,mini=[4,8].includes(stage)&&round===ENCOUNTERS-1,multi=stage>=7&&!boss&&!mini;
 const power=1+s.cycles*.18,baseHp=38*1.18**(stage-1)*power,atk=(6+stage*1.5)*power;
 if(boss)return[{id:'golem',name:'こけむす守り人',art:5,hp:Math.round(baseHp*3.4),maxHp:Math.round(baseHp*3.4),atk:atk*1.35,cooldown:2.6,interval:2.4,actions:0,boss:true}];
 return Array.from({length:multi?2:1},(_,i)=>{const mush=(stage+round+i)%3===0,hp=Math.round(baseHp*(mini?1.8:multi?.72:1));return{id:mush||mini?'mushroom':'slime',name:mini?'きのこのおやぶん':mush?'もりきのこ':'しずくスライム',art:mush||mini?4:3,hp,maxHp:hp,atk:atk*(multi?.67:mini?1.2:1),cooldown:1.5+i*.65,interval:2.2,actions:0,boss:mini};});
}
function frontierEnemies(s){const stage=s.stage,round=s.encounter,reg=region(s),boss=stage===reg.end&&round===encounters(s)-1,power=1+s.cycles*.18,base=38*1.18**11*1.08**(stage-12)*power,atk=(24+(stage-12)*1.25)*power;let types=reg.id==='fields'?['mole','straw']:reg.id==='coast'?['slime','crab']:['owl','golem'];
 const names={mole:'麦わらもぐら',straw:'風のかかし',crab:'潮のヤドカリ',owl:'雪ふくろう',slime:'潮だまりスライム',golem:'雪道の石守り'};
 return Array.from({length:boss?1:2},(_,i)=>{const id=boss?reg.id==='fields'?'straw':reg.id==='coast'?'crab':'owl':types[(round+i)%2],hp=Math.round(base*(boss?3:.68));return{id,name:boss?reg.id==='fields'?'ねぼすけの風守り':reg.id==='coast'?'大潮のヤドカリ':'星見のふくろう':names[id],hp,maxHp:hp,shield:reg.id==='coast'?Math.round(hp*.16):0,atk:atk*(boss?1.25:.65),cooldown:1.8+i*.6,interval:boss?2.5:reg.id==='fields'?1.7:2.3,actions:0,boss,region:reg.id};});}
function spawn(s,r){s.encounter=integer(s.encounter,0,encounters(s)-1);sync(s,r);r.enemies=enemies(s);r.mode='fight';r.timer=0;r.heroBuff=0;r.chill=0;r.charmBattle={time:0,counter:0,cloverUsed:false};r.label='';emit(r,'encounter',s.stage===12&&s.encounter===ENCOUNTERS-1?'森の主が、道をふさいでいる。':PLACES[s.stage-1]+'を進んでいる。');}
function createRun(s){const r={state:s,heroes:ids(s).map(id=>freshHero(s,id)),enemies:[],mode:'fight',timer:0,events:[],log:[],heroBuff:0,time:0,label:'',bossSeen:false};spawn(s,r);if(s.location==='town'){r.enemies=[];r.mode='town';r.label=TOWNS[s.townId].name+'で旅じたく。';}else if(s.highest>=12&&!s.wagon){r.mode='camp';r.label='木材を使って、はじめての改築を。';}else if(s.completed&&!s.exploring){r.mode='complete';r.label='旅のつづきは、ここから。';}return r;}
function upgrade(s,r,key){if(!Object.hasOwn(UPGRADES,key))return{ok:false,error:'強化を選んでください。'};if(['noa','mina','koharu'].includes(key)&&!s.unlocked[key])return{ok:false,error:'道中で仲間になるのを待とう。'};const c=cost(s,key);if(!Number.isFinite(c))return{ok:false,error:'最大レベルです。'};if(s.coins<c)return{ok:false,error:'コインが足りません。戦闘で集めよう。'};s.coins-=c;s.upgrades[key]++;sync(s,r);emit(r,'upgrade',UPGRADES[key].name+'が Lv.'+s.upgrades[key]+' に！',{hero:['noa','mina','koharu'].includes(key)?key:'lili'});return{ok:true};}
function learn(s,r,key){const d=SKILLS[key];if(!d||s.skills[key])return{ok:false,error:'すでに覚えています。'};if((key==='ward'&&!s.unlocked.noa)||(key==='bloom'&&!s.unlocked.mina))return{ok:false,error:'先に仲間と出会おう。'};if(s.crystals<d.cost)return{ok:false,error:'魔石が足りません。新しい道を進もう。'};s.crystals-=d.cost;s.skills[key]=true;emit(r,'upgrade',d.name+'を覚えた！',{hero:key==='ward'?'noa':key==='bloom'?'mina':'lili'});return{ok:true};}
function charmEvent(r,id,hero,targets=[]){emit(r,'charm',CHARMS[id].name+'が光った。',{charm:id,hero,targets});}
function hurt(r,unit,amount,side){
 const shieldBefore=unit.shield||0,absorbed=Math.min(shieldBefore,amount);if(absorbed)unit.shield-=absorbed;const n=Math.min(unit.hp,Math.max(0,amount-absorbed));unit.hp-=n;
 if(side==='enemy'&&n>0&&unit.hp<=0){r.state.bestiary[unit.id]++;if(r.state.bestiary[unit.id]===1)emit(r,'discover','魔物手帳に「'+unit.name+'」を書きとめた。');}
 emit(r,'damage',unit.id==='golem'?'守り人に '+Math.round(n):side==='hero'?HEROES[unit.id].name+' に '+Math.round(n)+'ダメージ':unit.name+' に '+Math.round(n)+'ダメージ',{side,id:unit.id,index:side==='enemy'?r.enemies.indexOf(unit):r.heroes.indexOf(unit),amount:Math.round(n)});
 if(side!=='hero')return;
 const s=r.state;
 if(hasCharm(s,'clover')&&!r.charmBattle.cloverUsed&&unit.hp>0&&unit.hp<unit.maxHp*.25){r.charmBattle.cloverUsed=true;heal(r,unit,unit.maxHp*.2);charmEvent(r,'clover',unit.id);}
 if(shieldBefore>0&&unit.shield<=0&&hasCharm(s,'thorn')&&r.charmBattle.counter<=0){const lili=r.heroes.find(h=>h.id==='lili'&&h.hp>0),enemy=r.enemies.find(e=>e.hp>0);if(lili&&enemy){r.charmBattle.counter=1;hurt(r,enemy,lili.atk*.6,'enemy');charmEvent(r,'thorn','lili',[r.enemies.indexOf(enemy)]);}}
}
function heal(r,h,n,source){
 if(h.hp<=0||n<=0)return;const actual=Math.min(h.maxHp-h.hp,n);if(actual>0){h.hp+=actual;emit(r,'heal',HEROES[h.id].name+'のHPが '+Math.round(actual)+' 回復。',{id:h.id,amount:Math.round(actual)});}
 const excess=n-actual;if(source==='mina'&&hasCharm(r.state,'dew')&&excess>0&&h.shield<h.maxHp*.25){const old=h.shield;h.shield=Math.min(h.maxHp*.25,h.shield+excess*.5);if(h.shield>old)charmEvent(r,'dew',h.id);}
}
function rally(s,r){if(s.rally<100||r.mode!=='fight')return{ok:false,error:'星の力がたまるまで待とう。'};s.rally=0;r.heroBuff=7;for(const h of r.heroes.filter(h=>h.hp>0)){heal(r,h,h.maxHp*.16);h.shield=Math.max(h.shield,h.maxHp*.22);h.cooldown=Math.min(h.cooldown,.2);}emit(r,'rally','連携技「木漏れ日の約束」！ 7秒間、攻撃1.6倍・バリアと回復。',{heroes:r.heroes.filter(h=>h.hp>0).map(h=>h.id)});
 if(hasCharm(s,'lantern')){const lili=r.heroes.find(h=>h.id==='lili'&&h.hp>0),targets=[];if(lili){r.enemies.forEach((e,i)=>{if(e.hp>0){targets.push(i);hurt(r,e,lili.atk*.8,'enemy');}});charmEvent(r,'lantern','lili',targets);}}return{ok:true};}
function clear(s,r){
 const count=encounters(s),last=s.encounter===count-1,final=s.stage===12&&last;
 const boss=r.enemies.find(e=>e.boss);if(last&&boss)emit(r,'boss_victory',boss.name+'をこえた！',{name:boss.name,enemy:boss.id,stage:s.stage,first:s.highest<s.stage});
 // Keep each road's total coin reward when compressing its encounters.
 s.wins++;const baseCoins=5+Math.floor(s.stage*1.6),coins=Math.floor((s.encounter+1)*baseCoins*ENCOUNTERS/count)-Math.floor(s.encounter*baseCoins*ENCOUNTERS/count)+(last?8+s.stage*2:0);s.coins+=coins;s.rally=Math.min(100,s.rally+7);
 emit(r,'reward','コイン ＋'+coins,{coins});
 for(const h of r.heroes){if(h.hp<=0)h.hp=h.maxHp*.3;else heal(r,h,h.maxHp*(s.wagon?.2:.12));}
 if(last){const first=s.highest<s.stage;s.highest=Math.max(s.highest,s.stage);
  if(first){const wood=final?16:s.stage>12?(s.stage%6===0?8:3):s.stage===1?0:2;s.wood+=wood;s.crystals+=final?4:1;emit(r,'material','木材 ＋'+wood+'・魔石 ＋'+(final?4:1),{wood,crystals:final?4:1});}
  if(s.highest>=3&&!s.unlocked.noa){s.unlocked.noa=true;sync(s,r);emit(r,'join','剣士ノアが仲間になった。前に立って、一行を守ってくれる。',{hero:'noa'});}
  if(s.highest>=6&&!s.unlocked.mina){s.unlocked.mina=true;sync(s,r);emit(r,'join','癒やし手ミナが仲間になった。傷ついた仲間を回復してくれる。',{hero:'mina'});}
  if(first&&CHARM_MILESTONES.includes(s.stage)){charmOffer(s);emit(r,'charm_ready','旅のおまもりが見つかった。3つから1つ選ぼう。');}
  if(s.stage>12&&s.stage===region(s).end){
   if(first){s.bag.ore+=s.stage===30?12:5;if(s.stage===30){s.bag.star++;s.crystals+=5;s.wood+=12;}}
   s.resume=null;s.location='town';s.townId=s.stage===18?'mill':'port';if(!s.town.visited.includes(s.townId))s.town.visited.push(s.townId);s.exploring=false;r.mode='town';r.enemies=[];r.heroBuff=0;r.chill=0;r.timer=0;r.label=TOWNS[s.townId].name+'に着いた！';emit(r,'arrival',r.label,{town:s.townId});return;
  }
  if(final){s.exploring=false;r.mode=s.wagon?'complete':'camp';r.timer=0;r.label=s.wagon?'森をもう一度、歩ききった。':'森に、帰り道が戻った。荷馬車を改築しよう。';s.wood=Math.max(30,s.wood);emit(r,s.wagon?'expedition':'bossclear','森の主を倒した！ 手押し車を、屋根付き馬車に改築できる。');return;}
  r.nextStage=s.stage+1;r.nextEncounter=0;
 }else{r.nextStage=s.stage;r.nextEncounter=s.encounter+1;}
 r.mode='travel';r.timer=1.7;r.label='素材をしまって、次の道へ。';
}
function step(s,r,seconds){
 const dt=clamp(Number(seconds)||0,0,.25);r.events=[];if(dt<=0)return r.events;r.time+=dt;s.playtime+=dt;s.rally=Math.min(100,s.rally+dt*1.25);r.heroBuff=Math.max(0,r.heroBuff-dt);r.chill=Math.max(0,(r.chill||0)-dt);s.foodTime=Math.max(0,s.foodTime-dt);
 if(s.gatherJob){s.gatherJob.left-=dt;if(s.gatherJob.left<=0){const spot=SPOTS[s.gatherJob.spot];grant(s,spot.items);s.counts.gathers++;const bonus=s.counts.gathers%4===0;if(bonus)s.crystals++;s.gatherJob=null;emit(r,'gather',spot.name+'の採集完了！ '+spot.text+(bonus?'・魔石1も見つけた！':''));}}
 if(r.mode==='complete'||r.mode==='camp'||r.mode==='town')return r.events;
 if(r.mode==='travel'||r.mode==='rest'){r.timer-=dt;if(r.timer<=0){s.stage=r.nextStage;s.encounter=r.nextEncounter;if(r.mode==='rest'){r.heroes=ids(s).map(id=>freshHero(s,id));}spawn(s,r);}return r.events;}
 r.charmBattle.time+=dt;r.charmBattle.counter=Math.max(0,r.charmBattle.counter-dt);
 const quick=hasCharm(s,'ribbon')&&r.charmBattle.time<=6?1.2:1;
 for(const h of r.heroes){h.pose=Math.max(0,h.pose-dt);if(h.hp<=0)continue;h.cooldown-=dt*(r.heroBuff>0?1.25:1)*(r.chill>0?.65:1)*quick;if(h.cooldown>0)continue;h.cooldown+=h.interval;h.actions++;h.pose=.36;
  const live=r.heroes.filter(a=>a.hp>0),weak=live.filter(a=>a.hp<a.maxHp*.92).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]||(h.id==='mina'&&hasCharm(s,'dew')?[...live].sort((a,b)=>a.shield/a.maxHp-b.shield/b.maxHp)[0]:null);
  if(h.id==='mina'&&weak){h.heals=(h.heals||0)+1;const power=s.foodTime>0?1.25:1;if(s.skills.bloom&&h.heals%3===0)for(const a of r.heroes)heal(r,a,h.heal*.75*power,'mina');else heal(r,weak,h.heal*power,'mina');emit(r,'cast','ミナの、花の祈り。',{hero:'mina'});
   if(hasCharm(s,'bread')&&h.heals%3===0){for(const a of r.heroes)heal(r,a,h.heal*.4*power,'mina');charmEvent(r,'bread','mina');}
  }else{
   const enemy=h.id==='koharu'?r.enemies.filter(e=>e.hp>0).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]:r.enemies.find(e=>e.hp>0);if(!enemy)break;const n=h.atk*(h.id==='koharu'&&h.actions%3===0?1.4:1)*(r.heroBuff>0?1.6:1)*(s.foodTime>0?1.25:1);hurt(r,enemy,n,'enemy');if(h.id==='lili'&&s.skills.double&&enemy.hp>0)hurt(r,enemy,n*.5,'enemy');emit(r,'attack',HEROES[h.id].name+'の攻撃。',{hero:h.id,target:r.enemies.indexOf(enemy),double:h.id==='lili'&&s.skills.double});
   if(h.id==='koharu'&&h.actions%3===0&&hasCharm(s,'feather')){const targets=[];r.enemies.forEach((e,i)=>{if(e!==enemy&&e.hp>0){targets.push(i);hurt(r,e,n*.7,'enemy');}});if(targets.length)charmEvent(r,'feather','koharu',targets);}
   if(h.id==='lili'&&h.actions%3===0&&hasCharm(s,'ember')){const targets=[];r.enemies.forEach((e,i)=>{if(e.hp>0){targets.push(i);hurt(r,e,n*.35,'enemy');}});if(targets.length)charmEvent(r,'ember','lili',targets);}
  }
  if(h.id==='noa'&&h.actions%3===0){if(s.skills.ward){for(const a of live)a.shield=Math.max(a.shield,5+s.upgrades.noa*2);emit(r,'shield','ノアが全員に、まもりの盾。');}if(hasCharm(s,'acorn')){for(const a of live)a.shield=Math.max(a.shield,a.maxHp*.08);charmEvent(r,'acorn','noa');}}
 }
 if(r.enemies.every(e=>e.hp<=0)){clear(s,r);return r.events;}
 for(const e of r.enemies){if(e.hp<=0)continue;e.cooldown-=dt;if(e.cooldown>0)continue;e.cooldown+=e.interval;const big=e.boss&&e.actions%3===2;e.actions++;
  if(big){if(e.region==='snow')r.chill=4;if(e.region==='coast')e.shield=Math.max(e.shield||0,e.maxHp*.1);emit(r,'big',e.region==='snow'?'冷たい羽ばたき！ 薬草茶で冷えを払おう。':e.region==='fields'?'突風が、一行を包む！':e.region==='coast'?'大きな波が、押し寄せる！':'森の力が、押し寄せる！');for(const h of r.heroes.filter(h=>h.hp>0))hurt(r,h,e.atk*.95,'hero');}
  else{const h=['noa','lili','mina','koharu'].map(id=>r.heroes.find(a=>a.id===id&&a.hp>0)).find(Boolean);if(h)hurt(r,h,e.atk,'hero');}
 }
 if(r.enemies.every(e=>e.hp<=0)){clear(s,r);return r.events;}
 if(r.heroes.every(h=>h.hp<=0)){s.defeats++;r.mode='rest';r.timer=3;r.nextStage=s.stage<=12?Math.floor((s.stage-1)/3)*3+1:region(s).id==='fields'?s.stage:region(s).start;r.nextEncounter=0;r.label=region(s).id==='fields'?'荷馬車でひと休み。この道のはじめから再挑戦。':'荷馬車でひと休み。素材と強化は、そのまま。';emit(r,'defeat',r.label);}
 return r.events;
}
function renovate(s,r){if(s.wagon)return{ok:false,error:'すでに改築しています。'};if(s.highest<12)return{ok:false,error:'森の主を倒すと改築できます。'};if(s.wood<30)return{ok:false,error:'木材があと'+(30-s.wood)+'必要です。'};s.wood-=30;s.wagon=1;s.completed=true;s.exploring=false;r.mode='complete';for(const h of r.heroes){h.hp=h.maxHp;h.shield=0;}emit(r,'ending','小さな旅が、帰る場所になった。');return{ok:true};}
function replay(s,r){if(!s.completed)return false;s.cycles++;s.location='road';s.resume=null;s.exploring=true;s.stage=1;s.encounter=0;s.rally=100;r.heroes=ids(s).map(id=>freshHero(s,id));spawn(s,r);return true;}
function craft(s,r){if(!s.wagon||s.crafted)return{ok:false,error:'改築後に一度だけ仕立て直せます。'};if(s.wood<6||s.crystals<1)return{ok:false,error:'木材6と魔石1が必要です。'};s.wood-=6;s.crystals--;s.crafted=true;sync(s,r);emit(r,'upgrade','花飾りの杖ができた！ リリの魔力＋6・HP＋20。',{hero:'lili'});return{ok:true};}
function offline(s,now=Date.now()){const elapsed=clamp((now-s.savedAt)/1000,0,14400);s.savedAt=now;if(elapsed<60||s.highest===0||(s.completed&&!s.exploring&&s.location!=='town'))return{seconds:0,coins:0};const coins=Math.floor(elapsed*(.012+s.highest*.004));s.coins+=coins;return{seconds:Math.floor(elapsed),coins};}

function gather(s,r,spot){const d=SPOTS[spot];if(!d||s.highest<d.need)return{ok:false,error:'先の道を踏破すると採集できます。'};if(s.gatherJob)return{ok:false,error:'いま採集中です。'};s.gatherJob={spot,left:8};emit(r,'notice',d.name+'へ採集かごを送りました。8秒で戻ります。');return{ok:true};}
function cook(s,r,key){const d=RECIPES[key];if(!d||!canPay(s,d.cost))return{ok:false,error:'料理の素材が足りません。採集で集めよう。'};pay(s,d.cost);s.bag[key]++;s.counts.cooks++;emit(r,'notice',d.name+'ができました。道具袋から使えます。');return{ok:true};}
function useItem(s,r,key){if(!Object.hasOwn(RECIPES,key)||s.bag[key]<1)return{ok:false,error:'道具がありません。'};if(r.mode!=='fight')return{ok:false,error:'戦闘中に使えます。'};const live=r.heroes.filter(h=>h.hp>0);if(key==='tea'&&!r.chill&&!live.some(h=>h.hp<h.maxHp))return{ok:false,error:'みんな元気です。傷ついた時に使おう。'};if(key==='pie'&&s.foodTime>0)return{ok:false,error:'まだパイの力が続いています。'};if(key==='charm'&&live.every(h=>h.shield>=h.maxHp*.4))return{ok:false,error:'お守りがみんなを守っています。'};s.bag[key]--;s.counts.meals++;
 if(key==='tea'){r.chill=0;for(const h of live)heal(r,h,h.maxHp*.45);}if(key==='pie')s.foodTime=45;if(key==='charm')for(const h of live)h.shield=Math.max(h.shield,h.maxHp*.4);emit(r,'notice',RECIPES[key].name+'を使いました。');return{ok:true};}
function gearCost(s,id){const d=GEAR[id];if(!d)return{};return Object.fromEntries(Object.entries(d.cost).map(([k,n])=>[k,n*(s.gear[id]+1)]));}
function equip(s,r,id){if(!Object.hasOwn(GEAR,id)||s.gear[id]>=(s.town.workshop?5:3))return{ok:false,error:'装備は最大'+(s.town.workshop?5:3)+'段階です。'};if(id!=='lili'&&!s.unlocked[id])return{ok:false,error:'先に仲間と出会おう。'};const cost=gearCost(s,id);if(!canPay(s,cost))return{ok:false,error:'装備の素材が足りません。'};pay(s,cost);s.gear[id]++;s.counts.gears++;sync(s,r);emit(r,'upgrade',GEAR[id].name+'が '+s.gear[id]+' / '+(s.town.workshop?5:3)+'段階に！',{hero:id});return{ok:true};}
function setTactic(s,r,key){if(!Object.hasOwn(TACTICS,key)||s.tactic===key)return{ok:false,error:'現在の作戦です。'};const ratios=r.heroes.map(h=>h.hp/h.maxHp);s.tactic=key;sync(s,r);r.heroes.forEach((h,i)=>{h.hp=h.maxHp*ratios[i];h.shield=0;});emit(r,'notice','作戦を「'+TACTICS[key].name+'」に変更しました。');return{ok:true};}
function claim(s,r,id){const d=MISSIONS.find(m=>m.id===id);if(!d||s.claimed.includes(id)||progressValue(s,d.key)<d.goal)return{ok:false,error:'依頼の条件を達成しよう。'};s.claimed.push(id);grant(s,d.reward);emit(r,'notice','依頼達成「'+d.name+'」！ 報酬を受け取りました。');return{ok:true};}
function deliver(s,r){const cost={herb:3,berry:3};if(!canPay(s,cost))return{ok:false,error:'薬草3・木の実3を集めよう。'};pay(s,cost);s.coins+=50;s.counts.deliveries++;if(s.counts.deliveries%3===0)s.crystals++;emit(r,'notice','森の配達完了！ コイン50'+(s.counts.deliveries%3===0?'・魔石1':'')+'を受け取りました。');return{ok:true};}
function visitTown(s,r,id){if(!s.wagon)return{ok:false,error:'森の主を越え、荷馬車に屋根をつけよう。'};id=id||s.townId;const d=Object.hasOwn(TOWNS,id)?TOWNS[id]:null;if(!d||s.highest<d.need)return{ok:false,error:'この町へは、まだ道がつながっていません。'};
 if(s.location!=='town'&&['fight','travel','rest'].includes(r.mode))s.resume={stage:r.mode==='fight'?s.stage:r.nextStage,encounter:r.mode==='fight'?s.encounter:r.nextEncounter};const first=!s.town.visited.includes(id);if(first)s.town.visited.push(id);s.location='town';s.townId=id;r.mode='town';r.enemies=[];r.heroBuff=0;r.chill=0;r.label=d.name+'でひと休み。';emit(r,'arrival',r.label,{town:id,first});return{ok:true,first};}
function depart(s,r,id){if(!s.wagon||s.location!=='town')return{ok:false,error:'町で出発の支度をしよう。'};let point;
 if(id==='continue'){if(!s.resume)return{ok:false,error:'再開する道がありません。'};point=s.resume;}
 else{const reg=REGIONS.find(d=>d.id===id);if(!reg||s.highest<reg.need)return{ok:false,error:'手前の地域を踏破すると出発できます。'};point={stage:reg.start,encounter:0};}
 s.stage=point.stage;s.encounter=point.encounter;s.resume=null;s.location='road';s.exploring=true;sync(s,r);for(const h of r.heroes){h.cooldown=Math.min(h.cooldown,.5);h.shield=0;}spawn(s,r);return{ok:true};}
function shop(s,r,id){const d=Object.hasOwn(GOODS,id)?GOODS[id]:null;if(s.location!=='town'||!d)return{ok:false,error:'町の道具屋で買えます。'};if(s.coins<d.price)return{ok:false,error:'コインが足りません。'};s.coins-=d.price;grant(s,d.reward);emit(r,'notice',d.name+'を買いました。');return{ok:true};}
function restAtInn(s,r){const price=40;if(s.location!=='town')return{ok:false,error:'町の宿屋へ寄ろう。'};if(!r.heroes.some(h=>h.hp<h.maxHp))return{ok:false,error:'みんな元気です。出発の準備はできています。'};if(s.coins<price)return{ok:false,error:'宿泊にはコイン40が必要です。'};s.coins-=price;s.town.rests++;for(const h of r.heroes){h.hp=h.maxHp;h.shield=0;}emit(r,'notice','宿屋で休み、全員のHPが回復しました。');return{ok:true};}
function fulfill(s,r,id){const d=TOWN_REQUESTS.find(d=>d.id===id);if(!d||s.location!=='town'||s.townId!==d.town||s.town.claimed.includes(id))return{ok:false,error:'その町の掲示板で依頼を受けよう。'};if(!canPay(s,d.cost))return{ok:false,error:'必要な品が足りません。工房や採集で用意しよう。'};pay(s,d.cost);grant(s,d.reward);s.town.claimed.push(id);s.town.reputation=s.town.claimed.length;emit(r,'notice',d.name+'、ありがとう！ 町の評判が上がりました。');return{ok:true};}
function repairWorkshop(s,r){const cost={wood:20,ore:20,crystals:6,star:1};if(s.location!=='town'||s.townId!=='port'||s.highest<30||s.town.workshop)return{ok:false,error:'星見の山頂を越え、港町で工房を直そう。'};if(!canPay(s,cost))return{ok:false,error:'木材20・鉱石20・魔石6・星の歯車1が必要です。'};pay(s,cost);s.town.workshop=true;sync(s,r);emit(r,'workshop','移動工房が動き出した！ 全員の攻撃・回復15%アップ、HP＋25。装備は5段階まで作れます。');return{ok:true};}
function recruitKoharu(s,r){if(s.unlocked.koharu)return{ok:false,error:'コハルは、もう一行の仲間です。'};if(!s.wagon||s.location!=='town'||s.townId!=='wheat')return{ok:false,error:'こむぎの町でコハルと出会えます。'};s.unlocked.koharu=true;sync(s,r);emit(r,'join','弓職人コハルが仲間になった！ 3回目の矢は威力1.4倍。',{hero:'koharu'});return{ok:true};}
function forgeWeapon(s,r,id){const w=WEAPONS[id];if(!Object.hasOwn(WEAPONS,id)||!w)return{ok:false,error:'装備を選んでください。'};if(s.armory.owned.includes(id))return{ok:false,error:'すでに持っています。'};if(w.hero!=='lili'&&!s.unlocked[w.hero])return{ok:false,error:'先に仲間と出会おう。'};if(s.highest<w.need||!s.wagon)return{ok:false,error:'旅を進めると作れるようになります。'};if(!canPay(s,w.cost))return{ok:false,error:'素材やコインが足りません。'};pay(s,w.cost);s.armory.owned.push(id);s.counts.gears++;emit(r,'upgrade',w.name+'ができました！ 装備すると効果がつきます。',{hero:w.hero});return{ok:true};}
function selectWeapon(s,r,id){if(!Object.hasOwn(WEAPONS,id)||!s.armory.owned.includes(id))return{ok:false,error:'先にこの装備を作ろう。'};const w=WEAPONS[id];if(w.hero!=='lili'&&!s.unlocked[w.hero])return{ok:false,error:'先に仲間と出会おう。'};if(s.armory.equipped[w.hero]===w.theme)return{ok:false,error:'装備中です。'};const ratios=Object.fromEntries(r.heroes.map(h=>[h.id,h.hp/h.maxHp]));s.armory.equipped[w.hero]=w.theme;sync(s,r);for(const h of r.heroes){h.hp=h.maxHp*(ratios[h.id]??1);h.shield=Math.min(h.shield,h.maxHp);}emit(r,'upgrade',w.name+'を装備しました。',{hero:w.hero,weapon:id});return{ok:true};}
function resetCharms(s,r){if(s.location!=='town'||!s.wagon||!s.charms.selected.length)return{ok:false,error:'町でおまもりを選び直せます。'};s.charms.selected=[];s.charms.offers=[];charmOffer(s);emit(r,'charm_pick','おまもりをほどきました。新しい組み合わせを選ぼう。');return{ok:true};}
return{CHARMS,CHARM_MILESTONES,charmCount,charmOffer,chooseCharm,resetCharms,encounters,WEAPONS,WEAPON_THEMES,recruitKoharu,forgeWeapon,selectWeapon,TOTAL_STAGES,REGIONS,TOWNS,GOODS,TOWN_REQUESTS,region,scenery,visitTown,depart,shop,restAtInn,fulfill,repairWorkshop,sync,SPOTS,ITEMS,RECIPES,GEAR,TACTICS,MISSIONS,progressValue,canPay,gearCost,gather,cook,useItem,equip,setTactic,claim,deliver,HEROES,UPGRADES,SKILLS,PLACES,ENCOUNTERS,newGame,load,cost,stats,createRun,upgrade,learn,rally,step,renovate,replay,craft,offline};
});
