(()=>{'use strict';
class Audio{
 constructor(){this.ctx=null;this.enabled=true;this.volume=.65;this.active=false;this.blocked=false;this.sources=new Set();this.room=null;this.onchange=()=>{};}
 get audible(){return !!(this.ctx&&this.ctx.state==='running'&&this.enabled&&this.active&&!this.blocked);}
 async unlock(){if(!this.enabled)return;try{if(!this.ctx)this.build();await this.ctx.resume();this.blocked=false;this.ensureRoom();this.setGain();this.onchange();}catch{this.blocked=true;this.onchange();}}
 build(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('audio');const c=this.ctx=new AC();this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);this.dry=c.createGain();this.dry.gain.value=.8;this.dry.connect(this.master);this.reverb=c.createConvolver();const impulse=c.createBuffer(2,Math.floor(c.sampleRate*1.45),c.sampleRate);let seed=537;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let ch=0;ch<2;ch++){const d=impulse.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(rnd()*2-1)*Math.pow(1-i/d.length,2.6)*.35;}this.reverb.buffer=impulse;const wet=c.createGain();wet.gain.value=.32;this.reverb.connect(wet);wet.connect(this.master);
 this.buffers={};for(const name of ['room','step','laugh']){const length=name==='room'?3.2:name==='step'?.28:1.3,b=c.createBuffer(1,Math.floor(c.sampleRate*length),c.sampleRate),d=b.getChannelData(0);let brown=0;for(let i=0;i<d.length;i++){const t=i/c.sampleRate,n=rnd()*2-1;brown=(brown+n*.035)/1.035;if(name==='room')d[i]=brown*.35+Math.sin(t*Math.PI*100)*.002;else if(name==='step'){const env=Math.exp(-t*28)*Math.min(1,t/.004);d[i]=(brown*1.8+n*.07+Math.sin(t*(73-t*25)*Math.PI*2)*.17)*env;}else{const breath=Math.pow(Math.max(0,Math.sin(t*Math.PI*8)),2)*Math.sin(Math.min(1,t/1.3)*Math.PI);d[i]=(brown*.9+n*.05)*breath;}}this.buffers[name]=b;}}
 setGain(){if(this.ctx)this.master.gain.setTargetAtTime(this.enabled&&this.active?this.volume*.6:0,this.ctx.currentTime,.045);}
 ensureRoom(){if(!this.ctx||!this.enabled||!this.active||this.room||this.ctx.state!=='running')return;const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();s.buffer=this.buffers.room;s.loop=true;f.type='lowpass';f.frequency.value=350;gain.gain.value=.45;s.connect(f);f.connect(gain);gain.connect(this.dry);s.start();this.room=s;s.onended=()=>{s.disconnect();f.disconnect();gain.disconnect();};}
 setEnabled(enabled){this.enabled=enabled;if(!enabled)this.stopRoom();this.setGain();this.onchange();}
 setVolume(v){this.volume=Math.max(0,Math.min(1,v));this.setGain();}
 setActive(active){this.active=active;if(!active)this.stopAll();else this.ensureRoom();this.setGain();this.onchange();}
 stopRoom(){if(this.room){try{this.room.stop();}catch{}this.room=null;}}
 stopAll(){this.stopRoom();for(const source of this.sources)try{source.stop();}catch{}this.sources.clear();}
 newRun(){this.stopAll();this.active=true;this.ensureRoom();this.setGain();}
 sample(name,{pan=0,gain=.7,rate=1,delay=0,far=false}={}){if(!this.audible)return;const c=this.ctx,s=c.createBufferSource(),filter=c.createBiquadFilter(),v=c.createGain();s.buffer=this.buffers[name];s.playbackRate.value=rate;filter.type='lowpass';filter.frequency.value=name==='laugh'?1100:far?580:1400;v.gain.value=gain;let output=v;if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;v.connect(p);output=p;}s.connect(filter);filter.connect(v);output.connect(this.dry);output.connect(this.reverb);this.sources.add(s);s.onended=()=>{this.sources.delete(s);s.disconnect();filter.disconnect();v.disconnect();output.disconnect();};s.start(c.currentTime+delay);}
 walk(side){this.sample('step',{pan:side*.34,gain:.54,rate:1.09});}
 behind(){this.sample('step',{pan:-.7,gain:.77,rate:.78,far:true});this.sample('step',{pan:.57,gain:.60,rate:.74,delay:.17,far:true});}
 cue(id){if(id==='steps')this.sample('step',{pan:.7,gain:.45,rate:.82,far:true});if(id==='laugh')this.sample('laugh',{pan:-.55,gain:.9,rate:.83,far:true});}
 async hidden(hidden){if(!this.ctx)return;if(hidden){this.stopAll();try{await this.ctx.suspend();}catch{}}else if(this.enabled&&this.active)await this.unlock();}
}
window.ShadowAudio=Audio;
})();
