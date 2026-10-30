const assert=require('node:assert/strict'),G=require('./soranobori-core.js');
const dt=1/120,step=(r,i={},n=1)=>{for(let k=0;k<n;k++)G.step(r,i,dt);};
function charge(r,t,dir){step(r,{press:true,aim:dir});step(r,{},t-1);step(r,{release:true});}
let r=G.create();step(r,{press:true});step(r,{},400);assert(r.s.charging);assert.equal(r.s.p.ground,0);assert.equal(r.s.charge,G.CHARGE);step(r,{release:true});assert.equal(r.s.jumps,1);assert(r.s.p.vy>700);console.log('PASS charge saturates without auto-jump, release launches');
const a=G.create(),b=G.create();charge(a,75,1);charge(b,75,1);step(a,{left:true,aim:-1},22);step(b,{},22);assert.equal(a.s.p.x,b.s.p.x);assert.equal(a.s.p.y,b.s.p.y);assert.equal(a.s.p.vx,b.s.p.vx);console.log('PASS no midair steering');
r=G.create();step(r,{press:true},10);step(r,{cancel:true});step(r,{release:true});assert.equal(r.s.jumps,0);assert.equal(r.s.p.ground,0);console.log('PASS cancel/blur cannot fire a jump');
r=G.create();Object.assign(r.s.p,{x:463,y:700,ground:null,vx:300,vy:50});step(r,{},10);assert(r.s.p.vx<0);assert(r.events.some(e=>e.type==='wall'));console.log('PASS walls bounce');
r=G.create();Object.assign(r.s.p,{x:105,y:60,ground:null,vx:0,vy:700});step(r,{},20);assert(r.events.some(e=>e.type==='head'));assert(r.s.p.y+G.BODY<120);console.log('PASS solid platform undersides');
// Find actual valid inputs for every gap, including overhangs and wall collisions.
const route=[];
for(let i=0;i<G.platforms.length-1;i++){
 const a=G.platforms[i],b=G.platforms[i+1];let answer;
 const xs=[];for(let x=a.x+17;x<=a.x+a.w-17;x+=6)xs.push(x);xs.push(a.x+a.w-17);
 search:for(const x of xs)for(const dir of [-1,0,1])for(let t=12;t<=102;t+=3){
  const test=G.create();Object.assign(test.s.p,{x,y:a.y,ground:a.id,face:dir});test.s.fallFrom=a.y;charge(test,t,dir);
  for(let n=0;n<240;n++){step(test);if(test.s.p.ground!==null||test.s.p.y<a.y-220)break;}
  if(test.s.p.ground===b.id){answer={x,dir,t,id:b.id};break search;}
 }
 assert(answer,`No valid jump from ${a.id} to ${b.id}`);route.push(answer);
}
// Execute the route continuously. Walking and jump inputs only; no warping or invincibility.
r=G.create();
for(const q of route){let count=0;while(Math.abs(r.s.p.x-q.x)>.8&&count++<1000)step(r,{left:r.s.p.x>q.x,right:r.s.p.x<q.x});assert(count<1000);assert(r.s.p.ground!==null);charge(r,q.t,q.dir);for(let n=0;n<240&&r.s.p.ground===null;n++)step(r);assert.equal(r.s.p.ground,q.id,`Continuous route missed ${q.id}`);assert.equal(r.s.p.vx,0);}
assert(r.s.cleared);assert.equal(r.s.jumps,35);assert.equal(r.s.falls,0);assert(r.s.time>30);assert(G.restore(JSON.parse(JSON.stringify(r.s))).cleared);console.log('PASS all 35 consecutive jumps through the real course, ending and save roundtrip');
const high=G.platforms[30];r=G.create();Object.assign(r.s.p,{x:455,y:high.y,ground:null,vx:0,vy:-100});r.s.checkpoint=30;r.s.fallFrom=high.y;step(r,{},150);assert(r.s.p.y<high.y-300);assert(r.s.p.ground!==30);console.log('PASS standard mode has no checkpoint recovery');
r=G.create(G.fresh('practice'));Object.assign(r.s.p,{x:455,y:high.y-279,ground:null,vx:0,vy:-500});r.s.checkpoint=30;r.s.fallFrom=high.y;step(r,{},10);assert.equal(r.s.p.ground,30);assert.equal(r.s.falls,1);assert(r.events.some(e=>e.type==='practice'));console.log('PASS explicit practice recovery is separate');
r=G.create();Object.assign(r.s.p,{x:455,y:1100,ground:null,vx:0,vy:-300});r.s.fallFrom=1100;for(let i=0;i<500&&r.s.p.ground===null;i++)step(r);assert.equal(r.s.p.ground,0);assert.equal(r.s.falls,1);assert.equal(r.s.biggestFall,1100);console.log('PASS big fall lands below, counted exactly once');
r=G.create();charge(r,80,-1);step(r,{},15);const restored=G.create(G.restore(JSON.parse(JSON.stringify(r.s))));step(r,{},20);step(restored,{},20);assert(Math.abs(r.s.p.x-restored.s.p.x)<.001);assert(Math.abs(r.s.p.y-restored.s.p.y)<.001);assert.equal(r.s.jumps,restored.s.jumps);console.log('PASS midair save resumes velocity instead of restoring a ledge');
r=G.create();r.locked=true;step(r,{press:true},120);assert.equal(r.s.time,0);assert.equal(r.s.jumps,0);console.log('PASS pause excludes play time and inputs');
assert.equal(G.restore({version:1,cleared:true,p:{x:100,y:0},charge:999,charging:true}).cleared,false);assert.equal(G.restore({version:1,p:{x:Infinity,y:NaN},mode:'bad'}).mode,'summit');console.log('PASS malformed saves are bounded and do not clear the game');
