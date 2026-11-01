const assert=require('node:assert/strict'),C=require('./yofuke-core.js'),D=require('./yofuke-data.js');
const saved=s=>{const next=C.read(JSON.stringify(s));assert(next,'every reachable phase must reload');assert.deepEqual(next,s);return next;};
assert.equal(D.nights.length,7);assert.equal(new Set(D.nights.flatMap(n=>n.guests.map(g=>g.id))).size,21);
for(const n of D.nights){assert.equal(n.guests.length,3);for(const g of n.guests){assert(['human','spirit','danger'].includes(g.kind));assert(g.art>=0&&g.art<8);for(const field of ['intro','origin','reason','shadow','bag','charm','truth'])assert(g[field].length>8);}}
let s=C.create(47);assert.equal(C.read('{'),null);assert.equal(C.read('null'),null);assert.equal(C.read(JSON.stringify({...s,night:7})),null);assert.equal(C.read(JSON.stringify({...s,ward:-1})),null);assert.equal(C.read(JSON.stringify({...s,result:'hearth'})),null);
const first=C.guest(s);assert.deepEqual(C.queue(s),C.queue(C.create(47)));assert(D.nights[0].guests.some(g=>g.id===first.id));assert.equal(C.talk(s,'origin'),first.origin);assert.equal(s.lamp,5);
assert(C.inspect(s,'charm').ok);assert.equal(s.lamp,2);assert(C.inspect(s,'charm').ok);assert.equal(s.lamp,2,'re-reading costs nothing');assert.equal(C.inspect(s,'unknown').ok,false);s.lamp=0;const before=JSON.stringify(s);assert.equal(C.inspect(s,'shadow').ok,false);assert.equal(JSON.stringify(s),before);saved(s);
let r=C.decide(s,'admit');assert(r.ok);assert.equal(s.coin,12+first.fee);assert.equal(s.food,3);const paid=JSON.stringify(s);assert.equal(C.decide(s,'admit').ok,false);assert.equal(JSON.stringify(s),paid,'double input never charges, feeds or rewards twice');assert.equal(C.inspect(s,'shadow').ok,false);saved(s);assert(C.next(s));assert.equal(s.index,1);assert.deepEqual(s.seen,[]);assert.equal(s.lamp,0,'lamp is shared across the night');
assert(C.decide(s,'warded').ok);assert.equal(s.salt,0);C.next(s);assert.match(C.canDecide(s,'admit'),/満室/);assert(C.decide(s,'refuse').ok);C.next(s);assert.equal(s.phase,'morning');assert.equal(s.reports.length,1);assert.equal(s.reports[0].entries.length,3);saved(s);const dawnState=JSON.stringify(s);assert.equal(C.next(s),false);assert.equal(JSON.stringify(s),dawnState,'morning outcomes resolve once');
s=C.create(9);s.food=0;assert.match(C.canDecide(s,'admit'),/食料/);assert(C.decide(s,'refuse').ok);C.next(s);assert.equal(s.food,0);
function run(seed,policy){let s=C.create(seed);s.introRead=true;let count=0;while(s.phase!=='ended'&&count++<200){
 if(s.phase==='guest'){
  if(policy==='good'){
   const g=C.guest(s);C.talk(s,'origin');saved(s);const answer=C.inspect(s,'shadow');if(answer.ok)saved(s);
   let choice=g.kind==='danger'?'refuse':'admit';if(C.canDecide(s,choice))choice='refuse';assert(C.decide(s,choice).ok);
  }else if(policy==='human')assert(C.decide(s,C.guest(s).kind==='human'&&!C.canDecide(s,'admit')?'admit':'refuse').ok);
  else if(policy==='refuse')assert(C.decide(s,'refuse').ok);
  else {const choice=C.canDecide(s,'admit')?'refuse':'admit';assert(C.decide(s,choice).ok);}
 }else if(s.phase==='receipt')C.next(s);
 else if(s.phase==='morning'){
  if(['good','human','admit'].includes(policy)&&!s.result){if(['good','admit'].includes(policy)&&s.night===0&&!C.canBuy(s,'room'))C.buy(s,'room');while(s.food<4&&!C.canBuy(s,'food'))C.buy(s,'food');if(policy==='good'&&!s.lens&&!C.canBuy(s,'lens'))C.buy(s,'lens');if(policy==='good'&&s.ward<=3&&!C.canBuy(s,'repair'))C.buy(s,'repair');}
  saved(s);C.advance(s);
 }s=saved(s);
 }assert(count<200);return s;}
for(let seed=1;seed<=100;seed++){const good=run(seed,'good');assert.equal(good.result,'hearth',`good management is viable, seed ${seed}`);assert.equal(good.stats.missing,0);assert.equal(good.reports.length,7);assert(good.stats.spirits>=2);}
assert.equal(run(12,'human').result,'keeper');const empty=run(12,'refuse');assert.equal(empty.result,'empty');assert.equal(empty.reports.length,7);assert.equal(empty.stats.served,0);const bad=run(12,'admit');assert.equal(bad.result,'breach');assert(bad.stats.missing>=3||bad.ward===0);
// A protected dangerous guest spends a real seal and cannot steal a bed.
s=C.create(1);const dangerIndex=C.queue(s).findIndex(g=>g.kind==='danger');for(let i=0;i<3;i++){const choice=i===dangerIndex?'warded':'refuse';assert(C.decide(s,choice).ok);C.next(s);}assert.equal(s.stats.missing,0);assert.equal(s.stats.contained,1);assert.equal(s.salt,0);saved(s);
// Shop stock, caps, costs and next-night upgrades survive a reload.
s=run(4,'refuse');s=C.create(4);for(let i=0;i<3;i++){C.decide(s,'refuse');C.next(s);}s.coin=50;const c0=s.coin;assert(C.buy(s,'lens').ok);assert.equal(s.coin,c0-10);assert.equal(C.buy(s,'lens').ok,false);assert(C.buy(s,'salt').ok);assert.equal(C.buy(s,'salt').ok,false);assert(C.buy(s,'room').ok);assert.equal(C.buy(s,'room').ok,false);s.food=11;assert(C.buy(s,'food').ok);assert.equal(s.food,12);assert.equal(C.buy(s,'food').ok,false);s=saved(s);C.advance(s);assert.equal(s.lamp,7);assert.equal(s.rooms,3);assert.equal(s.sealBought,false);saved(s);
console.log('21 authored guests, inspection limits, save validation/round trips, single decisions/dawn, 100 viable seven-night economies, kindness/empty/breach endings, containment and shop caps passed.');
