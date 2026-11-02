(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CapBallCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function newGame(innings=1,practice=false){return {version:1,innings:innings===3?3:1,practice:!!practice,inning:1,half:0,score:[0,0],outs:0,balls:0,strikes:0,bases:[false,false,false],over:false,history:[[0],[0]],stats:{hits:0,homers:0,strikeouts:0,bestDistance:0,pitches:0,swings:0,practiceHits:0},pitchMemory:[]};}
function resetCount(s){s.balls=0;s.strikes=0;}
function scoreRuns(s,n){s.score[s.half]+=n;while(s.history[s.half].length<s.inning)s.history[s.half].push(0);s.history[s.half][s.inning-1]+=n;}
function finishHalf(s){
 resetCount(s);s.outs=0;s.bases=[false,false,false];
 if(s.half===0){if(s.inning>=s.innings&&s.score[1]>s.score[0]){s.over=true;return;}s.half=1;}
 else if(s.inning>=s.innings&&(s.score[0]!==s.score[1]||s.inning>=s.innings+1))s.over=true;
 else{s.inning++;s.half=0;}
 for(const h of s.history)while(h.length<s.inning)h.push(0);
}
function applyResult(s,result){
 if(s.over)return {ignored:true};const before={inning:s.inning,half:s.half,score:[...s.score],outs:s.outs};let out=false,walk=false,k=false;
 if(result.type==='strike'){s.strikes++;if(s.strikes>=3){out=true;k=true;}}
 else if(result.type==='ball'){s.balls++;if(s.balls>=4){walk=true;const b=s.bases;if(b.every(Boolean))scoreRuns(s,1);if(b[0]&&b[1])b[2]=true;if(b[0])b[1]=true;b[0]=true;resetCount(s);}}
 else if(result.type==='foul'){if(s.strikes<2)s.strikes++;}
 else if(result.type==='out')out=true;
 else if(['single','double','triple','homer'].includes(result.type)){
  const bases={single:1,double:2,triple:3,homer:4}[result.type];let runs=0;const next=[false,false,false];
  for(let i=2;i>=0;i--)if(s.bases[i]){if(i+bases>=3)runs++;else next[i+bases]=true;}
  if(bases===4)runs++;else next[bases-1]=true;s.bases=next;scoreRuns(s,runs);resetCount(s);
  if(s.half===0){s.stats.hits++;if(s.practice)s.stats.practiceHits++;if(bases===4)s.stats.homers++;s.stats.bestDistance=Math.max(s.stats.bestDistance,Number(result.distance)||0);}
 }else return {ignored:true};
 if(out){s.outs++;resetCount(s);if(k&&s.half===1)s.stats.strikeouts++;}
 if(!s.practice&&s.half===1&&s.inning>=s.innings&&s.score[1]>s.score[0])s.over=true;
 if(s.outs>=3){if(s.practice){s.outs=0;s.bases=[false,false,false];resetCount(s);}else finishHalf(s);}
 return {out,walk,strikeout:k,runs:s.score[before.half]-before.score[before.half],changed:before.inning!==s.inning||before.half!==s.half,over:s.over};
}
function makePitch({target=0,spin=0,power=.55,practice=false}={},rng=Math.random){
 power=clamp(power,0,1);spin=clamp(spin,-1,1);target=clamp(target,-1.55,1.55);
 return {target:target+(rng()-.5)*.08,spin,power,duration:(practice?1.43:1.26)-power*(practice?.28:.4),start:(rng()-.5)*.24,angle:rng()*Math.PI*2};
}
function pitchX(p,z){const t=clamp(z,0,1.25);return p.start*(1-t)+p.target*t+p.spin*.83*Math.sin(Math.PI*t)*Math.min(1,t*2);}
function resolveContact(quality,spray=0,rng=Math.random){
 quality=clamp(quality,0,1);const distance=Math.round(34+Math.pow(quality,1.55)*157+(rng()-.5)*12);const gap=Math.min(...[-.67,0,.67].map(v=>Math.abs(v-spray)));
 if(distance>=156)return {type:'homer',distance,quality,spray};
 if(quality<.53&&gap<.22&&rng()<.83)return {type:'out',distance,quality,spray};
 if(distance>123&&gap>.22)return {type:'triple',distance,quality,spray};
 if(distance>96)return {type:'double',distance,quality,spray};
 return {type:'single',distance,quality,spray};
}
function swing(p,z,aim,rng=Math.random){
 const timing=(z-1)*p.duration,separation=Math.abs(aim-pitchX(p,z));
 if(Math.abs(timing)>.165||separation>.61)return {type:'strike',swing:true,feedback:Math.abs(timing)>.165?(timing<0?'早すぎた':'遅すぎた'):'芯を外した',timing,separation};
 if(Math.abs(timing)>.126||separation>.43)return {type:'foul',swing:true,feedback:'かすった',timing,separation,spray:timing<0?-1:1};
 const quality=clamp(1-Math.abs(timing)/.165*.66-separation/.61*.39,0,1),spray=clamp(-timing*5+(aim-p.target)*.6,-.95,.95);
 return {...resolveContact(quality,spray,rng),swing:true,feedback:quality>.9?'芯でとらえた':quality>.7?'いい当たり':'当たった',timing,separation};
}
function cpuPitch(s,rng=Math.random){
 const edge=rng()<.22,target=edge?(rng()<.5?-1:1)*(1.1+rng()*.26):(rng()-.5)*1.65;
 return makePitch({target,spin:rng()<.38?0:(rng()<.5?-1:1)*(.55+rng()*.45),power:s.practice?.25+rng()*.35:.25+rng()*.7,practice:s.practice},rng);
}
function cpuAtBat(p,memory=[],rng=Math.random){
 const zone=Math.abs(p.target)<=1,signature=Math.sign(p.spin)+':'+Math.round(p.target),repeats=memory.filter(v=>v===signature).length;
 if(!zone&&rng()<.87)return {type:'ball',feedback:'ボール'};
 const challenge=p.power*.35+Math.abs(p.spin)*.28+Math.abs(p.target)*.18-repeats*.105;
 if(rng()>.84-clamp(challenge,-.3,1)*.43)return {type:'strike',swing:true,feedback:'空振り'};
 if(!zone||rng()<.13)return {type:'foul',feedback:'ファウル'};
 const quality=clamp(.42+rng()*.58-challenge*.27,0,1);
 return {...resolveContact(quality,(rng()-.5)*1.8,rng),feedback:'打たれた'};
}
function rememberPitch(s,p){s.pitchMemory.push(Math.sign(p.spin)+':'+Math.round(p.target));s.pitchMemory=s.pitchMemory.slice(-4);s.stats.pitches++;}
function readSave(raw){
 try{const s=typeof raw==='string'?JSON.parse(raw):raw;if(!s||s.version!==1||![1,3].includes(s.innings)||!Number.isInteger(s.inning)||s.inning<1||s.inning>s.innings+1||![0,1].includes(s.half)||typeof s.practice!=='boolean'||typeof s.over!=='boolean')return null;
 for(const [k,max] of [['outs',2],['balls',3],['strikes',2]])if(!Number.isInteger(s[k])||s[k]<0||s[k]>max)return null;
 if(!Array.isArray(s.score)||s.score.length!==2||s.score.some(v=>!Number.isInteger(v)||v<0||v>9999)||!Array.isArray(s.bases)||s.bases.length!==3||s.bases.some(v=>typeof v!=='boolean'))return null;
 if(!Array.isArray(s.history)||s.history.length!==2||s.history.some(h=>!Array.isArray(h)||h.length!==s.inning||h.some(n=>!Number.isInteger(n)||n<0||n>9999)))return null;
 if(s.history.some((h,i)=>h.reduce((a,b)=>a+b,0)!==s.score[i]))return null;
 if(!s.stats||!Array.isArray(s.pitchMemory))return null;
 const clean=newGame(s.innings,s.practice);Object.assign(clean,{inning:s.inning,half:s.half,score:[...s.score],outs:s.outs,balls:s.balls,strikes:s.strikes,bases:[...s.bases],over:s.over,history:s.history.map(h=>[...h])});
 for(const k of Object.keys(clean.stats))clean.stats[k]=Number.isFinite(s.stats[k])?clamp(Math.round(s.stats[k]),0,99999):0;
 clean.pitchMemory=s.pitchMemory.filter(v=>typeof v==='string'&&/^-?[01]:-?[012]$/.test(v)).slice(-4);if(clean.practice)clean.half=0;return clean;
 }catch{return null;}
}
return {clamp,newGame,applyResult,makePitch,pitchX,swing,cpuPitch,cpuAtBat,rememberPitch,readSave,resolveContact};
});
