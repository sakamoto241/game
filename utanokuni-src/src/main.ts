import './ui/styles.css';
import {Controller} from './core/controller.ts';
import type {AreaId,Settings} from './core/types.ts';
import {AREAS} from './content/areas.ts';
import {NAMES} from './content/dialogues.ts';
import {AudioManager} from './ui/audio.ts';
import type {EngineApi} from './engine/create-game.ts';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let storage:Storage|null=null;try{storage=localStorage;}catch{}
const controller=new Controller(storage,matchMedia('(prefers-reduced-motion: reduce)').matches),audio=new AudioManager(controller);
const el=(tag:string,cls='',text?:string)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
let engine:EngineApi|null=null,enginePromise:Promise<EngineApi>|null=null,playing=false,ready=false,loading=false,bookPage='map',toastTimer=0,lastLine='',lastSpeed='',typingTimer=0,fullText='',displayed=0,dragged=false;
const dialogs=()=>Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]'));
function pauseUI():void{controller.uiPaused=!playing||loading||dialogs().length>0;}
function toast(message:string):void{const target=dialogs().at(-1)??document.body;target.append($('toast'));$('toast').textContent=message;$('toast').classList.add('show');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('toast').classList.remove('show'),4500);}
controller.messageListeners.add(toast);
function open(id:string):void{const d=$<HTMLDialogElement>(id);if(!d.open)d.showModal();pauseUI();}
function close(id:string):void{$<HTMLDialogElement>(id).close();pauseUI();}
for(const d of document.querySelectorAll<HTMLDialogElement>('dialog'))d.addEventListener('close',pauseUI);
for(const b of document.querySelectorAll<HTMLElement>('[data-close]'))b.onclick=()=>close(b.dataset.close!);
async function ensureEngine():Promise<EngineApi>{
 if(engine)return engine;if(enginePromise)return enginePromise;
 enginePromise=(async()=>{
  const fonts=document.fonts.load('400 18px UtaBook',Object.values(AREAS).flatMap(a=>a.hotspots.map(h=>h.label)).join('')).catch(()=>[]);
  void fonts.then(()=>engine?.refreshFonts());
  await Promise.race([fonts,new Promise(resolve=>setTimeout(resolve,1500))]);
  const {createGame}=await import('./engine/create-game.ts');engine=await createGame(controller,n=>$<HTMLProgressElement>('loading-progress').value=.15+n*.85);return engine;
 })();try{return await enginePromise;}catch(error){enginePromise=null;throw error;}
}
async function launch(fresh:boolean):Promise<void>{
 audio.unlock();for(const d of dialogs())d.close();playing=true;loading=true;ready=false;$('title').hidden=true;$('game').hidden=false;$('loading').hidden=false;$('loading-label').textContent='絵本をひらいています…';$<HTMLProgressElement>('loading-progress').value=.05;
 if(fresh)controller.startNew();pauseUI();
 try{await ensureEngine();if(!playing)return;engine?.refreshLayout();engine?.pause(document.hidden);ready=true;loading=false;$('loading').hidden=true;render();pauseUI();}
 catch{loading=false;$('loading-label').textContent='絵本を開けませんでした。タイトルから、もう一度お試しください。';toast('読み込みに失敗しました。記録は残っています。');}
}
function goTitle():void{for(const d of dialogs())d.close();window.clearTimeout(typingTimer);playing=false;loading=false;controller.persist();$('title').hidden=false;$('game').hidden=true;pauseUI();renderTitle();}
function renderTitle():void{$('continue-game').hidden=!controller.hasSave;const message=controller.saves.message;$('save-note').hidden=!message;$('save-note').textContent=message;}
$('new-game').onclick=()=>{audio.unlock();if(controller.hasSave||controller.saves.hasRaw)open('confirm-new');else void launch(true);};
$('confirm-start').onclick=()=>void launch(true);$('continue-game').onclick=()=>void launch(false);$('back-title').onclick=goTitle;$('loading-back').onclick=goTitle;
function render():void{
 renderTitle();const s=controller.state;$('area-name').textContent=AREAS[s.area].name;$('objective').textContent=controller.objective;
 $('item-count').hidden=!s.inventory.length;$('item-count').textContent=String(s.inventory.length);$('inventory-button').classList.toggle('active',!!controller.selectedItem);$('selection-note').hidden=!controller.selectedItem;
 const setting=controller.settings;$<HTMLInputElement>('setting-music').checked=setting.music;$<HTMLInputElement>('setting-volume').value=String(Math.round(setting.volume*100));$<HTMLSelectElement>('setting-speed').value=setting.textSpeed;$<HTMLInputElement>('setting-motion').checked=setting.reduceMotion;
 $('title-music').setAttribute('aria-pressed',String(setting.music&&!audio.blocked));$('title-music').setAttribute('aria-label',setting.music?(audio.blocked?'音楽を再試行':'音楽を消す'):'音楽を再生');audio.apply();
 if(playing&&ready)renderDialogue();if($<HTMLDialogElement>('storybook').open)renderBook();if($<HTMLDialogElement>('inventory').open)renderInventory();pauseUI();
}
controller.subscribe(render);
function portrait(speaker:keyof typeof NAMES,expression?:string):string{
 if(speaker==='book')return import.meta.env.BASE_URL+'assets/portrait-book.svg';
 const frame=speaker==='you'?'hero-idle':speaker==='rabbit'?(expression==='wave'?'rabbit-wave':'rabbit-idle'):speaker==='acorn'?(expression==='nervous'?'acorn-nervous':'acorn-idle'):'book';
 return import.meta.env.BASE_URL+'assets/portrait-'+frame+'.webp';
}
function controls():void{
 const d=controller.dialogue,c=controller.state.activeDialogue;if(!d||!c)return;const done=displayed>=fullText.length,last=c.index===d.lines.length-1,choices=last&&d.choices;
 $('next-line').hidden=!!choices&&done;$('dialogue-choices').hidden=!choices||!done;
 $('skip-seen').hidden=!controller.state.seen.includes(d.id);
 $('next-line').replaceChildren(document.createTextNode(done&&last?'この先へ':'次へ'),el('span','', '▽'));
}
function typeLine(text:string):void{
 window.clearTimeout(typingTimer);fullText=text;displayed=0;$('line').textContent='';const speed=controller.settings.reduceMotion||controller.settings.textSpeed==='instant'?0:controller.settings.textSpeed==='slow'?57:31;
 if(!speed){displayed=text.length;$('line').textContent=text;controls();return;}
 const tick=()=>{displayed=Math.min(text.length,displayed+1);$('line').textContent=text.slice(0,displayed);controls();if(displayed<text.length)typingTimer=window.setTimeout(tick,speed);};tick();
}
function renderDialogue():void{
 const d=controller.dialogue,c=controller.state.activeDialogue,modal=$<HTMLDialogElement>('conversation');
 if(!d||!c){if(modal.open)modal.close();lastLine='';window.clearTimeout(typingTimer);return;}
 const key=d.id+':'+c.index,setting=controller.settings.textSpeed+controller.settings.reduceMotion;
 if(lastLine!==key||lastSpeed!==setting){lastLine=key;lastSpeed=setting;const line=d.lines[c.index];$('speaker').textContent=NAMES[line.speaker];$('conversation-place').textContent=AREAS[controller.state.area].name;$('line-count').textContent=`${c.index+1} / ${d.lines.length}`;
  const img=$<HTMLImageElement>('portrait');img.src=portrait(line.speaker,line.expression);img.onerror=()=>{img.style.visibility='hidden';};img.onload=()=>img.style.visibility='visible';
  const choices=$('dialogue-choices');choices.replaceChildren();for(const choice of d.choices??[]){const b=el('button','',choice.label);b.onclick=()=>controller.choose(choice.next);choices.append(b);}typeLine(line.text);
 }
 if(!modal.open){modal.showModal();$('next-line').focus({preventScroll:true});}controls();
}
function advanceLine():void{if(displayed<fullText.length){window.clearTimeout(typingTimer);displayed=fullText.length;$('line').textContent=fullText;controls();}else controller.nextLine();}
$('next-line').onclick=advanceLine;$('conversation').addEventListener('click',e=>{const target=e.target as Element;if(!target.closest('button,a,input,select')&&!$<HTMLElement>('dialogue-choices').hidden)return;if(target.closest('button,a,input,select'))return;advanceLine();});
$('skip-seen').onclick=()=>controller.skipSeen();$('conversation').addEventListener('cancel',e=>e.preventDefault());
function renderInventory():void{
 const has=controller.state.inventory.includes('leaf'),slots=$('inventory-slots');slots.replaceChildren();$('inventory-empty').hidden=has;$('item-detail').hidden=!has;
 if(!has)return;const tile=el('button','item-tile'+(controller.selectedItem?' selected':''));tile.setAttribute('aria-label','大きな落ち葉を選ぶ');tile.setAttribute('aria-pressed',String(!!controller.selectedItem));const image=document.createElement('img');image.src=import.meta.env.BASE_URL+'assets/leaf.svg';image.alt='';image.draggable=false;tile.append(image,el('span','','大きな落ち葉'));tile.onclick=()=>{if(dragged){dragged=false;return;}controller.selectLeaf();};
 tile.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;const x=e.clientX,y=e.clientY,id=e.pointerId;let moving=false;
  const move=(event:PointerEvent)=>{if(event.pointerId!==id)return;if(!moving&&Math.hypot(event.clientX-x,event.clientY-y)>10){moving=true;dragged=true;controller.selectedItem='leaf';close('inventory');controller.notify();engine?.suppressPointer(60000);}
   if(moving){event.preventDefault();const ghost=$('drag-ghost');ghost.hidden=false;ghost.style.left=event.clientX+'px';ghost.style.top=event.clientY+'px';}
  };
  const finish=(event:PointerEvent)=>{if(event.pointerId!==id)return;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);$('drag-ghost').hidden=true;if(moving){engine?.suppressPointer(200);if(event.type==='pointercancel'||!engine?.useAt(event.clientX,event.clientY))toast('落ち葉を選びました。使いたい場所をタップしても使えます。');setTimeout(()=>dragged=false,250);}};
  window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
 });slots.append(tile);
}
$('inventory-button').onclick=()=>{renderInventory();open('inventory');};$('use-leaf').onclick=()=>{controller.selectedItem='leaf';close('inventory');controller.notify();toast('石の上の絵本をタップしてください。');};
function renderBook():void{
 const s=controller.state;$('book-objective').textContent=controller.objective;for(const b of document.querySelectorAll<HTMLElement>('[data-page]'))b.setAttribute('aria-selected',String(b.dataset.page===bookPage));for(const p of ['map','notes','nearby'])$('page-'+p).hidden=p!==bookPage;
 for(const id of ['forest','clearing'] as AreaId[]){const b=$<HTMLButtonElement>('map-'+id),current=s.area===id,locked=id==='clearing'&&!s.flags.metRabbit;b.classList.toggle('current',current);b.disabled=current||locked;b.querySelector('small')!.textContent=current?'いま、ここにいる':locked?'ウタウサギの話を聞くと…':'道へ向かう';}
 const notes=$('notes'),lines:string[]=[];if(s.flags.metRabbit)lines.push('この国には、うたの代わりに「いつもどおり」だけが残っている。');if(s.flags.metAcorn)lines.push('どんぐりは、まだ落ちていないのに、家に帰りたいと言った。');if(s.flags.signReads>1)lines.push('看板は、何度読んでも「きょうも、いつもどおり」。傷だけが増えている。');if(s.flags.chairRead)lines.push('広場には、誰のものか分からない小さな椅子がある。');if(s.flags.bookmark)lines.push('絵本の余白：「帰り道は、転がる道と同じでなくてもいい。」');
 notes.replaceChildren(...(lines.length?lines:['まだ、書き留めたことはありません。住人や景色を調べてみましょう。']).map(s=>el('li','',s)));
 const nearby=$('nearby-list');nearby.replaceChildren();for(const h of AREAS[s.area].hotspots){const label=h.id==='leaf'&&(s.inventory.includes('leaf')||s.flags.bookmark)?'落ち葉のあと':h.label;const b=el('button','',label);b.onclick=()=>{close('storybook');engine?.interact(h.id);};nearby.append(b);}
}
function book():void{renderBook();open('storybook');}
$('book-button').onclick=book;$('header-book').onclick=book;for(const b of document.querySelectorAll<HTMLElement>('[data-page]'))b.onclick=()=>{bookPage=b.dataset.page!;renderBook();};
for(const area of ['forest','clearing'] as AreaId[])$('map-'+area).onclick=()=>{close('storybook');engine?.interact(area==='clearing'?'to-clearing':'to-forest');};
$('hint-button').onclick=()=>{$('hint-text').textContent=controller.hint;open('hint');};
function settings():void{render();$('back-title').hidden=!playing;open('settings');}
$('title-settings').onclick=settings;$('header-settings').onclick=settings;
$<HTMLInputElement>('setting-music').onchange=()=>{controller.updateSettings({music:$<HTMLInputElement>('setting-music').checked});audio.unlock();};
$<HTMLInputElement>('setting-volume').oninput=()=>controller.updateSettings({volume:Number($<HTMLInputElement>('setting-volume').value)/100});
$<HTMLSelectElement>('setting-speed').onchange=()=>controller.updateSettings({textSpeed:$<HTMLSelectElement>('setting-speed').value as Settings['textSpeed']});
$<HTMLInputElement>('setting-motion').onchange=()=>controller.updateSettings({reduceMotion:$<HTMLInputElement>('setting-motion').checked});
$('title-music').onclick=()=>{if(controller.settings.music&&audio.blocked)audio.unlock();else{controller.updateSettings({music:!controller.settings.music});audio.unlock();}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)controller.persist();engine?.pause(document.hidden);audio.hidden(document.hidden);});
document.addEventListener('contextmenu',e=>{if((e.target as Element).closest('#canvas-holder,.item-tile'))e.preventDefault();});
render();pauseUI();
