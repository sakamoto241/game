import type {AreaId,Dialogue,Point,SaveState,Settings} from './types.ts';
import {AREAS} from '../content/areas.ts';
import {DIALOGUES} from '../content/dialogues.ts';
import {defaultSettings,freshState,readSettings,SaveService,SETTINGS_KEY,type StorageLike} from './state.ts';
export class Controller {
 state:SaveState;settings:Settings;saves:SaveService;hasSave:boolean;uiPaused=false;selectedItem:'leaf'|null=null;
 listeners=new Set<()=>void>();messageListeners=new Set<(message:string)=>void>();saveWarned=false;
 constructor(storage:StorageLike|null,reduced=false){this.saves=new SaveService(storage);const saved=this.saves.load();this.hasSave=!!saved;this.state=saved??freshState();let settingsRaw=null;try{settingsRaw=storage?.getItem(SETTINGS_KEY)??null;}catch{}this.settings=readSettings(settingsRaw,reduced);}
 subscribe(fn:()=>void):()=>void{this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 notify():void{for(const fn of this.listeners)fn();}
 message(text:string):void{for(const fn of this.messageListeners)fn(text);}
 persist():void{const ok=this.saves.save(this.state);this.hasSave=ok||this.hasSave;if(!ok&&!this.saveWarned){this.saveWarned=true;this.message('記録を保存できません。この画面を閉じると、今回の進行が失われることがあります。');}}
 startNew():void{this.saves.archive();this.state=freshState();this.state.activeDialogue={id:'opening',index:0};this.selectedItem=null;this.hasSave=true;this.persist();this.notify();}
 get dialogue():Dialogue|null{return this.state.activeDialogue?DIALOGUES[this.state.activeDialogue.id]??null:null;}
 startDialogue(id:string):void{if(!Object.hasOwn(DIALOGUES,id))return;this.state.activeDialogue={id,index:0};this.persist();this.notify();}
 nextLine():void{const cursor=this.state.activeDialogue,d=this.dialogue;if(!cursor||!d)return;if(cursor.index<d.lines.length-1){cursor.index++;this.persist();this.notify();}else if(!d.choices)this.finishDialogue();}
 choose(next:string):void{const d=this.dialogue;if(!d?.choices?.some(c=>c.next===next)||this.state.activeDialogue?.index!==d.lines.length-1)return;this.markSeen(d.id);this.startDialogue(next);}
 markSeen(id:string):void{if(!this.state.seen.includes(id))this.state.seen.push(id);}
 finishDialogue():void{const d=this.dialogue;if(!d)return;this.markSeen(d.id);
  if(d.complete==='rabbit')this.state.flags.metRabbit=true;
  if(d.complete==='acorn')this.state.flags.metAcorn=true;
  if(d.complete==='bookmark'){this.state.flags.bookmark=true;this.state.inventory=this.state.inventory.filter(i=>i!=='leaf');this.selectedItem=null;}
  this.state.activeDialogue=null;this.persist();this.notify();
 }
 skipSeen():void{const d=this.dialogue;if(!d||!this.state.seen.includes(d.id))return;if(d.choices){this.state.activeDialogue!.index=d.lines.length-1;this.persist();this.notify();}else this.finishDialogue();}
 setPosition(p:Point,save=false):void{this.state.position={x:p.x,y:p.y};if(save)this.persist();}
 enterArea(id:AreaId):boolean{if(id==='clearing'&&!this.state.flags.metRabbit){this.startDialogue('gate-blocked');return false;}this.state.area=id;this.state.position={...AREAS[id].spawn};this.state.activeDialogue=null;if(id==='clearing')this.state.flags.arrivedClearing=true;this.selectedItem=null;this.persist();this.notify();return true;}
 interact(id:string):void{
  if(this.state.activeDialogue||!AREAS[this.state.area].hotspots.some(h=>h.id===id))return;
  if(this.selectedItem){this.useItem(id);return;}
  const f=this.state.flags;
  if(id==='rabbit')this.startDialogue(f.metRabbit?'rabbit-again':'rabbit');
  else if(id==='rabbit-clearing')this.startDialogue(f.metAcorn?'rabbit-after':'rabbit-clearing');
  else if(id==='acorn')this.startDialogue(f.metAcorn?'acorn-again':'acorn');
  else if(id==='sign'){f.signReads=Math.min(99,f.signReads+1);this.startDialogue(f.signReads>1?'sign-again':'sign');}
  else if(id==='leaf'){if(!f.bookmark&&!this.state.inventory.includes('leaf')){this.state.inventory.push('leaf');this.startDialogue('leaf');}else this.startDialogue('leaf-empty');}
  else if(id==='book')this.startDialogue(f.bookmark?'book-after':'book');
  else if(id==='chair'){const again=f.chairRead;f.chairRead=true;this.startDialogue(again?'chair-again':'chair');}
  else if(id==='stump'||id==='unfinished')this.startDialogue(id);
 }
 useItem(target:string):void{if(this.selectedItem!=='leaf'||!this.state.inventory.includes('leaf')){this.selectedItem=null;this.notify();return;}if(target==='book'){this.selectedItem=null;this.startDialogue('bookmark');}else this.startDialogue('wrong-item');}
 selectLeaf():void{if(!this.state.inventory.includes('leaf'))return;this.selectedItem=this.selectedItem==='leaf'?null:'leaf';this.notify();}
 updateSettings(next:Partial<Settings>):void{this.settings={...this.settings,...next};try{this.saves.storage?.setItem(SETTINGS_KEY,JSON.stringify(this.settings));}catch{this.message('設定を保存できませんでした。今回の画面には反映されています。');}this.notify();}
 get objective():string{const f=this.state.flags;return !f.metRabbit?'ウタウサギに、話を聞いてみよう':!f.arrivedClearing?'森の奥の、どんぐり広場へ':!f.metAcorn?'どんぐりの話を、最後まで聞こう':'森と広場の、小さな違和感を探そう';}
 get hint():string{const f=this.state.flags;return !f.metRabbit?'白いウサギをタップすると、近くまで歩いて話しかけます。':!f.arrivedClearing?'森の上のほうにある「どんぐり広場へ」をタップ。歩いて道を進みます。':!f.metAcorn?'広場の真ん中にいるどんぐりをタップ。話の途中でも、タップで文章を送れます。':!f.bookmark?'森の入口の落ち葉は、石の上の絵本に挟めそうです。もちものから選んで、絵本をタップしてみましょう。':'看板や、誰も座っていない椅子を、もう一度調べてみると……。この版では二つのエリアを歩けます。';}
}
