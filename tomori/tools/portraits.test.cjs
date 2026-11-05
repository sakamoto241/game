const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {expressionAt,LABELS,View}=require('../portraits.js');
const registry=require('../expressions.js');
const D=require('../data.js');

test('a reaction changes expression when its word has actually appeared',()=>{
 const line=D.STORIES.intro[7];
 const at=line.text.indexOf(line.reaction.at)+line.reaction.at.length;
 assert.equal(expressionAt(line,0),'serious');
 assert.equal(expressionAt(line,at-1),'serious');
 assert.equal(expressionAt(line,at),'surprised');
 assert.equal(expressionAt(line),'surprised');
});
test('bad or missing reaction cues retain a safe expression',()=>{
 assert.equal(expressionAt({text:'hello',expression:'smile',reaction:{at:'missing',expression:'surprised'}}),'smile');
 assert.equal(expressionAt({text:'hello',expression:'smile',reaction:{at:'hello',expression:'unknown'}}),'smile');
 assert.equal(expressionAt({expression:'unknown'}),'neutral');
 assert.equal(expressionAt(null),'neutral');
});
test('every dialogue cue has a registered asset or an intentional original pose',()=>{
 for(const [id,lines] of Object.entries(D.STORIES))for(const [i,line] of lines.entries()){
  assert.ok(Object.hasOwn(LABELS,line.expression),`${id}:${i} expression`);
  assert.ok(registry[line.who],`${id}:${i} speaker`);
  if(line.reaction){assert.ok(line.text.includes(line.reaction.at));assert.ok(registry[line.who].variants.includes(line.reaction.expression));}
  const exp=line.expression;
  if(exp==='neutral'||line.who==='hugo'&&exp==='laugh')continue;
  assert.ok(registry[line.who].variants.includes(exp),`${id}:${i} registered`);
 }
 for(const [id,meta] of Object.entries(registry)){
  assert.ok(meta.height>=900&&meta.width>0);
  for(const variant of meta.variants){assert.ok(meta.frames[variant].endsWith('-portrait.webp'));assert.ok(fs.statSync(path.join(__dirname,'..',meta.frames[variant])).size>1000);}
 }
});

test('Ash loses his boastful grin when he realizes he disclosed the reward',()=>{
 const line=D.STORIES.barter.find(line=>line.who==='ash');
 const at=line.text.indexOf(line.reaction.at)+line.reaction.at.length;
 assert.equal(expressionAt(line,at-1),'smile');
 assert.equal(expressionAt(line,at),'troubled');
 assert.equal(expressionAt(line),'troubled');
});

function fakeImage(){return {dataset:{},hidden:true,src:'',alt:''};}
test('a late portrait load cannot replace the next character',async()=>{
 const base=fakeImage(),view=new View(base,registry);let finish;
 view.load=src=>src.includes('finn-serious')?new Promise(r=>finish=r):Promise.resolve({});
 const first=view.show('finn','serious','フィン');
 await view.show('noa','smile','ノア');
 finish({});await first;
 assert.equal(base.dataset.character,'noa');assert.equal(base.dataset.expression,'smile');
 assert.ok(base.src.includes('noa-smile-portrait.webp'));assert.equal(base.hidden,false);
});
test('an unavailable expression falls back to one complete neutral portrait',async()=>{
 const base=fakeImage(),view=new View(base,registry);
 view.load=async src=>src.includes('finn-surprised')?null:{};
 await view.show('finn','surprised','フィン');
 assert.equal(base.dataset.expression,'neutral');assert.ok(base.src.includes('finn-normal-portrait.webp'));
 assert.equal(base.hidden,false);
});
test('leaving dialogue cancels a pending portrait and the same expression can be reopened',async()=>{
 const base=fakeImage(),view=new View(base,registry);let finish;
 view.load=()=>new Promise(r=>finish=r);
 const pending=view.show('finn','serious','フィン');view.hide();finish({});await pending;
 assert.equal(base.hidden,true);assert.equal(base.src,'');
 view.load=async()=>({});await view.show('finn','serious','フィン');
 assert.equal(base.hidden,false);assert.ok(base.src.includes('finn-serious-portrait.webp'));
});
