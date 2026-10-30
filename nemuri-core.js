/* Pure simulation. Coordinates are logical pixels; the renderer never changes combat. */
(function(root){'use strict';
const W=1200,H=720,FLOOR=620;
const rooms=[
 {name:'木もれびの野営地',hint:'右へ進んで、眠れる森へ。',left:null,right:1,ground:[[0,620,1200,100]],platforms:[[220,520,160,24],[440,420,150,24],[830,340,240,28]],enemies:[]},
 {name:'風待ちの分かれ道',hint:'古いほうきは、下の入口の奥に。',left:0,right:3,ground:[[0,620,1200,100]],platforms:[[170,510,180,24],[670,480,200,24]],door:{x:490,y:620,to:2,label:'ほうきの隠れ家へ'},enemies:[[740,620,'slime']]},
 {name:'ほうきの隠れ家',hint:'足場をのぼって、古いほうきを探そう。',left:1,right:null,ground:[[0,620,1200,100]],platforms:[[280,520,220,26],[600,420,200,26],[890,330,240,28]],enemies:[[650,620,'mushroom']]},
 {name:'しずくの回廊',hint:'空中で「ほうき」。向こう岸まで風に乗ろう。',left:1,right:4,ground:[[0,620,420,100],[760,620,440,100]],platforms:[[230,510,170,26],[770,510,170,26]],enemies:[[970,620,'slime']]},
 {name:'大樹の守り人',hint:'光る地面から離れて、魔法を当てよう。',left:3,right:5,ground:[[0,620,1200,100]],platforms:[[180,500,220,26],[800,500,220,26]],enemies:[]},
 {name:'おばあちゃんの工房',hint:'工房の前で「調べる」を押そう。',left:4,right:null,ground:[[0,620,1200,100]],platforms:[[220,520,180,26]],enemies:[]}
];
function fresh(){return{version:1,room:0,broom:false,gate:false,heart:false,boss:false,ended:false,visited:[0]};}
function restore(raw){const s=fresh();if(!raw||raw.version!==1)return s;for(const k of ['broom','gate','heart','boss','ended'])s[k]=raw[k]===true;s.gate=s.gate&&s.broom;s.boss=s.boss&&s.gate;s.ended=s.ended&&s.boss;s.room=Number.isInteger(raw.room)?Math.max(0,Math.min(5,raw.room)):0;if(s.room>=3&&!s.gate)s.room=1;if(s.room===5&&!s.boss)s.room=4;s.visited=Array.isArray(raw.visited)?[...new Set([0,...raw.visited.filter(n=>Number.isInteger(n)&&n>=0&&n<6)])]:[0];return s;}
function create(s=fresh()){const r={s,p:{x:110,y:620,vx:0,vy:0,face:1,hp:s.heart?7:5,ground:false,airDash:true,inv:0,dash:0,shot:0,coyote:0,buffer:0},time:0,bolts:[],shots:[],particles:[],events:[],respawn:0,lock:false};enter(r,s.room,s.room===0?330:110);return r;}
function event(r,type,data={}){r.events.push({type,...data});}
function enter(r,id,x){r.s.room=id;if(!r.s.visited.includes(id))r.s.visited.push(id);Object.assign(r.p,{x,y:620,vx:0,vy:0,dash:0,ground:false,airDash:true,coyote:0,buffer:0,inv:1});r.enemies=rooms[id].enemies.map(([x,y,kind])=>({x,y,home:x,kind,hp:3,t:0}));r.boss=id===4&&!r.s.boss?{x:900,y:620,hp:18,max:18,clock:0,warning:0,target:0}:null;r.shots=[];r.bolts=[];r.respawn=0;event(r,'room',{id});}
function damage(r,n=1){const p=r.p;if(p.inv>0||r.respawn>0||p.dash>0)return;p.hp=Math.max(0,p.hp-n);p.inv=1.2;event(r,'hurt');if(!p.hp){r.respawn=1;event(r,'down');}}
function interact(r){const {s,p}=r;if(r.respawn)return;if(s.room===1&&Math.abs(p.x-490)<90&&p.y>535){enter(r,2,100);return;}if(s.room===5&&Math.abs(p.x-800)<190&&!s.ended){s.ended=true;event(r,'ending');}}
function step(r,input,dt){if(r.lock)return;dt=Math.max(0,Math.min(dt,1/30));const p=r.p,s=r.s,room=rooms[s.room];r.time+=dt;
 if(r.respawn>0){r.respawn-=dt;if(r.respawn<=0){p.hp=s.heart?7:5;enter(r,s.room,s.room===0?330:110);event(r,'revive');}return;}
 p.inv=Math.max(0,p.inv-dt);p.shot=Math.max(0,p.shot-dt);p.coyote=p.ground?.12:Math.max(0,p.coyote-dt);p.buffer=input.jump?.14:Math.max(0,p.buffer-dt);
 if(p.buffer>0&&p.coyote>0){p.vy=-640;p.ground=false;p.coyote=0;p.buffer=0;event(r,'jump');}
 const axis=(input.right?1:0)-(input.left?1:0);if(axis)p.face=axis;
 if(input.dash&&s.broom&&p.airDash&&p.dash<=0){p.dash=.24;p.airDash=false;p.vy=0;event(r,'dash');}
 if(input.attack&&p.shot<=0){p.shot=.3;r.shots.push({x:p.x+p.face*28,y:p.y-40,vx:p.face*660,life:1.2});event(r,'cast');}
 if(input.interact){interact(r);if(room!==rooms[s.room])return;}
 const dashing=p.dash>0;p.dash=Math.max(0,p.dash-dt);p.vx=dashing?p.face*760:axis*235;if(!dashing)p.vy=Math.min(900,p.vy+1600*dt);else p.vy=0;
 const oldY=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.ground=false;
 if(s.room===1&&!s.gate&&p.x>975){if(dashing&&s.broom){s.gate=true;event(r,'gate');}else{p.x=975;eventOnce(r,'gateHint','風の封印。ほうきで通り抜けられそう。');}}
 for(const [x,y,w]of [...room.ground,...room.platforms])if(p.vy>=0&&oldY<=y+.5&&p.y>=y&&p.x+15>x&&p.x-15<x+w){p.y=y;p.vy=0;p.ground=true;p.airDash=true;}
 if(p.x>W+10){if(room.right!==null&&(s.room!==4||s.boss)){enter(r,room.right,50);return;}p.x=W-20;}
 if(p.x< -10){if(room.left!==null){enter(r,room.left,s.room===2?490:W-55);return;}p.x=20;}
 if(p.y>H+90){if(p.inv>0)p.inv=0;damage(r,1);if(!r.respawn){p.x=s.room===3?160:110;p.y=450;p.vy=0;p.airDash=true;}event(r,'fall');}
 if(s.room===2&&!s.broom&&Math.abs(p.x-990)<62&&Math.abs(p.y-330)<60){s.broom=true;event(r,'broom');}
 if(s.room===0&&!s.heart&&p.x>890&&p.y<355&&p.y>260){s.heart=true;p.hp=7;event(r,'heart');}
 for(const e of r.enemies){if(e.hp<=0)continue;e.t+=dt;e.x=e.home+Math.sin(e.t)*65;if(Math.abs(p.x-e.x)<45&&Math.abs(p.y-e.y)<60)damage(r);}
 const boss=r.boss;if(boss){boss.clock+=dt;const interval=boss.hp<=9?1.6:2.2;if(boss.warning>0){boss.warning-=dt;if(boss.warning<=0){r.bolts.push({x:boss.target,y:0,vx:0,vy:690,life:1.2,kind:'root'});for(const dir of [-1,1])r.bolts.push({x:boss.x,y:boss.y-35,vx:dir*(boss.hp<=9?310:250),vy:0,life:4,kind:'seed'});}}else if(boss.clock>=interval){boss.clock=0;boss.warning=.85;boss.target=p.x;}if(Math.abs(p.x-boss.x)<80&&p.y>boss.y-135)damage(r);}
 for(const b of r.shots){b.x+=b.vx*dt;b.life-=dt;for(const e of r.enemies)if(b.life>0&&e.hp>0&&Math.abs(b.x-e.x)<42&&Math.abs(b.y-(e.y-30))<48){e.hp--;b.life=0;if(e.hp===0){p.hp=Math.min(s.heart?7:5,p.hp+1);event(r,'enemy');}}if(b.life>0&&boss&&boss.hp>0&&Math.abs(b.x-boss.x)<75&&Math.abs(b.y-(boss.y-75))<105){boss.hp--;b.life=0;event(r,'hitBoss');if(boss.hp<=0){s.boss=true;r.boss=null;r.bolts=[];p.hp=s.heart?7:5;event(r,'boss');}}}
 for(const b of r.bolts){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.abs(b.x-p.x)<23&&Math.abs(b.y-(p.y-30))<35){damage(r);b.life=0;}}
 r.shots=r.shots.filter(b=>b.life>0);r.bolts=r.bolts.filter(b=>b.life>0);
}
function eventOnce(r,key,text){if(!r[key]){r[key]=true;event(r,'hint',{text});}}
const api={W,H,rooms,fresh,restore,create,enter,step,damage,interact};if(typeof module!=='undefined')module.exports=api;else root.Nemuri=api;
})(typeof window!=='undefined'?window:globalThis);
