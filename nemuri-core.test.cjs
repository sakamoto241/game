const assert=require('node:assert/strict'),G=require('./nemuri-core.js');
function tick(r,input={},n=1){for(let i=0;i<n;i++)G.step(r,i?{...input,jump:false,dash:false,interact:false}:input,1/120);}
function moveTo(r,x){for(let i=0;i<1600&&Math.abs(r.p.x-x)>3;i++)tick(r,{left:r.p.x>x,right:r.p.x<x});assert(Math.abs(r.p.x-x)<5,`walk ${x}: ${r.p.x}`);}
function jumpTo(r,x,dash=false){tick(r,{jump:true,right:r.p.x<x,left:r.p.x>x});let dashed=false;for(let i=0;i<150;i++){let a={right:r.p.x<x-2,left:r.p.x>x+2};if(dash&&!dashed&&r.p.vy>=-100){a.dash=true;dashed=true;}tick(r,a);if(i>20&&r.p.ground)break;}}
const s=G.fresh(),r=G.create(s);tick(r,{},3);assert(r.p.ground);tick(r,{right:true},600);assert.equal(s.room,1);moveTo(r,490);tick(r,{interact:true});assert.equal(s.room,2);
moveTo(r,270);jumpTo(r,390);assert.equal(r.p.y,520);moveTo(r,480);jumpTo(r,640);assert.equal(r.p.y,420);moveTo(r,780);jumpTo(r,940);assert.equal(r.p.y,330);moveTo(r,990);assert(s.broom);console.log('PASS physically reachable broom via jumps');
moveTo(r,20);tick(r,{left:true},30);assert.equal(s.room,1);assert(r.p.x<550);moveTo(r,950);tick(r,{right:true,dash:true},35);assert(s.gate);tick(r,{right:true},140);assert.equal(s.room,3);console.log('PASS return to fork, dash opens gate');
moveTo(r,245);jumpTo(r,300);assert.equal(r.p.y,510);moveTo(r,385);jumpTo(r,810,true);assert(r.p.x>=745&&r.p.y<=620,JSON.stringify(r.p));assert(r.p.hp>0);moveTo(r,1180);tick(r,{right:true},30);assert.equal(s.room,4);console.log('PASS gap crossed with broom');
// Kill a real boss through projectile hits while avoiding damage with the actual platform.
moveTo(r,175);jumpTo(r,260);assert.equal(r.p.y,500);
for(let n=0;n<2200&&!s.boss;n++){const boss=r.boss;const threatened=boss&&boss.warning>0&&Math.abs(boss.target-r.p.x)<60;tick(r,{attack:true,right:r.p.x<520,left:r.p.x>600,jump:threatened&&r.p.ground});}
assert(s.boss,'boss should be beatable');assert.equal(r.boss,null);console.log('PASS boss real damage, rewards once');
moveTo(r,1180);tick(r,{right:true},30);assert.equal(s.room,5);moveTo(r,800);tick(r,{interact:true});assert(s.ended);assert(G.restore(JSON.parse(JSON.stringify(s))).ended);console.log('PASS workshop ending and save roundtrip');
const secret=G.create(G.restore({...s,room:0,heart:false}));tick(secret,{},3);moveTo(secret,200);jumpTo(secret,275);assert.equal(secret.p.y,520);moveTo(secret,365);jumpTo(secret,480);assert.equal(secret.p.y,420);moveTo(secret,575);jumpTo(secret,900,true);assert.equal(secret.p.y,340);moveTo(secret,970);assert(secret.s.heart);assert.equal(secret.p.hp,7);console.log('PASS revisiting high secret with broom');
const no=G.create();G.enter(no,1,950);tick(no,{right:true,dash:true},120);assert.equal(no.s.room,1);assert(!no.s.gate);assert(no.p.x<=975);console.log('PASS ability gate blocks first visit');
G.enter(no,3,580);no.p.y=820;no.p.inv=0;tick(no,{},2);assert.equal(no.p.hp,4);assert(no.p.x<420);no.p.inv=0;G.damage(no,9);tick(no,{},150);assert.equal(no.p.hp,5);assert.equal(no.s.room,3);console.log('PASS falls and death recover at checkpoint');
assert.equal(G.restore({version:1,room:5,boss:true}).room,1);console.log('PASS corrupt save cannot bypass ability gate');
