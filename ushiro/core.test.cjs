const test=require('node:test'),assert=require('node:assert/strict'),C=require('./core.js');
function run(seed,policy,mode='normal',limit=95){const s=C.newRun({seed,mode});for(let i=0;i<limit*60&&s.phase==='running';i++){C.step(s,1/60);if(policy)policy(s,i);C.takeSignals(s);}return s;}
test('blind walking is caught only after a visible warning and full reaction window',()=>{
 const s=C.newRun({seed:3});while(!C.hasGhost(s))C.step(s,1/60);assert(s.time>6);assert(s.entries.includes('double'));const active=s.time;while(s.phase==='running')C.step(s,1/60);assert.equal(s.cause,'caught');assert(s.time-active>=3.3);assert.equal(s.stats.looks,0);
});
test('correctly timed looks banish a real ghost, reset its threat and count reaction',()=>{
 const s=C.newRun({seed:8});while(!C.hasGhost(s))C.step(s,1/60);for(let i=0;i<20;i++)C.step(s,1/60);const r=C.look(s);assert(r.hit);assert.equal(s.stats.banished,1);assert(!C.hasGhost(s));assert(s.stats.reactions[0]>.3);assert.equal(s.lookGhost,true);assert.equal(C.look(s).accepted,false);
});
test('unnecessary looks add fear; spamming loses without counting duplicate touch events',()=>{
 const s=run(17,(s,i)=>{if(i%45===0)C.look(s);});assert.equal(s.phase,'dead');assert.equal(s.cause,'fear');assert.equal(s.stats.falseLooks,4);const t=C.newRun();C.look(t);for(let i=0;i<9;i++)assert(!C.look(t).accepted);assert.equal(t.fear,26);
});
test('100 seeded routes are all clearable with ordinary subsecond reactions, in 30–90 seconds',()=>{
 for(let seed=1;seed<=100;seed++){const s=run(seed,s=>{if(C.hasGhost(s)&&s.event.age>=.55)C.look(s);});assert.equal(s.phase,'clear','seed '+seed);assert(s.time>=30&&s.time<=90,s.time);assert.equal(s.distance,72);assert.equal(s.stats.falseLooks,0);assert(s.stats.banished>=3);assert(s.finale);assert.equal(C.grade(s),'S');}
});
test('fakes never produce a persistent double shadow; fake streak is bounded',()=>{
 let fakes=0;for(let seed=1;seed<=25;seed++){const s=C.newRun({seed});let streak=0,prev=0;for(let i=0;i<4200&&s.phase==='running';i++){C.step(s,1/60);if(s.events!==prev){prev=s.events;if(s.event.real)streak=0;else{fakes++;streak++;assert(streak<=2);assert(!C.hasGhost(s));}}if(C.hasGhost(s)&&s.event.age>.4)C.look(s);}assert.equal(s.phase,'clear');}assert(fakes>15);
});
test('final anomaly happens once, keeps the same tell, and cannot create a sudden death',()=>{
 const s=C.newRun({seed:31});let finalCount=0,previous=false;for(let i=0;i<5000&&s.phase==='running';i++){C.step(s,1/60);if(s.event?.final&&!previous){finalCount++;assert(s.event.window>=2.49);}previous=!!s.event?.final;if(C.hasGhost(s)&&s.event.age>.5)C.look(s);}assert.equal(finalCount,1);assert.equal(s.phase,'clear');assert(s.entries.includes('final'));
});
test('endless remains playable, gets gradually harder and never shrinks reaction time below 1.9s',()=>{
 const s=run(40,s=>{if(C.hasGhost(s)&&s.event.age>.65)C.look(s);},'endless',210);assert.equal(s.phase,'running');assert(s.distance>230);assert(!s.finale);assert(C.windowFor(s)>=1.9);assert(s.stats.banished>15);
});
test('retry creates a wholly fresh run; malformed local records are sanitized',()=>{
 const a=run(2,null);const b=C.newRun({seed:5});assert.equal(b.time,0);assert.equal(b.distance,0);assert.equal(b.fear,0);assert.equal(b.lookLeft,0);assert.equal(b.event,null);assert(!b.finale);assert.equal(b.stats.banished,0);assert.deepEqual(b.entries,[]);assert.equal(C.readProfile('bad').plays,0);assert.equal(C.readProfile('{"version":99,"cleared":true}').cleared,false);const p=C.readProfile({version:1,cleared:true,bestNormal:Infinity,plays:4,entries:['double','unknown','double']});assert(p.cleared);assert.equal(p.bestNormal,0);assert.deepEqual(p.entries,['double']);assert.equal(p.plays,4);
});
