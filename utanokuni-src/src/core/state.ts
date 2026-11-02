import type {SaveState, Settings} from './types.ts';
import {AREAS,WORLD} from '../content/areas.ts';
import {DIALOGUES} from '../content/dialogues.ts';
export const SAVE_KEY='utanokuni-save-v1',BACKUP_KEY='utanokuni-save-backup-v1',RECOVERY_KEY='utanokuni-save-recovery',SETTINGS_KEY='utanokuni-settings-v1';
export interface StorageLike {getItem(key:string):string|null;setItem(key:string,value:string):void}
export function freshState():SaveState{return{version:1,chapter:1,area:'forest',position:{...AREAS.forest.spawn},inventory:[],flags:{metRabbit:false,arrivedClearing:false,metAcorn:false,bookmark:false,signReads:0,chairRead:false},seen:[],activeDialogue:null};}
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
export function validateSave(raw:unknown):SaveState|null {
 try{
  const d:unknown=typeof raw==='string'?JSON.parse(raw):raw;if(!record(d))return null;
  // The experimental v0 layout used player/items instead of position/inventory.
  if(d.version===0){if(!record(d.player))return null;return validateSave({...d,version:1,position:d.player,inventory:d.items??[],flags:record(d.flags)?d.flags:{metRabbit:d.metRabbit===true}});}
  if(d.version!==1||(d.chapter!==undefined&&d.chapter!==1)||!['forest','clearing'].includes(String(d.area))||!record(d.position)||!Array.isArray(d.inventory)||!record(d.flags))return null;
  const s=freshState();s.area=d.area as SaveState['area'];const p=d.position;
  if(typeof p.x!=='number'||typeof p.y!=='number'||!Number.isFinite(p.x)||!Number.isFinite(p.y))return null;
  s.position={x:Math.max(0,Math.min(WORLD.width,p.x)),y:Math.max(0,Math.min(WORLD.height,p.y))};
  for(const key of ['metRabbit','arrivedClearing','metAcorn','bookmark','chairRead'] as const)s.flags[key]=d.flags[key]===true;
  s.flags.signReads=typeof d.flags.signReads==='number'&&Number.isFinite(d.flags.signReads)?Math.max(0,Math.min(99,Math.floor(d.flags.signReads))):0;
  s.inventory=[...new Set(d.inventory.filter(i=>i==='leaf'))] as SaveState['inventory'];if(s.flags.bookmark)s.inventory=[];
  s.seen=Array.isArray(d.seen)?[...new Set(d.seen.filter((id):id is string=>typeof id==='string'&&Object.hasOwn(DIALOGUES,id)))]:[];
  if(record(d.activeDialogue)){const id=d.activeDialogue.id,index=d.activeDialogue.index;
   if(typeof id==='string'&&Object.hasOwn(DIALOGUES,id)&&typeof index==='number'&&Number.isInteger(index)&&index>=0&&index<DIALOGUES[id].lines.length)s.activeDialogue={id,index};
  }
  if(s.area==='clearing'){s.flags.metRabbit=true;s.flags.arrivedClearing=true;}
  if(s.activeDialogue?.id==='bookmark'&&!s.inventory.includes('leaf')&&!s.flags.bookmark)s.activeDialogue=null;
  return s;
 }catch{return null;}
}
export const defaultSettings=(reduceMotion=false):Settings=>({music:false,volume:.65,textSpeed:'normal',reduceMotion});
export function readSettings(raw:string|null,reduced=false):Settings {const s=defaultSettings(reduced);try{const d:unknown=JSON.parse(raw??'null');if(!record(d))return s;s.music=d.music===true;s.volume=typeof d.volume==='number'&&Number.isFinite(d.volume)?Math.max(0,Math.min(1,d.volume)):.65;s.textSpeed=['slow','normal','instant'].includes(String(d.textSpeed))?d.textSpeed as Settings['textSpeed']:'normal';s.reduceMotion=typeof d.reduceMotion==='boolean'?d.reduceMotion:reduced;}catch{}return s;}
export class SaveService {
 storage:StorageLike|null;hasRaw=false;message='';
 constructor(storage:StorageLike|null){this.storage=storage;}
 load():SaveState|null {
  try{const raw=this.storage?.getItem(SAVE_KEY)??null;this.hasRaw=raw!==null;const primary=validateSave(raw);if(primary)return primary;
   const backup=validateSave(this.storage?.getItem(BACKUP_KEY)??null);if(backup){this.message='前の記録が見つかりました。「つづきから」で復帰できます。';return backup;}
   if(this.hasRaw)this.message='記録を読み込めませんでした。新しく始める前に、上書きの確認を表示します。';
  }catch{this.message='このブラウザでは記録を読み込めません。保存できない場合も、そのまま遊べます。';}return null;
 }
 save(state:SaveState):boolean {try{if(!this.storage)return false;const previous=this.storage.getItem(SAVE_KEY);if(previous&&validateSave(previous))this.storage.setItem(BACKUP_KEY,previous);this.storage.setItem(SAVE_KEY,JSON.stringify(state));this.hasRaw=true;this.message='';return true;}catch{return false;}}
 archive():void {try{const raw=this.storage?.getItem(SAVE_KEY);if(raw&&!validateSave(raw))this.storage?.setItem(RECOVERY_KEY,raw.slice(0,100000));}catch{}}
}
