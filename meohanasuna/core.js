(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LookCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ROOMS=['corridor','classroom','office'],BASE=[10,12,6,6,9,3,3,10,10],INITIAL=[1,1,0,2,1,0,3,1,1];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fresh(difficulty='normal'){return{version:1,status:'intro',intro:0,room:'corridor',distance:100,difficulty:difficulty==='gentle'?'gentle':'normal',flags:{notice:false,seats:false,diary:false,archive:false,teacherKey:false,officeOpen:false,power:false,exitKey:false,clock:false},wires:[...INITIAL],hour:0,minute:0,mistakes:0,deaths:0,elapsed:0,unwatched:0,ending:null};}
function maskAt(s,i){let v=BASE[i];for(let n=0;n<s.wires[i];n++)v=((v<<1)&15)|(v>>3);return v;}
function liveTiles(s){const masks=s.wires.map((_,i)=>maskAt(s,i)),seen=new Set();if(!(masks[0]&8))return seen;const queue=[0];seen.add(0);for(let q=0;q<queue.length;q++){const i=queue[q],row=Math.floor(i/3),col=i%3;for(const [bit,opp,dr,dc]of [[1,4,-1,0],[2,8,0,1],[4,1,1,0],[8,2,0,-1]]){const r=row+dr,c=col+dc,j=r*3+c;if(r>=0&&r<3&&c>=0&&c<3&&(masks[i]&bit)&&(masks[j]&opp)&&!seen.has(j)){seen.add(j);queue.push(j);}}}return seen;}
function connected(s){return liveTiles(s).has(8)&&!!(maskAt(s,8)&2);}
function stage(s){return !s.flags.teacherKey?0:!s.flags.power?1:!s.flags.clock?2:3;}
function objective(s){return ['教室で、職員室の鍵を探す','職員室の配電盤に通電する','玄関の鍵を取り、時計を合わせる','玄関を開ける。まだ、伝え忘れたことがある'][stage(s)];}
function tick(s,seconds,{watching=false,paused=false}={}){if(s.status!=='playing'||paused)return false;const dt=clamp(Number(seconds)||0,0,.25);s.elapsed+=dt;if(!watching){s.unwatched+=dt;s.distance=Math.max(0,s.distance-dt*(s.difficulty==='gentle'?.40:.72));if(s.distance<=0){s.status='caught';s.deaths++;return true;}}return false;}
function penalty(s,n){s.mistakes++;s.distance=Math.max(1,s.distance-n);}
function act(s,type,value){
 if(s.status!=='playing'&&type!=='intro'&&type!=='retry')return{ok:false,message:'今は探索できません。'};
 const f=s.flags;
 if(type==='intro'){if(s.status!=='intro')return{ok:false};s.intro++;if(s.intro>=3){s.status='playing';s.intro=3;}return{ok:true};}
 if(type==='retry'){if(!['caught','ended'].includes(s.status))return{ok:false};s.status='playing';s.room='corridor';s.distance=100;s.ending=null;return{ok:true};}
 if(type==='room'){if(!ROOMS.includes(value))return{ok:false};if(value==='office'&&!f.teacherKey)return{ok:false,message:'職員室には鍵がかかっている。教室を調べよう。'};s.room=value;if(value==='office')f.officeOpen=true;return{ok:true};}
 const rooms={notice:'corridor',seats:'classroom',diary:'classroom',archive:'office',drawer:'classroom',rotate:'office',power:'office',key:'office',time:'corridor',ending:'corridor'};
 if(rooms[type]&&s.room!==rooms[type])return{ok:false,message:'その場所へ移動してから調べよう。'};
 if(['notice','seats','diary'].includes(type)){f[type]=true;return{ok:true};}
 if(type==='archive'){if(!f.power)return{ok:false,message:'記録簿の留め具も、配電盤につながっている。先に通電しよう。'};f.archive=true;return{ok:true};}
 if(type==='drawer'){if(f.teacherKey)return{ok:true,message:'職員室の鍵は持っている。'};if(String(value)!=='2786'){penalty(s,5);return{ok:false,message:'番号が違う。廊下の当番表と、教室の座席表を見比べよう。'};}f.teacherKey=true;s.distance=100;return{ok:true,checkpoint:true,message:'職員室の鍵を手に入れた。遠くで灯りが一つ点き、気配が離れた。'};}
 if(type==='rotate'){if(f.power)return{ok:false,message:'もう通電している。'};if(!Number.isInteger(value)||value<0||value>8)return{ok:false};s.wires[value]=(s.wires[value]+1)%4;return{ok:true};}
 if(type==='power'){if(f.power)return{ok:true};if(!connected(s)){penalty(s,4);return{ok:false,message:'線がつながっていない。左上の入口から、右下の出口へ。'};}f.power=true;s.distance=100;return{ok:true,checkpoint:true,message:'電気が戻った。記録簿と鍵の保管箱が開いた。気配も遠ざかった。'};}
 if(type==='key'){if(!f.power)return{ok:false,message:'鍵の保管箱は電気錠で閉じられている。先に配電盤へ。'};f.exitKey=true;return{ok:true,message:'玄関の鍵を手に入れた。残るのは、あの日の時刻。'};}
 if(type==='time'){if(!f.power||!f.exitKey)return{ok:false,message:!f.power?'玄関の装置には電気が来ていない。':'玄関の鍵が必要。職員室の保管箱を調べよう。'};const h=Number(value?.hour),m=Number(value?.minute);if(!Number.isInteger(h)||h<0||h>23||!Number.isInteger(m)||m<0||m>59)return{ok:false};s.hour=h;s.minute=m;if(h!==17||m!==10){penalty(s,6);return{ok:false,message:'何も起きない。最終下校時刻と、教室の日記を思い出そう。'};}f.clock=true;s.distance=Math.max(s.distance,65);return{ok:true,checkpoint:true,message:'17時10分。止まっていた時計が動き、玄関の封鎖が解けた。'};}
 if(type==='ending'){if(!f.clock)return{ok:false,message:'先に時計の封鎖を解こう。'};if(!['alone','remember'].includes(value))return{ok:false};if(value==='remember'&&!f.archive)return{ok:false,message:'あの子の名前が思い出せない。職員室の記録簿に、何か残っている。'};s.ending=value;s.status='ended';return{ok:true,ending:value};}
 return{ok:false};
}
function hint(s,level=0){const pages=[['廊下の当番表には、引き出しを開ける席順が残っている。','窓側2番、窓側3番、廊下側1番、廊下側2番。教室の座席表の数字を、この順に読む。','教室の引き出しの番号は「2786」。'],['職員室の左奥に配電盤がある。線のつながりを追ってみよう。','入口は左上の左辺、出口は右下の右辺。隣同士の線が両方開いていれば電気が通る。','一例：上段は「横線・左下カーブ・任意」。中段は「右下カーブ・左上カーブ・任意」。下段は「右上カーブ・横線・横線」にする。'],['職員室の鍵の保管箱を開けよう。時刻の手がかりは廊下と教室にある。','最終下校は17時30分。教室の日記には、その20分前に時計が止まったとある。','玄関の時計を「17時10分」に合わせる。'],['玄関から出られる。でも、少女の名前は知っている？','通電したあとの職員室の記録簿を調べると、彼女がここにいる理由が分かる。','記録簿を読んでから、玄関で「朝倉 澪、と呼ぶ」を選ぶと、もう一つの結末へ。']];return pages[stage(s)][clamp(level,0,2)];}
function validate(raw){try{const d=typeof raw==='string'?JSON.parse(raw):raw;if(!d||d.version!==1||!['intro','playing','caught','ended'].includes(d.status)||!ROOMS.includes(d.room)||!d.flags||!['normal','gentle'].includes(d.difficulty))return null;const s=fresh(d.difficulty);s.status=d.status;s.room=d.room;
 if(!Number.isFinite(d.distance)||d.distance<0||d.distance>100)return null;s.distance=d.distance;s.intro=Number.isInteger(d.intro)?clamp(d.intro,0,3):0;
 for(const k of Object.keys(s.flags))s.flags[k]=d.flags[k]===true;
 if(s.flags.power){s.flags.teacherKey=true;s.flags.officeOpen=true;}if(s.flags.exitKey||s.flags.clock||s.flags.archive){s.flags.power=true;s.flags.teacherKey=true;s.flags.officeOpen=true;}if(s.flags.clock)s.flags.exitKey=true;if(s.room==='office')s.flags.teacherKey=true;
 s.wires=Array.isArray(d.wires)&&d.wires.length===9&&d.wires.every(v=>Number.isInteger(v)&&v>=0&&v<4)?[...d.wires]:[...INITIAL];
 for(const k of ['mistakes','deaths','elapsed','unwatched'])s[k]=Number.isFinite(d[k])?clamp(d[k],0,999999):0;
 s.hour=Number.isInteger(d.hour)?clamp(d.hour,0,23):0;s.minute=Number.isInteger(d.minute)?clamp(d.minute,0,59):0;
 s.ending=['alone','remember'].includes(d.ending)?d.ending:null;if(s.status==='ended'&&!s.ending)return null;if(s.ending==='remember'&&!s.flags.archive)return null;if(s.status==='ended'&&!s.flags.clock)return null;if(s.status==='caught')s.distance=0;if(s.status==='playing'&&s.distance===0)s.status='caught';return s;
 }catch{return null;}}
return{ROOMS,BASE,INITIAL,clamp,fresh,maskAt,liveTiles,connected,stage,objective,tick,act,hint,validate};
});
