import test from 'node:test';
import assert from 'node:assert/strict';
import {Controller} from '../src/core/controller.ts';
import {AREAS} from '../src/content/areas.ts';
import {DIALOGUES} from '../src/content/dialogues.ts';
import {buildGrid,center,findPath,nearest} from '../src/core/pathfinding.ts';
import {BACKUP_KEY,RECOVERY_KEY,SAVE_KEY,SETTINGS_KEY,SaveService,freshState,validateSave} from '../src/core/state.ts';
class Memory {data=new Map<string,string>();getItem(k:string){return this.data.get(k)??null;}setItem(k:string,v:string){this.data.set(k,v);}}
function finish(c:Controller){let guard=0;while(c.dialogue&&guard++<50){const d=c.dialogue,at=c.state.activeDialogue!;if(d.choices&&at.index===d.lines.length-1)c.choose(d.choices[0].next);else c.nextLine();}assert(guard<50);}

test('both authored maps have reachable spawns, interaction approaches and corner-safe routes',()=>{
 for(const area of Object.values(AREAS)){
  const grid=buildGrid(area),start=center(grid,nearest(grid,area.spawn));
  for(const h of area.hotspots){const path=findPath(grid,start,h.approach);assert(path&&path.length>0,area.id+': '+h.id);for(const p of path)assert(grid.walk[nearest(grid,p)]);assert(Math.hypot(path.at(-1)!.x-h.approach.x,path.at(-1)!.y-h.approach.y)<30);}
 }
 const grid={cols:2,rows:2,cw:20,ch:20,walk:[true,false,false,true]};assert.equal(findPath(grid,{x:10,y:10},{x:30,y:30}),null,'diagonals may not pass through two touching obstacles');
 const empty={...grid,walk:[false,false,false,false]};assert.equal(findPath(empty,{x:0,y:0},{x:30,y:30}),null);
});

test('actual opening route: conversation choice gates the clearing; return route and new objectives work',()=>{
 const storage=new Memory();storage.setItem('akatsuki-lantern-v1','untouched');storage.setItem('yofuke-witch-inn-v1','also-untouched');const c=new Controller(storage);assert.equal(c.hasSave,false);c.startNew();assert.equal(c.dialogue?.id,'opening');finish(c);
 assert.equal(c.enterArea('clearing'),false);assert.equal(c.dialogue?.id,'gate-blocked');finish(c);c.interact('rabbit');c.choose('rabbit-song');assert.equal(c.dialogue?.id,'rabbit','choices cannot jump over unread lines');finish(c);assert(c.state.flags.metRabbit);assert.match(c.objective,/広場/);
 assert(c.enterArea('clearing'));assert.equal(c.state.area,'clearing');assert(c.state.flags.arrivedClearing);c.interact('acorn');finish(c);assert(c.state.flags.metAcorn);assert.match(c.objective,/違和感/);assert(c.enterArea('forest'));assert.equal(storage.getItem('akatsuki-lantern-v1'),'untouched');assert.equal(storage.getItem('yofuke-witch-inn-v1'),'also-untouched');
 const loaded=new Controller(storage);assert(loaded.state.flags.metAcorn);assert(loaded.state.flags.metRabbit);assert.equal(loaded.state.area,'forest');
});

test('both rabbit choices complete the same reachable introductory objective',()=>{
 for(const choice of ['rabbit-home','rabbit-song']){const c=new Controller(new Memory());c.interact('rabbit');while(c.state.activeDialogue!.index<c.dialogue!.lines.length-1)c.nextLine();c.choose(choice);finish(c);assert(c.state.flags.metRabbit);assert(c.enterArea('clearing'));}
});

test('leaf can be collected once, selected, used on the book, and survives partial dialogue reload',()=>{
 const mem=new Memory();const c=new Controller(mem);c.interact('leaf');assert.deepEqual(c.state.inventory,['leaf']);finish(c);c.interact('leaf');finish(c);assert.deepEqual(c.state.inventory,['leaf']);c.selectLeaf();c.interact('sign');assert.equal(c.dialogue?.id,'wrong-item');finish(c);assert.deepEqual(c.state.inventory,['leaf']);
 c.interact('book');assert.equal(c.dialogue?.id,'bookmark');c.nextLine();const resumed=new Controller(mem);assert.equal(resumed.dialogue?.id,'bookmark');assert.equal(resumed.state.activeDialogue?.index,1);finish(resumed);assert(resumed.state.flags.bookmark);assert.deepEqual(resumed.state.inventory,[]);resumed.interact('leaf');finish(resumed);assert.deepEqual(resumed.state.inventory,[]);assert(validateSave(mem.getItem(SAVE_KEY))?.flags.bookmark);
});

test('conditional investigation, seen-only skipping and foreign-area objects cannot mutate progress',()=>{
 const c=new Controller(new Memory());c.interact('acorn');assert.equal(c.dialogue,null);c.interact('sign');c.skipSeen();assert(c.dialogue,'unread text is not skipped');finish(c);c.interact('sign');assert.equal(c.dialogue?.id,'sign-again');finish(c);c.interact('sign');c.skipSeen();assert.equal(c.dialogue,null);assert.equal(c.state.flags.signReads,3);
 c.state.flags.metRabbit=true;c.enterArea('clearing');c.interact('chair');finish(c);c.interact('chair');assert.equal(c.dialogue?.id,'chair-again');
});

test('corrupt/unknown saves recover safely and older layouts migrate; raw state is not erased by load',()=>{
 assert.equal(validateSave('{'),null);assert.equal(validateSave('{"version":99}'),null);assert.equal(validateSave({...freshState(),position:{x:Infinity,y:0}}),null);
 const old=validateSave({version:0,area:'forest',player:{x:200,y:700},metRabbit:true,items:['leaf','unknown']});assert(old?.flags.metRabbit);assert.deepEqual(old?.inventory,['leaf']);
 const mem=new Memory();const service=new SaveService(mem);const state=freshState();service.save(state);state.flags.metRabbit=true;service.save(state);mem.setItem(SAVE_KEY,'{broken');const raw=mem.getItem(SAVE_KEY),recovered=new SaveService(mem);assert(recovered.load());assert.match(recovered.message,/前の記録/);assert.equal(mem.getItem(SAVE_KEY),raw);recovered.archive();assert.equal(mem.getItem(RECOVERY_KEY),raw);assert(mem.getItem(BACKUP_KEY));
 const invalidCursor=validateSave({...freshState(),activeDialogue:{id:'not-a-story',index:999},seen:['not-a-story','opening']});assert.equal(invalidCursor?.activeDialogue,null);assert.deepEqual(invalidCursor?.seen,['opening']);
 const throwing={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('full');}};const c=new Controller(throwing);c.startNew();finish(c);c.interact('rabbit');finish(c);assert(c.state.flags.metRabbit,'storage failure does not block play');
});

test('settings and transient dialogue state use their own validated keys',()=>{
 const mem=new Memory(),c=new Controller(mem);c.updateSettings({textSpeed:'instant',music:true,volume:.4,reduceMotion:true});assert(mem.getItem(SETTINGS_KEY));assert.equal(mem.getItem(SAVE_KEY),null);const d=new Controller(mem);assert.equal(d.settings.textSpeed,'instant');assert.equal(d.settings.volume,.4);assert(d.settings.music);
 for(const [id,dialogue] of Object.entries(DIALOGUES)){assert.equal(dialogue.id,id);assert(dialogue.lines.length>0);for(const choice of dialogue.choices??[])assert(Object.hasOwn(DIALOGUES,choice.next));}
});
