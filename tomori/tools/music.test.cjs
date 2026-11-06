const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../music.js');
test('pitch notation handles accidentals and rejects malformed notes',()=>{
 assert.equal(M.midi('A4'),69);assert.equal(M.midi('C4'),60);
 assert.equal(M.midi('Bb3'),58);assert.equal(M.midi('G#4'),68);
 assert.equal(M.hz('A4'),440);assert.throws(()=>M.hz('H5'));
});
test('all scores have valid harmony, bounded notes and a non-overlapping lead',()=>{
 for(const [name,track] of Object.entries(M.TRACKS)){
  for(const entry of track.chords)for(const chord of [entry].flat()){
   assert.ok(M.CHORDS[chord],name+': '+chord);
   assert.ok(M.CHORDS[chord].every(note=>Number.isFinite(M.hz(note))));
  }
  for(const [i,note] of track.notes.entries()){
   assert.ok(note.step>=0&&note.length>0&&note.step+note.length<=track.length,name+': note outside loop');
   assert.ok(Number.isFinite(note.frequency)&&note.frequency>0);
   assert.ok(track.byStep[note.step].includes(note));
   if(i)assert.ok(track.notes[i-1].step+track.notes[i-1].length<=note.step,name+': unintended lead overlap');
  }
 }
});
test('answer phrases extend each short loop instead of copying the opening',()=>{
 for(const [name,track] of Object.entries(M.TRACKS)){
  const opening=track.notes.filter(n=>n.step<64).map(n=>[n.step,n.note,n.length]);
  const answer=track.notes.filter(n=>n.step>=64).map(n=>[n.step-64,n.note,n.length]);
  assert.ok(opening.length&&answer.length);assert.notDeepEqual(answer,opening,name+': duplicated phrase');
  assert.ok(track.length*60/track.bpm/2>=25,name+': loop too short');
 }
 assert.ok(M.TRACKS.shop.bpm<M.TRACKS.battle.bpm&&M.TRACKS.battle.bpm<M.TRACKS.boss.bpm);
});
