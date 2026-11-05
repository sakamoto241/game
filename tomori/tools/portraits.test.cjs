const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {expressionAt,LABELS}=require('../portraits.js');
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
  assert.ok(meta.headHeight<meta.height&&meta.width>0);
  for(const variant of [...meta.variants,'mask'])assert.ok(fs.statSync(path.join(__dirname,'../assets/expressions',`${id}-${variant}.webp`)).size>1000);
 }
});

test('Ash loses his boastful grin when he realizes he disclosed the reward',()=>{
 const line=D.STORIES.barter.find(line=>line.who==='ash');
 const at=line.text.indexOf(line.reaction.at)+line.reaction.at.length;
 assert.equal(expressionAt(line,at-1),'smile');
 assert.equal(expressionAt(line,at),'troubled');
 assert.equal(expressionAt(line),'troubled');
});
