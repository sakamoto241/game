import type {Controller} from '../core/controller.ts';
export class AudioManager {
 controller:Controller;audio:HTMLAudioElement|null=null;blocked=false;
 constructor(controller:Controller){this.controller=controller;}
 apply():void{if(this.audio)this.audio.volume=this.controller.settings.volume;if(!this.controller.settings.music)this.audio?.pause();}
 unlock():void{
  if(!this.controller.settings.music||document.hidden)return;
  if(!this.audio){this.audio=new Audio(import.meta.env.BASE_URL+'audio/unturned-page.mp3');this.audio.preload='none';this.audio.loop=true;this.audio.setAttribute('playsinline','');this.audio.addEventListener('error',()=>{this.blocked=true;this.controller.message('音楽を読み込めませんでした。音なしでも、そのまま遊べます。');});}
  if(this.audio.error)this.audio.load();this.audio.volume=this.controller.settings.volume;
  this.audio.play().then(()=>{this.blocked=false;this.controller.notify();}).catch(()=>{this.blocked=true;this.controller.message('音楽ボタンをもう一度タップすると、再生を試せます。');this.controller.notify();});
 }
 hidden(hidden:boolean):void{if(hidden)this.audio?.pause();else this.unlock();}
}
