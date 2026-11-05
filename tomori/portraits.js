/* Registered face layers over the same original body. No facial morphing. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TomoriPortraits=api;})(globalThis,function(){
'use strict';
const LABELS={neutral:'ふつう',smile:'笑顔',surprised:'驚き',troubled:'困り顔',serious:'真剣',laugh:'笑い'};
function expressionAt(line,visible=Infinity){const fallback=Object.hasOwn(LABELS,line?.expression)?line.expression:'neutral';const cue=line?.reaction;if(!cue||typeof cue.at!=='string'||!Object.hasOwn(LABELS,cue.expression))return fallback;const start=(line.text||'').indexOf(cue.at);return start>=0&&visible>=start+cue.at.length?cue.expression:fallback;}
class View{
 constructor(base,layer,stage,registry){this.base=base;this.layer=layer;this.face=layer.querySelector('img');this.stage=stage;this.registry=registry;this.sequence=0;this.cache=new Map();this.current=null;this.observer=new ResizeObserver(()=>this.sync());this.observer.observe(base);this.observer.observe(stage);base.addEventListener('load',()=>this.sync());window.addEventListener('resize',()=>this.sync());}
 load(src){if(!this.cache.has(src))this.cache.set(src,new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src;}));return this.cache.get(src);}
 preload(character,expression){const meta=this.registry[character],pose=character==='hugo'&&expression==='laugh'?'laugh':'normal';const files=[`assets/${character}-${pose}-portrait.webp`];if(meta?.variants.includes(expression))files.push(`assets/expressions/${character}-${expression}.webp`,`assets/expressions/${character}-mask.webp`);return Promise.all(files.map(src=>this.load(src)));}
 show(character,expression,name){expression=Object.hasOwn(LABELS,expression)?expression:'neutral';const registration=this.registry[character];const fullPose=character==='hugo'&&expression==='laugh';const baseSrc=`assets/${character}-${fullPose?'laugh':'normal'}-portrait.webp`;const patch=registration?.variants.includes(expression)?`assets/expressions/${character}-${expression}.webp`:null;const key=character+':'+expression;
 if(this.current?.key===key){this.sync();return;}const sequence=++this.sequence;this.current={key,character,expression,registration,patch};if(this.base.dataset.character!==character||fullPose)this.layer.hidden=true;
 Promise.all([this.load(baseSrc),patch?this.load(patch):null,patch?this.load(`assets/expressions/${character}-mask.webp`):null]).then(([body,head,mask])=>{if(sequence!==this.sequence)return;if(!body){this.layer.hidden=true;return;}if(!this.base.getAttribute('src')?.endsWith(baseSrc))this.base.src=baseSrc;this.base.alt=`${name}（${LABELS[expression]}）`;this.base.dataset.character=character;this.base.dataset.expression=expression;
  if(head&&mask){this.face.src=patch;const image=`url("assets/expressions/${character}-mask.webp")`;this.face.style.maskImage=image;this.face.style.webkitMaskImage=image;this.layer.dataset.expression=expression;this.layer.hidden=false;}else this.layer.hidden=true;
  requestAnimationFrame(()=>{if(sequence===this.sequence)this.sync();});
 });}
 sync(){if(!this.current?.patch||this.layer.hidden||!this.base.complete||!this.base.naturalWidth)return;const r=this.base.getBoundingClientRect(),s=this.stage.getBoundingClientRect();if(r.width<=0||r.height<=0)return;const scale=Math.min(r.width/this.base.naturalWidth,r.height/this.base.naturalHeight);const width=this.base.naturalWidth*scale,height=this.base.naturalHeight*scale;this.layer.style.left=(r.left-s.left+(r.width-width)/2)+'px';this.layer.style.top=(r.top-s.top+r.height-height)+'px';this.layer.style.width=width+'px';this.layer.style.height=(this.current.registration.headHeight*scale)+'px';}
 hide(){this.sequence++;this.current=null;this.layer.hidden=true;}
}
return{LABELS,expressionAt,View};
});
