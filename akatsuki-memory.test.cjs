// Burning memories: each is single-use and permanent, with its own effect, and can save Emma from death.
const assert=require('assert'),C=require('./akatsuki-core.js'),dt=1/120;
const run=(s,sec,input={})=>{for(let i=0;i<Math.round(sec/dt);i++)C.step(s,dt,i?{}:input);};
const near=(ch=0,boss=false)=>{const s=C.create(ch,[],null);if(boss){s.enemies=s.enemies.slice(0,1);}else{s.enemies=[s.enemies[0]];s.enemies[0].kind='undead';s.enemies[0].y=0;}s.p.x=s.enemies[0].x-60;return s;};
assert.strictEqual(C.combatMemories.length,8);
let s=near();assert.strictEqual(C.burnable(s).length,8);
s.p.hp=1;assert(C.burn(s,'bread'));assert.strictEqual(s.p.hp,s.p.maxHp,'bread heals fully');assert(s.p.inv>=3);assert(!C.burn(s,'bread'),'a memory burns only once');assert.strictEqual(C.burnable(s).length,7);
// lullaby slows enemies
const moved=slow=>{const t=near();t.enemies[0].x=t.p.x+400;t.enemies[0].timer=99;if(slow)C.burn(t,'song');const x0=t.enemies[0].x;run(t,1);return x0-t.enemies[0].x;};
assert(moved(true)<moved(false)*.4,'enemies crawl during the lullaby');
// cat frenzy deals repeated damage, then the cat is gone even with the cat skill
s=near();s.enemies[0].hp=s.enemies[0].max=999;s.enemies[0].timer=99;C.burn(s,'cat');run(s,3);assert(s.enemies[0].hp<=999-22*8,'shadow beast keeps clawing');
s=near();s.progress.xp=630;s.progress.skills=['shadow1','shadow2'];s.memories.push('cat');s.enemies[0].hp=s.enemies[0].max=999;s.enemies[0].timer=99;run(s,5);assert.strictEqual(s.enemies[0].hp,999,'no cat attacks once its name is burned');
// lantern burns everything nearby; bosses lose a fifth
s=near();C.burn(s,'lantern');assert.strictEqual(s.enemies[0].hp,0,'undead (90 HP) is consumed by 120 fire');
s=near(2,true);const boss=s.enemies[0];C.burn(s,'lantern');assert.strictEqual(boss.hp,boss.max-Math.round(boss.max*.2));
// own name: triple damage and free spells
s=near();s.enemies[0].hp=s.enemies[0].max=999;s.enemies[0].timer=99;C.burn(s,'self');run(s,dt,{attackPress:true,attack:true});assert.strictEqual(999-s.enemies[0].hp,54,'18 x3');
const light=s.p.light;run(s,dt,{magicPress:true});assert.strictEqual(s.p.light,light,'spells cost nothing');
// last stand
s=near();s.lastStand=true;s.p.hp=1;s.p.inv=0;s.enemies[0].phase='warn';s.enemies[0].timer=dt;s.enemies[0].pattern=0;s.enemies[0].aim=s.p.x;run(s,.1);
assert.strictEqual(s.status,'dying','a fatal hit asks whether to burn something');run(s,1);assert.strictEqual(s.status,'dying','time stops while choosing');
assert(C.burn(s,'song'));assert.strictEqual(s.status,'fight');assert(s.p.hp>=Math.ceil(s.p.maxHp/2));
s=near();s.lastStand=true;s.p.hp=0;s.status='dying';C.giveUp(s);assert.strictEqual(s.status,'lost','declining ends the attempt');
s=near();s.p.hp=1;s.p.inv=0;s.enemies[0].phase='warn';s.enemies[0].timer=dt;s.enemies[0].pattern=0;s.enemies[0].aim=s.p.x;run(s,.1);assert.strictEqual(s.status,'lost','without lastStand death is immediate (tests, old flow)');
s=near();s.lastStand=true;for(const m of C.combatMemories)s.memories.push(m.id);s.p.hp=1;s.p.inv=0;s.enemies[0].phase='warn';s.enemies[0].timer=dt;s.enemies[0].pattern=0;s.enemies[0].aim=s.p.x;run(s,.1);assert.strictEqual(s.status,'lost','nothing left to burn');
// saves keep burned memories and drop unknown ones
const save=C.readSave(JSON.stringify(C.makeSave(1,['mother','bread','self','nonsense'],null,null)));assert.deepStrictEqual(save.memories,['mother','bread','self']);
// fear: cannot fall, and hits harder
s=near();s.p.hp=1;s.p.inv=0;C.burn(s,'fear');s.p.inv=0;s.enemies[0].phase='warn';s.enemies[0].timer=dt;s.enemies[0].pattern=0;s.enemies[0].aim=s.p.x;run(s,.1);assert.strictEqual(s.status,'fight');assert.strictEqual(s.p.hp,1,'fear keeps Emma standing');
s=near();s.enemies[0].hp=s.enemies[0].max=999;s.enemies[0].timer=99;C.burn(s,'fear');run(s,dt,{attackPress:true,attack:true});assert.strictEqual(999-s.enemies[0].hp,27,'18 x1.5');
// grief: spells without cooldown or cost
s=near();s.enemies[0].timer=99;s.enemies[0].x+=900;C.burn(s,'grief');for(let i=0;i<5;i++)run(s,.13,{magicPress:true});assert(s.stats.spells>=5,'spell after spell');assert.strictEqual(Math.round(s.p.light),100);
// wish: burns everything visible, bosses lose 35%
s=C.create(1,[],null);s.enemies.forEach(e=>{e.x=s.p.x+300;e.hp=e.max=200;});C.burn(s,'wish');assert(s.enemies.every(e=>e.hp===0),'every enemy in sight burns');
s=near(2,true);C.burn(s,'wish');assert.strictEqual(s.enemies[0].hp,s.enemies[0].max-Math.round(s.enemies[0].max*.35));
// hollow once everything is burned
s=near();for(const k of C.combatMemories.slice(0,-1))C.burn(s,k.id);assert(!C.hollow(s));C.burn(s,C.combatMemories.at(-1).id);assert(C.hollow(s),'nothing left: hollow');
assert.strictEqual(C.readSave(JSON.stringify({...C.makeSave(2,['fear','wish']),ending:'ash'})).ending,'ash');
console.log('All 8 burnable memories, single use, effects, hollow state, last stand and save round-trip passed.');
