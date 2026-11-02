/* Explicit emergency art only. Kept separate from final generated watercolor assets. */
import Phaser from 'phaser';
import {AREAS,WORLD} from '../content/areas.ts';
export const FRAMES=['hero-idle','hero-step-a','hero-step-b','hero-back','rabbit-idle','rabbit-wave','acorn-idle','acorn-nervous'];
export function createPlaceholders(scene:Phaser.Scene):boolean {
 let used=false;
 for(const area of Object.values(AREAS))if(!scene.textures.exists(area.texture)){
  used=true;const g=scene.make.graphics({x:0,y:0});g.fillStyle(0x9cac87);g.fillRect(0,0,WORLD.width,WORLD.height);g.fillStyle(0xd9caa6);g.fillPoints(area.walkPolygon,true);
  for(let i=0;i<9;i++){g.fillStyle(i%2?0x738e75:0x8ea07a);g.fillCircle(i%2?490:40,80+i*95,60);}
  for(const r of area.obstacles){g.fillStyle(0x9d8064);g.fillRoundedRect(r.x,r.y,r.w,r.h,14);}
  g.generateTexture(area.texture,WORLD.width,WORLD.height);g.destroy();
 }
 if(!scene.textures.exists('characters'))for(const frame of FRAMES){used=true;const g=scene.make.graphics({x:0,y:0});const rabbit=frame.startsWith('rabbit'),acorn=frame.startsWith('acorn');
  g.fillStyle(rabbit?0xe8e4ce:acorn?0xb68d54:0xa75c50);g.fillEllipse(48,73,57,65);g.fillStyle(0xf0d8b2);g.fillCircle(48,48,27);
  if(rabbit){g.fillStyle(0xeee9db);g.fillEllipse(34,20,15,38);g.fillEllipse(62,20,15,38);}else{g.fillStyle(acorn?0x886747:0xab5d52);g.fillEllipse(48,29,66,31);}
  g.fillStyle(0x4f493c);g.fillCircle(39,48,2.5);g.fillCircle(57,48,2.5);g.fillRoundedRect(29,98,15,7,4);g.fillRoundedRect(53,98,15,7,4);g.generateTexture(frame,96,110);g.destroy();
 }
 return used;
}
