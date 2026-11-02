const test=require('node:test'),assert=require('node:assert/strict'),C=require('./capball-core.js');
const out=s=>C.applyResult(s,{type:'out'}),hit=(s,type='single')=>C.applyResult(s,{type,distance:177});
function seeded(n){return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
test('three strikes, four balls, and two-strike fouls obey baseball counts',()=>{
 const s=C.newGame();for(let i=0;i<2;i++)C.applyResult(s,{type:'strike'});for(let i=0;i<6;i++)C.applyResult(s,{type:'foul'});assert.equal(s.strikes,2);assert.equal(s.outs,0);const k=C.applyResult(s,{type:'strike'});assert(k.strikeout);assert.equal(s.outs,1);assert.equal(s.strikes,0);
 for(let i=0;i<4;i++)C.applyResult(s,{type:'ball'});assert.deepEqual(s.bases,[true,false,false]);assert.equal(s.balls,0);assert.equal(s.outs,1);
});
test('walks force only occupied consecutive bases, and a bases-loaded walk scores exactly one',()=>{
 const s=C.newGame();s.bases=[false,true,true];for(let i=0;i<4;i++)C.applyResult(s,{type:'ball'});assert.deepEqual(s.bases,[true,true,true]);assert.equal(s.score[0],0);for(let i=0;i<4;i++)C.applyResult(s,{type:'ball'});assert.equal(s.score[0],1);assert.equal(s.history[0][0],1);assert(s.bases.every(Boolean));
});
test('hits advance runners, homer clears the bases, and stats apply to the player only',()=>{
 const s=C.newGame();hit(s);hit(s);assert.deepEqual(s.bases,[true,true,false]);const r=hit(s,'double');assert.equal(r.runs,1);assert.deepEqual(s.bases,[false,true,true]);const hr=hit(s,'homer');assert.equal(hr.runs,3);assert.equal(s.score[0],4);assert.deepEqual(s.bases,[false,false,false]);assert.equal(s.stats.hits,4);assert.equal(s.stats.homers,1);for(let i=0;i<3;i++)out(s);hit(s,'homer');assert.equal(s.stats.homers,1);assert.equal(s.score[1],1);
});
test('three outs change sides, lead skips an unnecessary bottom, walk-off ends immediately',()=>{
 const s=C.newGame();for(let i=0;i<3;i++)out(s);assert.equal(s.half,1);assert.equal(s.outs,0);assert(!s.over);hit(s,'homer');assert(s.over);assert.equal(s.score[1],1);
 const t=C.newGame(3);t.inning=3;t.history=[[0,0,0],[0,2,0]];t.score=[0,2];for(let i=0;i<3;i++)out(t);assert(t.over);assert.equal(t.half,0);assert(C.readSave(t));
});
test('tied matches get one extra inning only, three-inning mode and practice remain valid',()=>{
 for(const innings of [1,3]){const s=C.newGame(innings);let halves=0;while(!s.over&&halves<20){for(let i=0;i<3;i++)out(s);halves++;assert(C.readSave(s));}assert(s.over);assert.equal(s.inning,innings+1);assert.equal(halves,(innings+1)*2);}
 const p=C.newGame(1,true);for(let i=0;i<90;i++)out(p);assert(!p.over);assert.equal(p.half,0);hit(p,'homer');assert.equal(p.stats.practiceHits,1);
});
test('contact needs both timing and aim; a centered perfect swing can homer; curves actually bend',()=>{
 const p=C.makePitch({target:.4,spin:1,power:.7},()=>.5);assert(Math.abs(C.pitchX(p,1)-.4)<1e-10);assert(C.pitchX(p,.5)>.6);
 assert.equal(C.swing(p,.5,.4,()=>.5).type,'strike');assert.equal(C.swing(p,1,-1,()=>.5).type,'strike');assert.equal(C.swing(p,1,.4,()=>.5).type,'homer');assert.equal(C.swing(p,1-.14/p.duration,.4,()=>.5).type,'foul');
 assert(C.makePitch({power:1},()=>.5).duration<C.makePitch({power:0},()=>.5).duration);
});
test('CPU respects obvious balls and remembers repeated pitches, saves reject impossible records',()=>{
 const p=C.makePitch({target:1.4},()=>.5);assert.equal(C.cpuAtBat(p,[],()=>.5).type,'ball');const s=C.newGame();for(let i=0;i<9;i++)C.rememberPitch(s,p);assert.equal(s.pitchMemory.length,4);assert.equal(s.stats.pitches,9);assert(C.readSave(JSON.stringify(s)));
 for(const d of [null,'bad','{}',{...s,outs:3},{...s,version:99},{...s,inning:99},{...s,bases:['yes',false,false]},{...s,score:[8,0]},{...s,history:[[null],[0]]}])assert.equal(C.readSave(d),null);
});
test('seeded full matches preserve scoring, runners, finite progress and save round trips after every play',()=>{
 for(let n=1;n<=80;n++){const rng=seeded(n),s=C.newGame(n%2?1:3);let turns=0;while(!s.over&&turns++<700){const t=rng();const r=t<.12?{type:'ball'}:t<.44?{type:'strike'}:t<.49?{type:'foul'}:t<.69?{type:'out'}:C.resolveContact(rng(),rng()*2-1,rng);C.applyResult(s,r);assert(C.readSave(JSON.stringify(s)),`seed ${n}, turn ${turns}`);}assert(s.over,`seed ${n} must end`);assert.equal(s.score[0],s.history[0].reduce((a,b)=>a+b,0));}
});
