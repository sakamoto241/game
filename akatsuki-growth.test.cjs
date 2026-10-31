const assert=require('node:assert/strict'),C=require('./akatsuki-core.js');
const tick=(s,n,input={})=>{for(let i=0;i<n;i++)C.step(s,1/120,input);};
function arena(ids=[]){const s=C.create(0,[],{xp:810,skills:ids,earned:[]});s.enemies.forEach((e,i)=>{e.x=i?2500:190;e.kind='wraith';e.y=0;e.hp=e.max=1000;e.phase='recover';e.timer=100;});return s;}
const branches={blade:['blade1','blade2','blade3','blade4'],lamp:['lamp1','lamp2','lamp3','lamp4'],shadow:['shadow1','shadow2','shadow3','shadow4']};
let s=C.create();assert.equal(C.learn(s,'blade1'),false);s.progress.xp=30;assert.equal(C.points(s.progress),1);assert.equal(C.learn(s,'blade2'),false);assert(C.learn(s,'blade1'));assert.equal(C.learn(s,'lamp1'),false);assert.equal(C.learn(s,'blade1'),false);C.respec(s);assert.equal(C.points(s.progress),1);assert.equal(C.learn(s,'lamp1'),true);
s=arena(['blade1']);tick(s,80,{attack:true});assert.equal(1000-s.enemies[0].hp,76,'finisher 18+18+40');
s=arena(branches.blade.slice(0,2));s.p.y=175;C.step(s,1/120,{attack:true});assert.equal(1000-s.enemies[0].hp,28,'air attack reaches high position with extra damage');
s=arena(branches.blade.slice(0,3));s.enemies[0].x=45;C.step(s,1/120,{dodge:true});C.step(s,1/120,{attack:true});assert.equal(s.enemies[0].hp,970,'dodge counter damages behind');
s=arena(branches.blade);s.enemies[0].x=500;s.p.combo=2;const light=s.p.light;C.step(s,1/120,{attack:true});assert(s.orbs.some(o=>o.damage===26&&o.source==='blade'));assert(light-s.p.light<.01,'wave costs no light');
s=arena(['lamp1']);C.step(s,1/120,{magic:true});assert(Math.abs(s.p.light-(85-16-1/120*.65))<.001);
s=arena(branches.lamp.slice(0,2));s.enemies[0].x=260;s.enemies[1].x=370;C.step(s,1/120,{magic:true});tick(s,75);assert.equal(s.enemies[0].hp,954);assert.equal(s.enemies[1].hp,954,'piercing hits next target once');
s=arena(branches.lamp.slice(0,3));s.enemies[0].x=200;s.enemies[0].hp=40;s.p.light=25;C.step(s,1/120,{magic:true});tick(s,12);assert(s.p.light>48,'spell kill restores 24 and 16');
s=arena(branches.lamp);C.step(s,1/120,{magic:true});assert.equal(s.orbs.length,2);assert(s.p.light>68&&s.p.light<70,'two spells cost one cast');
s=arena(['shadow1']);C.step(s,1/120,{dodge:true});assert.equal(s.p.dashCD,.65);assert.equal(s.p.inv,.35);
s=arena(branches.shadow.slice(0,2));s.p.catCD=0;C.step(s,1/120);assert.equal(s.enemies[0].hp,986,'cat actually attacks');tick(s,60);assert.equal(s.enemies[0].hp,986,'cat respects interval');
s=arena(branches.shadow.slice(0,3));s.p.hp=5;for(let i=0;i<3;i++){s.enemies[i].x=s.p.x+40;s.enemies[i].hp=1;}C.step(s,1/120,{attack:true});assert.equal(s.p.hp,6,'three kills heal once');
s=arena(branches.shadow);C.step(s,1/120,{jump:true});tick(s,25);C.step(s,1/120,{jump:true});assert(s.p.vy>550);const vy=s.p.vy;C.step(s,1/120,{jump:true});assert(s.p.vy<vy,'no third jump');tick(s,160);assert.equal(s.p.y,0);assert.equal(s.p.airJumpUsed,false);
// Experience is durable, unique per foe and unrelated to narrative sacrifice.
s=C.create();s.enemies[0].x=s.p.x+40;s.enemies[0].hp=1;C.step(s,1/120,{attack:true});assert.equal(s.progress.xp,25);const saved=C.makeSave(0,['mother'],null,s.progress),r=C.readSave(JSON.stringify(saved));s=C.create(r.chapter,r.memories,r.progress);s.enemies[0].x=s.p.x+40;s.enemies[0].hp=1;C.step(s,1/120,{attack:true});assert.equal(s.progress.xp,25,'retry does not duplicate xp');assert.deepEqual(s.memories,['mother']);
let old=C.readSave(JSON.stringify({version:1,chapter:2,memories:['brother'],ending:'home'}));assert.equal(old.chapter,2);assert.equal(old.ending,'home');assert.deepEqual(old.memories,['brother']);assert.equal(old.progress.xp,430);assert.equal(old.progress.earned.length,14);assert.equal(old.progress.skills.length,0);
let invalid=C.normalizeProgress({xp:30,skills:['blade4','blade2','blade1','lamp1','unknown'],earned:['0:0','bad','0:0']});assert.deepEqual(invalid.skills,['blade1']);assert.deepEqual(invalid.earned,['0:0']);
s=arena();let hp=s.p.hp;s.p.hp--;C.respec(s);assert.equal(s.p.hp,hp-1,'respec never heals');assert.equal(C.level({xp:810}),10);assert.equal(C.maxHP({xp:810}),10);
// Play both optional encounters with legitimate input and carry their rewards forward.
let progression=C.normalizeProgress({});
for(let ch=0;ch<2;ch++){
 let a=C.createTrial(ch,[],progression);
 for(let i=0;i<120*80&&a.status==='fight';i++){
  const e=a.enemies[0],p=a.p,input={};if(e.hp>0){const dx=e.x-p.x;input.axis=Math.abs(dx)>68?Math.sign(dx):0;input.attack=Math.abs(dx)<125;input.magic=Math.abs(dx)>140&&Math.abs(dx)<550&&p.light>=25;if(e.phase==='warn'&&e.timer<.18){if(e.pattern===2)input.jump=e.timer>.12;else if(e.pattern!==1)input.dodge=true;}if(a.orbs.some(o=>!o.ally&&Math.abs(o.x-p.x)<80))input.dodge=true;}else input.axis=1;C.step(a,1/120,input);
 }
 assert.equal(a.status,'clear',`trial ${ch} failed`);assert(a.progress.earned.includes('trial:'+ch));assert.equal(a.progress.xp,(ch+1)*100);progression=a.progress;
}
console.log('All 12 skill effects, prerequisites, refunds, save migration, unique XP and optional combat routes passed.');
