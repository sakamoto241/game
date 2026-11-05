/* Each expression is a complete portrait. Exactly one image is displayed. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TomoriPortraits=api;})(globalThis,function(){
'use strict';
const LABELS={neutral:'ふつう',smile:'笑顔',surprised:'驚き',troubled:'困り顔',serious:'真剣',laugh:'笑い'};
function expressionAt(line,visible=Infinity){const fallback=Object.hasOwn(LABELS,line?.expression)?line.expression:'neutral';const cue=line?.reaction;if(!cue||typeof cue.at!=='string'||!Object.hasOwn(LABELS,cue.expression))return fallback;const start=(line.text||'').indexOf(cue.at);return start>=0&&visible>=start+cue.at.length?cue.expression:fallback;}
class View {
 constructor(base,registry){this.base=base;this.registry=registry;this.sequence=0;this.cache=new Map();this.current=null;}
 load(src){
  if(!this.cache.has(src))this.cache.set(src,new Promise(resolve=>{
   const image=new Image();
   image.onload=async()=>{try{await image.decode();}catch{}resolve(image);};
   image.onerror=()=>resolve(null);image.src=src;
  }));
  return this.cache.get(src);
 }
 texture(character,expression){
  const meta=this.registry[character];
  const path=meta?.frames?.[expression]||(character==='hugo'&&expression==='laugh'?'assets/hugo-laugh-portrait.webp':meta?.neutral||`assets/${character}-normal-portrait.webp`);
  return path+'?v='+encodeURIComponent(meta?.revision||'portraits-v8');
 }
 preload(character,expression){return this.load(this.texture(character,expression));}
 async show(character,expression,name){
  expression=Object.hasOwn(LABELS,expression)?expression:'neutral';
  const key=character+':'+expression;
  if(this.current===key)return;
  const sequence=++this.sequence;this.current=key;
  if(this.base.dataset.character!==character)this.base.hidden=true;
  let actual=expression,src=this.texture(character,expression),image=await this.load(src);
  if(!image&&expression!=='neutral'){actual='neutral';src=this.texture(character,actual);image=await this.load(src);}
  if(sequence!==this.sequence)return;
  if(!image){this.base.hidden=true;this.current=null;return;}
  this.base.src=src;
  this.base.dataset.character=character;this.base.dataset.expression=actual;
  this.base.alt=`${name}（${this.registry[character]?.labels?.[actual]||LABELS[actual]}）`;
  this.base.hidden=false;
 }
 hide(){this.sequence++;this.current=null;this.base.hidden=true;}
}
return {LABELS,expressionAt,View};
});
