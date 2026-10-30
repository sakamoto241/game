const assert=require('node:assert/strict'),C=require('./akatsuki-core.js');
const tick=(s,n,input={})=>{for(let i=0;i<n;i++)C.step(s,1/120,input);};
let s=C.create();s.enemies[0].x=s.p.x+70;let hp=s.enemies[0].hp;C.step(s,1/120,{attack:true});assert.equal(s.enemies[0].hp,hp-18);let damage=s.stats.damage;tick(s,10,{attack:true});assert.equal(s.stats.damage,damage,'held attacks respect cooldown');
s=C.create();s.enemies[0].x=500;C.step(s,1/120,{magic:true});assert(s.p.light<66&&s.p.light>64);tick(s,100);assert(s.enemies[0].hp<90,'projectile deals actual damage');
s=C.create();s.p.light=12;C.step(s,1/120,{magic:true});assert.equal(s.orbs.length,0);tick(s,600);assert.equal(s.p.light,12,'minimum light prevents softlock');
s=C.create();C.step(s,1/120,{jump:true});assert(s.p.y>0);let vy=s.p.vy;C.step(s,1/120,{jump:true});assert(s.p.vy<vy,'cannot double jump');tick(s,120);assert.equal(s.p.y,0);
s=C.create(2);s.enemies[0].phase='warn';s.enemies[0].pattern=2;s.enemies[0].timer=.001;s.p.y=110;C.step(s,1/120);assert.equal(s.p.hp,6,'jump clears boss ground sweep');s.enemies[0].phase='warn';s.enemies[0].timer=.001;s.p.y=0;C.step(s,1/120);assert.equal(s.p.hp,5);
s=C.create();s.enemies[0].phase='warn';s.enemies[0].pattern=0;s.enemies[0].aim=s.p.x;s.enemies[0].timer=.001;C.step(s,1/120,{dodge:true});assert.equal(s.p.hp,6,'dodge invulnerability');
s=C.create();s.enemies.forEach(e=>e.hp=0);s.kills=s.enemies.length;s.p.x=s.exit;C.step(s,1/120);assert.equal(s.status,'clear');const t=s.t;tick(s,50,{attack:true});assert.equal(s.t,t,'clear freezes simulation');
assert.equal(C.readSave('{'),null);assert.equal(C.readSave('{"version":1,"chapter":8,"memories":[]}'),null);let saved=C.readSave(JSON.stringify(C.makeSave(1,['mother','mother','bad'])));assert.deepEqual(saved.memories,['mother']);
// Complete every chapter using only real inputs and the same rules as the browser.
for(let chapter=0;chapter<3;chapter++){
 let s=C.create(chapter);let jumped=false;
 for(let i=0;i<120*160&&s.status==='fight';i++){
  let live=s.enemies.filter(e=>e.hp>0),e=live.sort((a,b)=>Math.abs(a.x-s.p.x)-Math.abs(b.x-s.p.x))[0];let p=s.p, input={};
  if(e){let dx=e.x-p.x;input.axis=Math.abs(dx)>68?Math.sign(dx):0;input.attack=Math.abs(dx)<125;input.magic=Math.abs(dx)>140&&Math.abs(dx)<550&&p.light>=25;let danger=s.enemies.find(e=>e.hp>0&&e.phase==='warn'&&e.timer<.18);if(danger){if(danger.boss&&danger.pattern===2)input.jump=danger.timer>.12;else if(danger.pattern!==1)input.dodge=true;}if(s.orbs.some(o=>!o.ally&&Math.abs(o.x-p.x)<80))input.dodge=true;
  }else input.axis=1;
  C.step(s,1/120,input);
 }
 assert.equal(s.status,'clear',`chapter ${chapter}: hp ${s.p.hp}, kills ${s.kills}, x ${s.p.x}`);console.log(`chapter ${chapter+1} cleared in ${s.t.toFixed(1)}s, HP ${s.p.hp}`);
}
console.log('All lantern combat, input, save and full-route tests passed.');
