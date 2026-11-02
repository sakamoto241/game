import Phaser from 'phaser';
import type {Controller} from '../core/controller.ts';
import type {AreaId,Hotspot,Point,SaveState} from '../core/types.ts';
import {AREAS,WORLD} from '../content/areas.ts';
import {buildGrid,center,findPath,nearest,type Grid} from '../core/pathfinding.ts';
import {createPlaceholders} from './placeholder.ts';
interface Anchor {x:number;y:number;groupHeight:number}
interface View {data:Hotspot;actor:Phaser.GameObjects.Sprite|null;label:Phaser.GameObjects.Text;marker:Phaser.GameObjects.Arc|null}
export class WorldScene extends Phaser.Scene {
 controller:Controller;progress:(n:number)=>void;ready:()=>void;root!:Phaser.GameObjects.Container;hero!:Phaser.GameObjects.Sprite;shadow!:Phaser.GameObjects.Ellipse;
 area:AreaId='forest';stateRef:SaveState|null=null;grid!:Grid;views:View[]=[];path:Point[]=[];arrival:(()=>void)|null=null;unsubscribe:(()=>void)|null=null;anchors:Record<string,Anchor>={};busy=false;ignoreUntil=0;ambientTweens:Phaser.Tweens.Tween[]=[];lastDirection:Point={x:0,y:1};lastSaved=0;
 constructor(controller:Controller,progress:(n:number)=>void,ready:()=>void){super('World');this.controller=controller;this.progress=progress;this.ready=ready;}
 preload():void {
  const base=import.meta.env.BASE_URL;this.load.image('forest',base+'assets/forest.webp');this.load.image('clearing',base+'assets/clearing.webp');
  this.load.atlas('characters',base+'assets/characters.webp',base+'assets/characters.json');this.load.json('anchors',base+'assets/character-origins.json');
  this.load.svg('leaf',base+'assets/leaf.svg',{width:80,height:100});
  this.load.on('progress',(n:number)=>this.progress(n));
 }
 create():void {
  const ratio=this.scale.gameSize.width/WORLD.width;this.cameras.main.setOrigin(0,0).setZoom(ratio).setScroll(0,0);const fallback=createPlaceholders(this);this.anchors=this.cache.json.get('anchors')??{};this.area=this.controller.state.area;this.renderArea();
  this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(p.getDistance()*this.game.canvas.getBoundingClientRect().width/this.scale.gameSize.width>14||performance.now()<this.ignoreUntil||this.busy||this.controller.uiPaused||this.controller.state.activeDialogue)return;const point=p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;const target=this.pick(point.x,point.y);if(target)this.requestInteraction(target.data.id);else this.walk({x:point.x,y:point.y});});
  this.unsubscribe=this.controller.subscribe(()=>this.sync());this.events.once('shutdown',()=>{this.unsubscribe?.();this.input.removeAllListeners();});this.ready();
  if(fallback)this.controller.message('一部の絵を読み込めなかったため、簡易表示で開いています。遊びは続けられます。');
 }
 actor(frame:string,x:number,y:number,height:number):Phaser.GameObjects.Sprite {
  const sprite=this.add.sprite(x,y,this.textures.exists('characters')?'characters':frame,this.textures.exists('characters')?frame:undefined);this.fitActor(sprite,frame,height);return sprite;
 }
 fitActor(sprite:Phaser.GameObjects.Sprite,frame:string,height:number):void {
  if(this.textures.exists('characters'))sprite.setTexture('characters',frame);else sprite.setTexture(frame);
  const a=this.textures.exists('characters')?this.anchors[frame]:undefined;sprite.setOrigin(a?.x??.5,a?.y??.98);sprite.setScale(height/(a?.groupHeight??sprite.frame.realHeight));
 }
 renderArea():void {
  this.tweens.killAll();this.ambientTweens=[];this.root?.destroy(true);this.path=[];this.arrival=null;this.views=[];this.area=this.controller.state.area;this.stateRef=this.controller.state;const area=AREAS[this.area];this.grid=buildGrid(area);this.root=this.add.container(0,0);
  const bg=this.add.image(WORLD.width/2,WORLD.height/2,area.texture);const cover=Math.max(WORLD.width/bg.width,WORLD.height/bg.height);bg.setScale(cover);this.root.add(bg);
  const wash=this.add.rectangle(270,430,540,860,0xf0ddb1,.035);this.root.add(wash);
  for(const target of area.hotspots){
   const sprite=target.frame?this.actor(this.frameFor(target),target.position.x,target.position.y,target.id==='acorn'?83:116):null;
   if(sprite){this.root.add(this.add.ellipse(target.position.x,target.position.y+2,target.id==='acorn'?36:47,12,0x554b3c,.13));this.root.add(sprite);sprite.setDepth(target.position.y);}
   let marker:Phaser.GameObjects.Arc|null=null;
   if(target.kind!=='npc'){marker=this.add.circle(target.position.x,target.position.y,target.kind==='exit'?17:12,0xf1dfab,.27).setStrokeStyle(1.2,0xf4e8c1,.9);this.root.add(marker);this.ambientTweens.push(this.tweens.add({targets:marker,alpha:.45,scale:1.13,duration:1700,yoyo:true,repeat:-1,delay:this.views.length*150}));}
   if(target.id==='leaf'&&this.textures.exists('leaf')){const leaf=this.add.image(target.position.x,target.position.y-4,'leaf').setDisplaySize(62,74).setAngle(-27).setName('collectible-leaf').setDepth(target.position.y-1);this.root.add(leaf);}
   const label=this.add.text(target.position.x,target.kind==='npc'?target.position.y+10:target.position.y+23,target.label,{fontFamily:'UtaBook, Hiragino Mincho ProN, Yu Mincho, serif',resolution:2,fontSize:target.kind==='exit'?'19px':'17px',color:'#514d3e',backgroundColor:'#f2e8cce8',padding:{x:8,y:5},stroke:'#f7edda',strokeThickness:.4}).setOrigin(.5,0);
   this.root.add(label);this.views.push({data:target,actor:sprite,label,marker});
  }
  const snap=center(this.grid,nearest(this.grid,this.controller.state.position));this.controller.setPosition(snap);this.shadow=this.add.ellipse(snap.x,snap.y+2,40,12,0x514a3c,.18);this.hero=this.actor('hero-idle',snap.x,snap.y,95);this.root.add([this.shadow,this.hero]);
  bg.setDepth(-1000);wash.setDepth(-900);this.shadow.setDepth(snap.y-1);this.hero.setDepth(snap.y);for(const view of this.views){view.label.setDepth(1100);view.marker?.setDepth(1);}this.root.sort('depth');
  for(let i=0;i<6;i++){const leaf=this.add.ellipse(80+i*73,120+i*111,5,9,i%2?0xd7c28c:0xc6ba8a,.45);leaf.setDepth(1000);this.root.add(leaf);this.ambientTweens.push(this.tweens.add({targets:leaf,x:leaf.x+28,y:leaf.y+60,angle:70,duration:6000+i*450,yoyo:true,repeat:-1}));}
  this.sync();
 }
 frameFor(target:Hotspot):string{if(target.id==='acorn')return this.controller.state.flags.metAcorn?'acorn-idle':'acorn-nervous';return target.frame??'rabbit-idle';}
 sync():void {
  if(!this.root)return;for(const tween of this.ambientTweens){if(this.controller.settings.reduceMotion)tween.pause();else tween.resume();}
  if(this.stateRef!==this.controller.state&&this.area===this.controller.state.area){this.renderArea();return;}
  if(this.area!==this.controller.state.area){if(this.busy)return;this.busy=true;this.path=[];this.arrival=null;
   const finish=()=>{this.renderArea();this.cameras.main.fadeIn(this.controller.settings.reduceMotion?0:180,238,231,208);this.busy=false;};
   if(this.controller.settings.reduceMotion)finish();else{this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,finish);this.cameras.main.fadeOut(150,238,231,208);}return;
  }
  for(const view of this.views){if(view.actor)this.fitActor(view.actor,this.frameFor(view.data),view.data.id==='acorn'?83:116);
   if(view.data.id==='leaf'){const picked=this.controller.state.inventory.includes('leaf')||this.controller.state.flags.bookmark;view.label.setText(picked?'落ち葉のあと':'大きな落ち葉');view.marker?.setVisible(!picked);const leaf=this.root.getByName('collectible-leaf');if(leaf instanceof Phaser.GameObjects.Image)leaf.setVisible(!picked);}
   if(view.data.id==='book')view.label.setText(this.controller.state.flags.bookmark?'しおりのある絵本':'小さな絵本');
  }
  const book=this.views.find(v=>v.data.id==='book');const existing=this.root.getByName('bookmark-leaf');
  if(book&&this.controller.state.flags.bookmark&&!existing&&this.textures.exists('leaf')){const leaf=this.add.image(book.data.position.x+9,book.data.position.y-9,'leaf').setDisplaySize(22,30).setAngle(-20).setName('bookmark-leaf');this.root.add(leaf);}
 }
 pick(x:number,y:number):View|null {
  const scale=this.scale.displaySize.width/WORLD.width,min=22/Math.max(.2,scale);const candidates=this.views.filter(view=>{
   const rect=view.actor?view.actor.getBounds():new Phaser.Geom.Rectangle(view.data.position.x-14,view.data.position.y-14,28,28);const bounds=Phaser.Geom.Rectangle.Union(rect,view.label.getBounds());
   const growX=Math.max(6,(min*2-bounds.width)/2),growY=Math.max(6,(min*2-bounds.height)/2);Phaser.Geom.Rectangle.Inflate(bounds,growX,growY);return bounds.contains(x,y);
  });return candidates.sort((a,b)=>Math.hypot(a.data.position.x-x,a.data.position.y-y)-Math.hypot(b.data.position.x-x,b.data.position.y-y))[0]??null;
 }
 walk(point:Point,after?:()=>void):boolean {
  if(this.busy||this.controller.state.activeDialogue)return false;const path=findPath(this.grid,{x:this.hero.x,y:this.hero.y},point);if(!path){this.controller.message('そこへは回れないみたい。道の上を指さしてみよう。');return false;}
  this.path=path;this.arrival=after??null;const end=path.at(-1)??point;const ring=this.add.circle(end.x,end.y,17,0xffffff,0).setStrokeStyle(1.8,0xf4e6b9,.9);this.root.add(ring);this.tweens.add({targets:ring,alpha:0,scale:1.5,duration:650,onComplete:()=>ring.destroy()});return true;
 }
 requestInteraction(id:string):boolean {
  if(this.busy||this.controller.state.activeDialogue)return false;const target=this.views.find(v=>v.data.id===id)?.data;if(!target)return false;
  return this.walk(target.approach,()=>{if(id==='to-clearing')this.controller.enterArea('clearing');else if(id==='to-forest')this.controller.enterArea('forest');else this.controller.interact(id);});
 }
 useAt(clientX:number,clientY:number):boolean {
  const rect=this.game.canvas.getBoundingClientRect();if(clientX<rect.left||clientX>rect.right||clientY<rect.top||clientY>rect.bottom)return false;
  const view=this.pick((clientX-rect.left)/rect.width*WORLD.width,(clientY-rect.top)/rect.height*WORLD.height);if(!view)return false;return this.requestInteraction(view.data.id);
 }
 refreshFonts():void{for(const view of this.views)view.label.updateText();}
 update(time:number,delta:number):void {
  if(!this.hero||this.busy||this.controller.uiPaused||this.controller.state.activeDialogue)return;
  const dt=Math.min(.05,delta/1000),next=this.path[0];
  if(next){const dx=next.x-this.hero.x,dy=next.y-this.hero.y,length=Math.hypot(dx,dy),step=145*dt;
   if(length<=step){this.hero.setPosition(next.x,next.y);this.path.shift();}else this.hero.setPosition(this.hero.x+dx/length*step,this.hero.y+dy/length*step);
   if(length>1)this.lastDirection={x:dx,y:dy};const frame=dy<-Math.abs(dx)*1.8?'hero-back':Math.floor(time/170)%2?'hero-step-a':'hero-step-b';this.fitActor(this.hero,frame,95);this.hero.setFlipX(dx<-1);
   this.shadow.setPosition(this.hero.x,this.hero.y+2);this.controller.setPosition({x:this.hero.x,y:this.hero.y});
   if(!this.path.length){this.fitActor(this.hero,this.lastDirection.y<-Math.abs(this.lastDirection.x)*1.8?'hero-back':'hero-idle',95);this.controller.setPosition({x:this.hero.x,y:this.hero.y},true);const callback=this.arrival;this.arrival=null;callback?.();}
   else if(time-this.lastSaved>1200){this.lastSaved=time;this.controller.persist();}
  }
  // Depth follows feet, not sprite tops. Signs/labels remain legible over scenery.
  this.root.sort('depth');for(const item of this.root.list){if(item instanceof Phaser.GameObjects.Sprite)item.setDepth(item.y);}
  this.shadow.setDepth(this.hero.y-1);this.hero.setDepth(this.hero.y);for(const v of this.views){v.label.setDepth(1100);v.marker?.setDepth(1);}
 }
}
