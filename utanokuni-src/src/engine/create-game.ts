import Phaser from 'phaser';
import type {Controller} from '../core/controller.ts';
import {WORLD} from '../content/areas.ts';
import {WorldScene} from './world-scene.ts';
export interface EngineApi {interact(id:string):boolean;useAt(x:number,y:number):boolean;suppressPointer(ms:number):void;pause(hidden:boolean):void;refreshFonts():void;refreshLayout():void;destroy():void}
export async function createGame(controller:Controller,progress:(n:number)=>void):Promise<EngineApi>{
 return new Promise((resolve,reject)=>{
  let game:Phaser.Game;const scene=new WorldScene(controller,progress,()=>resolve({interact:id=>scene.requestInteraction(id),useAt:(x,y)=>scene.useAt(x,y),suppressPointer:ms=>{scene.ignoreUntil=performance.now()+ms;},pause:hidden=>{if(hidden){controller.persist();scene.scene.pause();}else if(scene.scene.isPaused())scene.scene.resume();},refreshFonts:()=>scene.refreshFonts(),refreshLayout:()=>game.scale.refresh(),destroy:()=>game.destroy(true)}));
  try{const ratio=Math.min(2,window.devicePixelRatio||1);game=new Phaser.Game({type:Phaser.AUTO,parent:'canvas-holder',width:WORLD.width*ratio,height:WORLD.height*ratio,backgroundColor:'#b1bea0',scene:[scene],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,pixelArt:false,roundPixels:false},fps:{target:60},audio:{noAudio:true},loader:{imageLoadType:'XHR',timeout:12000},input:{activePointers:2}});}catch(error){reject(error);}
 });
}
