/* Deterministic inn management. No DOM, network, clock or other game's saves. */
(function(root,factory){if(typeof module==='object')module.exports=factory(require('./yofuke-data.js'));else root.Yofuke=factory(root.YofukeData);})(typeof globalThis!=='undefined'?globalThis:this,D=>{
'use strict';
const COST={shadow:1,bag:1,charm:3},phases=['guest','receipt','morning','ended'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),copy=x=>JSON.parse(JSON.stringify(x));
function queue(s){const list=[...D.nights[s.night].guests];if(s.night===6)return list;let n=(s.seed+s.night*7919)>>>0;for(let i=list.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;}
function guest(s){return queue(s)[Math.min(2,s.index)];}
function occupied(s){return s.tonight.filter(d=>d.choice!=='refuse').length;}
function create(seed=1){return{version:1,seed:seed>>>0,night:0,index:0,phase:'guest',coin:12,food:4,ward:5,rep:3,rooms:2,lens:0,salt:1,lamp:5,seen:[],answers:[],tonight:[],reports:[],introRead:false,sealBought:false,result:null,stats:{served:0,spirits:0,contained:0,missing:0,refused:0,spent:0}};}
function inspect(s,type){if(s.phase!=='guest'||!Object.hasOwn(COST,type))return{ok:false,reason:'今は調べられません。'};const g=guest(s),first=!s.seen.includes(type),cost=first?COST[type]:0;if(s.lamp<cost)return{ok:false,reason:'今夜の灯りが足りません。会話や、すでに見た手がかりも参考にできます。'};if(first){s.lamp-=cost;s.seen.push(type);}return{ok:true,text:g[type],first,cost};}
function talk(s,topic){if(s.phase!=='guest'||!['origin','reason'].includes(topic))return null;if(!s.answers.includes(topic))s.answers.push(topic);return guest(s)[topic];}
function canDecide(s,choice){if(s.phase!=='guest')return'すでに判断を終えています。';if(!['admit','refuse','warded'].includes(choice))return'判断を選んでください。';if(choice==='refuse')return'';if(occupied(s)>=s.rooms)return'今夜の部屋は満室です。';if(s.food<1)return'朝食の食料がありません。今夜はこれ以上泊められません。';if(choice==='warded'&&s.salt<1)return'結界の部屋に使う封印札がありません。';return'';}
function decide(s,choice){const reason=canDecide(s,choice);if(reason)return{ok:false,reason};const g=guest(s),paid=choice==='refuse'?0:choice==='warded'?Math.min(3,g.fee):g.fee;if(choice!=='refuse'){s.food--;s.coin+=paid;if(choice==='warded')s.salt--;}
 s.tonight.push({id:g.id,choice,paid});s.phase='receipt';return{ok:true,paid,choice};}
function result(s){if(s.ward<=0||s.stats.missing>=3)return'breach';if(s.night!==6)return null;if(s.stats.missing===0&&s.rep>=12&&s.stats.spirits>=2)return'hearth';if(s.stats.served<7||s.rep<=0)return'empty';return'keeper';}
function dawn(s){s.phase='morning';const entries=[];let damage=0,repChange=0,foodGain=0,wardGain=0;for(const d of s.tonight){const g=D.nights[s.night].guests.find(g=>g.id===d.id);let effect='';if(d.choice==='refuse'){if(g.kind==='danger'){repChange++;effect='戸を守った。危険な客は去った。';}else{repChange--;s.stats.refused++;effect='害のない客を、雨の中へ帰した。';}}
 else if(d.choice==='warded'){s.stats.served++;if(g.kind==='danger'){s.stats.contained++;repChange++;effect='結界が客を閉じ込めた。夜明けに姿が消えた。';}else{repChange+=g.kind==='spirit'?2:1;if(g.kind==='spirit')s.stats.spirits++;effect='客は無事に朝を迎えた。封印札は必要なかった。';}}
 else{s.stats.served++;if(g.kind==='danger'){damage+=2;s.stats.missing++;effect='夜、ひとつの寝台が空になった。結界 −2。';}else{repChange+=g.kind==='spirit'?2:1;if(g.kind==='spirit')s.stats.spirits++;effect='朝食を囲んで、無事に旅立った。';if(g.boon==='food'){foodGain++;effect+=' 食料 +1。';}if(g.boon==='ward'){wardGain++;effect+=' 結界 +1。';}}}
 entries.push({...d,name:g.name,art:g.art,kind:g.kind,truth:g.truth,effect});}
 s.rep=clamp(s.rep+repChange,-30,99);s.food=clamp(s.food+foodGain,0,12);s.ward=clamp(s.ward+wardGain,0,6);s.ward=Math.max(0,s.ward-damage);const upkeep=Math.min(2,s.coin);s.coin-=upkeep;if(upkeep<2)s.ward=Math.max(0,s.ward-1);
 const report={night:s.night,entries,damage,repChange,foodGain,wardGain,upkeep,ward:s.ward,event:D.nights[s.night].after};s.reports.push(report);s.result=result(s);return report;}
function next(s){if(s.phase!=='receipt')return false;if(s.index<2){s.index++;s.phase='guest';s.seen=[];s.answers=[];}else dawn(s);return true;}
const stock=[{id:'food',name:'朝食の食料',detail:'食料 +3（最大12）',cost:4},{id:'salt',name:'一晩の封印札',detail:'封印札 +1 · 一日に一つ',cost:5},{id:'repair',name:'戸口の修繕',detail:'結界 +2（最大6）',cost:6},{id:'lens',name:'銀の灯芯',detail:'次の夜から調査の灯り +2',cost:10},{id:'room',name:'三つ目の客室',detail:'次の夜から定員3人',cost:12}];
function canBuy(s,id){const item=stock.find(i=>i.id===id);if(!item||s.phase!=='morning'||s.result)return'今は仕入れできません。';if(s.coin<item.cost)return'銀貨が足りません。';if(id==='food'&&s.food>=12)return'食料は十分にあります。';if(id==='salt'&&(s.sealBought||s.salt>=2))return'封印札は一日に一つ、所持は二つまでです。';if(id==='repair'&&s.ward>=6)return'結界は万全です。';if(id==='lens'&&s.lens)return'すでに銀の灯芯を使っています。';if(id==='room'&&s.rooms===3)return'すべての客室を使っています。';return'';}
function buy(s,id){const reason=canBuy(s,id);if(reason)return{ok:false,reason};const item=stock.find(i=>i.id===id);s.coin-=item.cost;s.stats.spent+=item.cost;if(id==='food')s.food=Math.min(12,s.food+3);if(id==='salt'){s.salt++;s.sealBought=true;}if(id==='repair')s.ward=Math.min(6,s.ward+2);if(id==='lens')s.lens=1;if(id==='room')s.rooms=3;return{ok:true};}
function advance(s){if(s.phase!=='morning')return false;if(s.result){s.phase='ended';return true;}s.night++;s.index=0;s.phase='guest';s.lamp=5+s.lens*2;s.seen=[];s.answers=[];s.tonight=[];s.introRead=false;s.sealBought=false;return true;}
const endings={
 hearth:{title:'灯りの消えない宿',subtitle:'THE HEARTH',text:'人の名と、読めない名が並んだ客帳。あなたは祖母と同じように、顔よりも心を見ようとした。\n\n朝の食卓には、椀がひとつ多かった。今度は間違いではない。あなたは、オトの席を空けておいた。\n\n窓の向こうで、長い夜が少しずつほどけていく。'},
 keeper:{title:'夜を越す番人',subtitle:'THE KEEPER',text:'すべての戸を、正しく開けられたわけではない。それでも、あなたが迎えた人たちは、ここで朝を待つことができた。\n\n祖母の客帳の続きに、自分の文字で書き足す。\n「今夜も、帰る場所をひとつ」。\n\n宿の灯りは、まだ燃えている。'},
 empty:{title:'誰もいない朝',subtitle:'THE EMPTY TABLE',text:'戸は守られた。食器は揃い、客室には傷ひとつない。\n\nけれど、食卓に座る人はいなかった。雨の夜、あなたの戸を叩いた人たちは、どこで朝を待ったのだろう。\n\n客帳を閉じると、奥の部屋から聞こえていた寝息も、もう聞こえなかった。'},
 breach:{title:'戸口の向こう側',subtitle:'THE OTHER SIDE',text:'最後の鍵をまわしても、扉は閉まらなかった。\n\n廊下は外の夜へと続き、客室の名札が、知らない名前に変わっていく。\n\n机の上に、祖母の言葉が残っていた。\n「懐かしい声でも、確かめてから」。\n\n宿は夜の中へ消えた。けれど、客帳の最初の頁は、まだ白い。'}
};
function read(raw){try{const s=typeof raw==='string'?JSON.parse(raw):copy(raw);if(!s||s.version!==1||!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295||!Number.isInteger(s.night)||s.night<0||s.night>6||!Number.isInteger(s.index)||s.index<0||s.index>2||!phases.includes(s.phase))return null;
 const limits={coin:[0,999],food:[0,12],ward:[0,6],rep:[-30,99],rooms:[2,3],lens:[0,1],salt:[0,2],lamp:[0,7]};for(const [k,[a,b]] of Object.entries(limits))if(!Number.isInteger(s[k])||s[k]<a||s[k]>b)return null;
 if(!Array.isArray(s.seen)||s.seen.some(k=>!Object.hasOwn(COST,k))||new Set(s.seen).size!==s.seen.length||!Array.isArray(s.answers)||s.answers.some(k=>!['origin','reason'].includes(k))||typeof s.introRead!=='boolean'||typeof s.sealBought!=='boolean'||!Array.isArray(s.tonight)||!Array.isArray(s.reports)||s.reports.length>7||!s.stats)return null;
 for(const k of ['served','spirits','contained','missing','refused','spent'])if(!Number.isInteger(s.stats[k])||s.stats[k]<0||s.stats[k]>999)return null;
 const expected=['morning','ended'].includes(s.phase)?3:s.index+(s.phase==='receipt'?1:0);if(s.tonight.length!==expected||s.reports.length!==s.night+(['morning','ended'].includes(s.phase)?1:0))return null;
 const q=queue(s);for(let i=0;i<s.tonight.length;i++){const d=s.tonight[i];if(d.id!==q[i].id||!['admit','refuse','warded'].includes(d.choice)||d.paid!==(d.choice==='refuse'?0:d.choice==='warded'?Math.min(3,q[i].fee):q[i].fee))return null;}
 if(s.result!==null&&!Object.hasOwn(endings,s.result)||s.phase==='ended'&&!s.result)return null;if(['morning','ended'].includes(s.phase)){if(s.result!==result(s))return null;}else if(s.result!==null||s.ward<=0||s.stats.missing>=3)return null;
 for(let i=0;i<s.reports.length;i++){const r=s.reports[i];if(r.night!==i||!Array.isArray(r.entries)||r.entries.length!==3||r.event!==D.nights[i].after)return null;for(const [key,min,max] of [['damage',0,6],['repChange',-3,6],['foodGain',0,3],['wardGain',0,3],['upkeep',0,2],['ward',0,6]])if(!Number.isInteger(r[key])||r[key]<min||r[key]>max)return null;const qr=queue({...s,night:i});for(let j=0;j<3;j++){const e=r.entries[j],g=qr[j];if(e.id!==g.id||e.name!==g.name||e.kind!==g.kind||e.truth!==g.truth||e.art!==g.art||typeof e.effect!=='string'||e.effect.length>300||!['admit','refuse','warded'].includes(e.choice)||e.paid!==(e.choice==='refuse'?0:e.choice==='warded'?Math.min(3,g.fee):g.fee))return null;}}
 return copy(s);
 }catch{return null;}}
return{create,read,queue,guest,occupied,inspect,talk,decide,next,buy,canBuy,stock,advance,canDecide,endings};
});
