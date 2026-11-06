/* Original instrumental scores and shared live/offline Web Audio rendering. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TomoriMusic=api;})(globalThis,function(){
'use strict';
const CHORDS={F:['F2','F3','A3','C4'],C:['C2','C3','E3','G3'],Dm:['D2','D3','F3','A3'],Bb:['Bb1','Bb2','D3','F3'],Am:['A1','A2','C3','E3'],G:['G1','G2','B2','D3'],Em:['E2','E3','G3','B3'],E:['E2','E3','G#3','B3'],Gm:['G1','G2','Bb2','D3'],A:['A1','A2','C#3','E3']};
function midi(note){const m=/^([A-G])(#|b)?(\d)$/.exec(note);if(!m)throw new Error('Invalid note: '+note);return 12*(+m[3]+1)+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);}
const hz=note=>440*Math.pow(2,(midi(note)-69)/12);
const TRACKS={
 shop:{title:'店先の小さな商談',bpm:88,voice:'plucked',leadVolume:.19,arpVolume:.045,bassVolume:.23,
  chords:['F','C','Dm','Bb','F','C',['Bb','C'],'F','Dm','Am','Bb','F','Gm','C',['Bb','C'],'F'],
  a:'0 A4 2,2 C5 2,4 A4 1,5 G4 1,6 F4 2,8 G4 2,10 E4 2,12 C4 4,16 F4 2,18 A4 2,20 D5 2,22 C5 1,23 Bb4 1,24 A4 4,28 G4 4,32 A4 2,34 C5 2,36 F5 2,38 E5 1,39 D5 1,40 C5 3,43 Bb4 1,44 A4 2,46 G4 2,48 F4 2,50 G4 2,52 A4 2,54 Bb4 2,56 A4 2,58 G4 2,60 F4 4',
  b:'0 F4 2,2 A4 1,3 C5 1,4 D5 3,7 C5 1,8 C5 2,10 B4 1,11 A4 1,12 E4 3,16 F4 2,18 Bb4 2,20 A4 2,22 G4 2,24 A4 2,26 G4 1,27 F4 1,28 C5 3,32 Bb4 2,34 A4 2,36 G4 3,40 G4 2,42 E4 2,44 C5 3,48 D5 2,50 C5 2,52 Bb4 2,54 G4 2,56 A4 2,58 G4 2,60 F4 3',
  arp:[1,null,2,null,3,null,2,null],bass:[[0,0,3],[4,1,3]],drums:{},hatVolume:0},
 battle:{title:'買い戻しの道中',bpm:136,voice:'reed',leadVolume:.15,arpVolume:.033,bassVolume:.24,
  chords:['Am','F','G','Em','Am','F','G','E','F','C','Dm','Am','Bb','F','E','Am'],
  a:'0 A4 1,1 C5 1,2 E5 2,4 D5 1,5 C5 1,6 B4 2,8 A4 3,11 G4 1,12 A4 2,14 C5 2,16 B4 1,17 D5 1,18 G5 2,20 F5 1,21 E5 1,22 D5 2,24 E5 6,30 B4 2,32 A4 1,33 C5 1,34 E5 2,36 A5 2,38 G5 1,39 E5 1,40 F5 2,42 E5 2,44 D5 2,46 C5 2,48 B4 2,50 D5 2,52 G5 2,54 F5 2,56 E5 4,60 G#4 2,62 B4 2',
  b:'0 C5 2,2 A4 1,3 C5 1,4 F5 2,6 E5 2,8 D5 2,10 E5 1,11 G5 1,12 E5 3,15 C5 1,16 D5 3,19 F5 1,20 A5 2,22 G5 2,24 E5 2,26 C5 2,28 A4 4,32 D5 1,33 F5 1,34 D5 2,36 C5 2,38 Bb4 2,40 A4 2,42 C5 2,44 F5 3,47 E5 1,48 E5 2,50 B4 2,52 G#4 2,54 B4 2,56 C5 2,58 B4 2,60 A4 3',
  arp:[1,null,3,2,1,null,3,2],bass:[[0,0,1.4],[2,1,1.4],[4,0,1.4],[6,1,1.4]],drums:{kick:[0,4],snare:[2,6],hat:[1,3,5,7]},hatVolume:.014},
 boss:{title:'荷役機械は止まらない',bpm:148,voice:'brass',leadVolume:.15,arpVolume:.033,bassVolume:.27,
  chords:['Dm','Dm','Bb','C','Dm','Dm','Gm','A','Bb','C','Dm','Dm','Gm','Dm','Bb','A'],
  a:'0 D5 2,2 A4 2,4 F5 2,6 E5 1,7 D5 1,8 D5 3,11 F5 1,12 E5 4,16 F5 2,18 D5 2,20 Bb4 2,22 D5 2,24 E5 2,26 C5 2,28 G5 4,32 A5 2,34 F5 2,36 D5 2,38 A4 2,40 Bb4 1,41 A4 1,42 G4 1,43 F4 1,44 E4 4,48 G4 2,50 Bb4 2,52 D5 2,54 G5 2,56 A5 6,62 C#5 2',
  b:'0 F5 2,2 D5 2,4 Bb4 2,6 A4 2,8 G4 2,10 C5 2,12 E5 4,16 F5 2,18 E5 1,19 D5 1,20 A4 2,22 C5 2,24 D5 6,30 A4 2,32 G4 1,33 A4 1,34 Bb4 2,36 D5 2,38 F5 2,40 E5 2,42 D5 2,44 A4 4,48 F5 2,50 D5 2,52 Bb4 2,54 A4 2,56 C#5 2,58 E5 2,60 A4 4',
  arp:[1,2,null,1,3,2,null,1],bass:[[0,0,1.2],[2,0,.7],[3,1,.7],[4,0,1.2],[6,1,1.2]],drums:{kick:[0,3,4,6],snare:[2,6],hat:[1,3,5,7]},hatVolume:.016}
};
for(const track of Object.values(TRACKS)){
 track.length=track.chords.length*8;
 track.notes=[...parse(track.a,0),...parse(track.b,64)];
 track.byStep=Array.from({length:track.length},()=>[]);
 for(const note of track.notes)track.byStep[note.step].push(note);
}
function parse(text,offset){return text.split(',').map(part=>{const [step,note,length]=part.trim().split(' ');return {step:Number(step)+offset,note,frequency:hz(note),length:Number(length)};});}
const COEFFICIENTS={plucked:[0,1,.18,.06,.025,.012],reed:[0,1,.04,.16,.02,.045,.008,.015],brass:[0,1,.20,.12,.05,.025,.01],bass:[0,1,.18,.045]};
const waves=new WeakMap();
function wave(context,voice){let cache=waves.get(context);if(!cache){cache=new Map();waves.set(context,cache);}if(!cache.has(voice)){const harmonics=Float32Array.from(COEFFICIENTS[voice]);cache.set(voice,context.createPeriodicWave(new Float32Array(harmonics.length),harmonics));}return cache.get(voice);}
function note(context,bus,frequency,time,duration,voice,volume){
 const source=context.createOscillator(),gain=context.createGain();source.setPeriodicWave(wave(context,voice));source.frequency.setValueAtTime(frequency,time);
 const attack=voice==='reed'||voice==='brass'?.025:.009,release=voice==='bass'?.08:.065;
 const hold=Math.max(attack+.005,duration*(voice==='plucked'?.25:.66));
 gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+attack);
 gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*(voice==='plucked'?.32:.65)),time+hold);
 gain.gain.exponentialRampToValueAtTime(.0001,time+Math.max(hold+.01,duration)+release);
 source.connect(gain).connect(bus);source.onended=()=>{source.disconnect();gain.disconnect();};source.start(time);source.stop(time+Math.max(hold+.01,duration)+release+.01);
}
function drum(context,bus,buffer,time,kind,volume,offset){
 const gain=context.createGain();gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.003);
 const duration=kind==='kick'?.16:kind==='snare'?.105:.035;gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
 if(kind==='kick'){
  const source=context.createOscillator();source.type='sine';source.frequency.setValueAtTime(125,time);source.frequency.exponentialRampToValueAtTime(48,time+.12);source.connect(gain).connect(bus);
  source.onended=()=>{source.disconnect();gain.disconnect();};source.start(time);source.stop(time+duration+.01);
 }else{
  const source=context.createBufferSource(),filter=context.createBiquadFilter();source.buffer=buffer;filter.type=kind==='hat'?'highpass':'bandpass';filter.frequency.value=kind==='hat'?4300:1650;filter.Q.value=.65;
  source.connect(filter).connect(gain).connect(bus);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(time,offset);source.stop(time+duration+.01);
 }
}
function renderStep(context,bus,track,step,time,duration,buffer){
 const beat=step%8,bar=Math.floor(step/8),entry=track.chords[bar],name=Array.isArray(entry)?entry[beat<4?0:1]:entry,chord=CHORDS[name];
 const accent=[1,.84,.94,.84,1,.84,.94,.84][beat];
 for(const n of track.byStep[step])note(context,bus,n.frequency,time,n.length*duration*.89,track.voice,track.leadVolume*accent);
 const arp=track.arp[beat];if(arp!=null)note(context,bus,hz(chord[arp]),time+.008,duration*.8,'plucked',track.arpVolume*accent);
 for(const [at,fifth,length] of track.bass)if(at===beat)note(context,bus,hz(chord[0])*(fifth?1.5:1),time,length*duration*.87,'bass',track.bassVolume);
 if(track.drums.kick?.includes(beat))drum(context,bus,buffer,time,'kick',.24,0);
 if(track.drums.snare?.includes(beat))drum(context,bus,buffer,time,'snare',.13,(step%7)*.07);
 if(track.drums.hat?.includes(beat))drum(context,bus,buffer,time,'hat',track.hatVolume,(step%7)*.07);
}
return {TRACKS,CHORDS,midi,hz,renderStep};
});
