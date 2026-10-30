const assert=require('node:assert/strict'),C=require('./noa-cues.js'),G=require('./noa-core.js');
assert.equal(C.describe(null),null);assert.equal(C.describe({kind:'fake',total:1,left:.5}),null);assert.equal(C.describe({kind:'slam',total:1,left:.5}),null);
for(const kind of Object.keys(C.kinds)){const a={kind,total:.9,left:.9,target:500};let cue=C.describe(a);assert.equal(cue.progress,0);assert.equal(cue.count,3);assert(!cue.urgent);a.left=.1;cue=C.describe(a);assert(cue.urgent);assert.equal(cue.count,1);assert(cue.progress>.8);assert(cue.action);if(kind==='slam'){assert.equal(cue.x0,385);assert.equal(cue.x1,615);}else{assert.equal(cue.x0,0);assert.equal(cue.x1,G.W);}}
console.log('PASS each live warning has a name, action, countdown, urgency and exact attack area');
for(const kind of ['slam','sweep','rush','orbs']){const r=G.create();r.b.attack={kind,total:.7,left:.2,target:r.p.x};const before=JSON.stringify(r);for(let i=0;i<200;i++)C.describe(r.b.attack);assert.equal(JSON.stringify(r),before);const cues=[];for(let i=0;i<30;i++){const c=C.describe(r.b.attack);if(c)cues.push(c);G.step(r,{});}assert(r.events.some(e=>e.type==='impact'&&e.kind===kind));assert(cues.every(c=>c.progress>=0&&c.progress<=1));}
console.log('PASS cues follow actual impacts and never mutate combat');

const slam=C.describe({kind:'slam',total:1,left:.1,target:500});
for(const x of [slam.x0-1,slam.x0+1,slam.x1-1,slam.x1+1]){const r=G.create();r.p.x=x;r.b.attack={kind:'slam',total:1,left:.001,target:500};G.step(r,{});assert.equal(r.p.hp<6,x>slam.x0&&x<slam.x1);}
for(const kind of ['sweep','rush'])for(const x of [45,500,995]){const r=G.create();r.p.x=x;r.b.attack={kind,total:1,left:.001,target:500};const cue=C.describe(r.b.attack);assert(x>=cue.x0&&x<=cue.x1);G.step(r,{});assert.equal(r.p.hp,5);}
console.log('PASS warning boundaries match actual damage at inside/outside points and all arena positions');
