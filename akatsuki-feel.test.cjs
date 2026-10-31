// Input buffering: slightly early presses are honoured, early-by-much presses are dropped.
const assert=require('assert'),C=require('./akatsuki-core.js'),dt=1/120;
const fresh=()=>{const s=C.create(0,[],null);s.enemies=[];return s;};
const run=(s,sec,input={})=>{for(let i=0;i<Math.round(sec/dt);i++)C.step(s,dt,i?{axis:input.axis,attack:input.attack,magic:input.magic}:input);};
let s=fresh();run(s,dt,{jump:true});run(s,.64);assert(s.p.y>0&&s.p.vy<0,'still falling before landing');
run(s,dt,{jump:true});run(s,.2);assert(s.p.y>0,'jump pressed 0.1s before landing fires on landing');
s=fresh();run(s,dt,{jump:true});run(s,.4);run(s,dt,{jump:true});run(s,.6);assert.strictEqual(s.p.y,0,'jump pressed 0.33s before landing is dropped (no double jump)');
s=fresh();run(s,dt,{dodge:true});assert.strictEqual(s.stats.dodges,1);run(s,.74);run(s,dt,{dodge:true});run(s,.15);assert.strictEqual(s.stats.dodges,2,'dodge pressed 0.1s before cooldown ends fires');
s=fresh();run(s,dt,{dodge:true});run(s,.3);run(s,dt,{dodge:true});run(s,.6);assert.strictEqual(s.stats.dodges,1,'dodge pressed 0.55s early is dropped');
s=fresh();run(s,dt,{attackPress:true});assert.strictEqual(s.p.combo,1);run(s,.2);run(s,dt,{attackPress:true});run(s,.15);assert.strictEqual(s.p.combo,2,'attack tapped during recovery fires after it');
s=fresh();run(s,1.2,{attack:true});assert(s.p.combo>=1,'holding attack still repeats');
s=fresh();run(s,dt,{magicPress:true});const light=s.p.light;run(s,.7);run(s,dt,{magicPress:true});run(s,.2);assert(s.p.light<light-1,'spell tapped during cooldown casts after it');
s=fresh();s.p.light=12;run(s,dt,{magicPress:true});run(s,.3);assert.strictEqual(s.stats.spells,0,'no cast without light');
s=fresh();for(let i=0;i<3;i++){run(s,dt,{attackPress:true});run(s,.2);}run(s,.5);assert.strictEqual(s.p.combo,3,'three taps 0.2s apart give all three swings');
console.log('Jump, dodge, attack and spell buffering (jump/dodge 0.15s, attack 0.3s, spell 0.2s) and early-press rejection passed.');
