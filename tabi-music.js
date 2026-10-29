/* Recorded piano/acoustic-guitar arrangement. See tabi-audio-credits.html. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TabiMusic=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
class Player{
 constructor(options={}){this.audio=null;this.on=false;this.busy=false;this.volume=options.volume??.55;this.generation=0;}
 init(){if(this.audio)return;this.audio=new Audio('tabi-acoustic.mp3?v=4');this.audio.loop=true;this.audio.preload='none';this.audio.volume=this.volume;this.audio.setAttribute('playsinline','');}
 async enable(){this.init();++this.generation;this.on=true;this.audio.volume=this.volume;this.audio.currentTime=0;try{await this.audio.play();}catch(error){if(!this.on||globalThis.document?.hidden)return;this.on=false;throw error;}if(!this.on||globalThis.document?.hidden)this.audio.pause();}
 async disable(){this.on=false;++this.generation;if(this.audio)this.audio.pause();}
 async background(hidden){if(!this.on||!this.audio)return;++this.generation;if(hidden){this.audio.pause();return;}await this.audio.play();if(!this.on||globalThis.document?.hidden)this.audio.pause();}
 // Quiet visual upgrade feedback leaves the acoustic recording uninterrupted.
 note(){}
 chime(){}
}
return{Player,TITLE:'森でひと休み',DURATION:84.70588235294117,TEMPO:68};
});
