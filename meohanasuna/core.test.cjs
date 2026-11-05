const test=require('node:test'),assert=require('node:assert/strict'),C=require('./core.js');
const playing=()=>{const s=C.fresh();for(let i=0;i<3;i++)C.act(s,'intro');return s;};
const unlock=s=>{C.act(s,'room','classroom');C.act(s,'drawer','2786');C.act(s,'room','office');};
const power=s=>{unlock(s);for(let i=0;i<9;i++)while(s.wires[i]!==0)C.act(s,'rotate',i);assert(C.connected(s));C.act(s,'power');C.act(s,'key');};
test('intro, watching, room inspection, pause and gentle mode produce actual, bounded time progression',()=>{
 const s=C.fresh();C.tick(s,.1,{watching:false});assert.equal(s.distance,100);for(let i=0;i<3;i++)C.act(s,'intro');assert.equal(s.status,'playing');for(let i=0;i<10;i++)C.tick(s,.1,{watching:true});assert.equal(s.distance,100);C.tick(s,.1,{watching:false});assert(s.distance<100);const d=s.distance;C.tick(s,.1,{paused:true});assert.equal(s.distance,d);s.difficulty='gentle';C.tick(s,.1,{});assert(d-s.distance<.05);C.tick(s,999,{});assert(s.distance>d-1);
});
test('the authored clue sequence yields the real drawer code, with wrong entries having a safe penalty',()=>{
 const s=playing();assert(!C.act(s,'room','office').ok);C.act(s,'notice');C.act(s,'room','classroom');C.act(s,'seats');C.act(s,'diary');assert(!C.act(s,'drawer','0000').ok);assert.equal(s.mistakes,1);assert.equal(s.distance,95);assert(C.act(s,'drawer','2786').ok);assert(s.flags.teacherKey);assert.equal(s.distance,100);assert(C.act(s,'room','office').ok);assert(C.validate(s));
});
test('electrical tiles need mutual edges; solved route opens power, key and memory in the office',()=>{
 const s=playing();unlock(s);assert(!C.connected(s));assert(!C.act(s,'archive').ok);assert(!C.act(s,'key').ok);assert(!C.act(s,'power').ok);for(let i=0;i<9;i++)while(s.wires[i]!==0)C.act(s,'rotate',i);assert(C.connected(s));assert(C.liveTiles(s).has(8));assert(C.act(s,'power').ok);assert(s.flags.power);assert.equal(s.distance,100);assert(C.act(s,'archive').ok);assert(C.act(s,'key').ok);assert(s.flags.archive&&s.flags.exitKey);assert(!C.act(s,'rotate',0).ok);
});
test('clock requires both power and key, derives 17:10 from the two clues, and remains wrong for AM',()=>{
 const s=playing();assert(!C.act(s,'time',{hour:17,minute:10}).ok);power(s);C.act(s,'room','corridor');assert(!C.act(s,'time',{hour:5,minute:10}).ok);assert(!C.act(s,'time',{hour:17,minute:30}).ok);assert(C.act(s,'time',{hour:17,minute:10}).ok);assert(s.flags.clock);assert.equal(C.stage(s),3);assert(C.validate(s));
});
test('both endings are reachable; calling her name requires the discovered memory',()=>{
 for(const ending of ['alone','remember']){const s=playing();power(s);if(ending==='remember')C.act(s,'archive');C.act(s,'room','corridor');C.act(s,'time',{hour:17,minute:10});if(ending==='alone')assert(!C.act(s,'ending','remember').ok);assert(C.act(s,'ending',ending).ok);assert.equal(s.status,'ended');assert.equal(s.ending,ending);assert(C.validate(JSON.stringify(s)));assert(C.act(s,'retry').ok);assert.equal(s.distance,100);assert(s.flags.clock);assert.equal(s.room,'corridor');}
});
test('being caught keeps solved puzzles and clues, resets safely, and cannot lose keys',()=>{
 const s=playing();power(s);s.distance=.01;assert(C.tick(s,.1,{}));assert.equal(s.status,'caught');assert.equal(s.deaths,1);assert(s.flags.power&&s.flags.exitKey);const restored=C.validate(JSON.stringify(s));assert(C.act(restored,'retry').ok);assert(restored.flags.power);assert(restored.flags.teacherKey);assert.equal(restored.distance,100);assert.equal(restored.deaths,1);
});
test('off-site and unknown actions cannot skip discovery; hints give an attainable solution for every stage',()=>{
 const s=playing();assert(!C.act(s,'drawer','2786').ok);assert(!C.act(s,'power').ok);assert(!C.act(s,'time',{hour:NaN,minute:10}).ok);assert(!C.act(s,'room','roof').ok);for(let stage=0;stage<4;stage++){for(let l=0;l<3;l++)assert(C.hint(s,l).length>8);if(stage===0)unlock(s);if(stage===1){for(let i=0;i<9;i++)s.wires[i]=0;C.act(s,'power');C.act(s,'key');}if(stage===2){C.act(s,'room','corridor');C.act(s,'time',{hour:17,minute:10});}}
});
test('invalid saves are rejected and bounded older/missing fields recover without mutating the input',()=>{
 for(const data of ['{','{}',null,{...C.fresh(),version:99},{...C.fresh(),distance:NaN},{...C.fresh(),room:'roof'},{...C.fresh(),status:'ended'},{...C.fresh(),ending:'remember',status:'ended'}])assert.equal(C.validate(data),null);
 const s=playing(),raw=JSON.stringify(s);const restored=C.validate(raw);assert(restored);assert.equal(JSON.stringify(s),raw);restored.flags.teacherKey=true;assert(!s.flags.teacherKey);assert(C.validate({...s,wires:[99],elapsed:Infinity}));
});
