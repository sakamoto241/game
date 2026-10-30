/* Deterministic charge-jump simulation, independent of rendering and storage. */
(function(root){'use strict';
const WIDTH=480,GRAVITY=1120,RADIUS=13,BODY=40,CHARGE=.85,GOAL=5320;
const zones=[{y:0,name:'木もれびの足場',color:'#a3b47c'},{y:900,name:'大樹の枝わたり',color:'#819963'},{y:1900,name:'風車と赤い屋根',color:'#b69270'},{y:3000,name:'雲の上の灯り',color:'#92aeb3'},{y:4100,name:'星待ちの階段',color:'#9898b1'}];
const rows=[
 [55,120,200],[280,260,145],[90,395,145],[290,535,140],[85,680,130],[275,830,165],
 [60,980,150],[285,1130,130],[110,1285,125],[300,1440,115],[85,1590,130],[260,1750,165],
 [55,1910,145],[285,2065,120],[115,2220,105],[285,2310,105],[80,2530,120],[255,2690,160],
 [65,2850,135],[290,3000,115],[130,3070,110],[320,3280,105],[90,3470,115],[265,3630,155],
 [55,3790,130],[280,3890,110],[90,4090,105],[300,4195,100],[85,4410,105],[250,4570,155],
 [60,4730,125],[290,4850,100],[120,5030,100],[280,5140,115],[15,5320,240]
];
const widths=[150,110,100,100,90,125,85,75,70,65,70,105,70,65,60,65,60,95,60,55,55,50,50,90,55,50,48,50,46,85,50,45,44,44,160];
rows.forEach((q,i)=>q[2]=widths[i]);
const platforms=[{id:0,x:0,y:0,w:480,h:64,rest:true},...rows.map(([x,y,w],i)=>({id:i+1,x,y,w,h:20,rest:[5,11,17,23,29,34].includes(i)}))];
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function fresh(mode='summit'){return{version:1,mode:mode==='practice'?'practice':'summit',p:{x:115,y:0,vx:0,vy:0,face:-1,ground:0},charge:0,charging:false,time:0,started:false,jumps:0,falls:0,maxHeight:0,biggestFall:0,checkpoint:0,cleared:false,fallFrom:0,seen:[]};}
function create(s=fresh()){return{s,events:[],t:0,locked:false,landPose:0,wallPose:0};}
function support(p){return platforms.find(q=>Math.abs(q.y-p.y)<.1&&p.x+RADIUS>q.x&&p.x-RADIUS<q.x+q.w);}
function restore(raw){const s=fresh(raw?.mode);if(!raw||raw.version!==1)return s;const num=(v,a,b,f=0)=>Number.isFinite(v)?clamp(v,a,b):f;for(const k of ['time','jumps','falls','maxHeight','biggestFall'])s[k]=num(raw[k],0,k==='time'?1e8:k==='maxHeight'?GOAL+250:1e7);s.jumps=Math.floor(s.jumps);s.falls=Math.floor(s.falls);s.started=raw.started===true;s.checkpoint=Number.isInteger(raw.checkpoint)&&platforms[raw.checkpoint]?.rest?raw.checkpoint:0;s.seen=Array.isArray(raw.seen)?raw.seen.filter(n=>Number.isInteger(n)&&platforms[n]?.rest):[];s.p.x=num(raw.p?.x,RADIUS,WIDTH-RADIUS,115);s.p.y=num(raw.p?.y,0,GOAL+300);s.p.vx=num(raw.p?.vx,-420,420);s.p.vy=num(raw.p?.vy,-1600,760);s.p.face=[-1,0,1].includes(raw.p?.face)?raw.p.face:-1;s.p.ground=support(s.p)?.id??null;if(s.p.ground!==null){s.p.vx=0;s.p.vy=0;}s.fallFrom=num(raw.fallFrom,0,GOAL+300,s.p.y);s.maxHeight=Math.max(s.maxHeight,s.p.y);s.cleared=raw.cleared===true&&s.p.ground===platforms.length-1;return s;}
function launch(s){const t=clamp(s.charge/CHARGE,0,1);return{vx:s.p.face*(75+240*t),vy:270+470*t};}
function cancel(r){r.s.charging=false;r.s.charge=0;}
function emit(r,type,data={}){r.events.push({type,...data});}
function land(r,q){const s=r.s,p=s.p,drop=Math.max(0,s.fallFrom-q.y);p.y=q.y;p.vy=0;p.vx=0;p.ground=q.id;r.landPose=.18;if(drop>=40){s.falls++;s.biggestFall=Math.max(s.biggestFall,drop);emit(r,'fall',{drop});}s.fallFrom=q.y;if(q.rest&&q.id>s.checkpoint){s.checkpoint=q.id;emit(r,'rest',{id:q.id});}if(q.rest&&!s.seen.includes(q.id)){s.seen.push(q.id);emit(r,'letter',{id:q.id});}emit(r,'land',{id:q.id});if(q.id===platforms.length-1&&!s.cleared){s.cleared=true;emit(r,'clear');}}
function step(r,input={},dt=1/120){if(r.locked||r.s.cleared)return;dt=clamp(dt,0,1/60);const s=r.s,p=s.p;r.t+=dt;r.landPose=Math.max(0,r.landPose-dt);r.wallPose=Math.max(0,r.wallPose-dt);if(s.started)s.time+=dt;
 const grounded=p.ground!==null;if(grounded&&!support(p)){p.ground=null;s.fallFrom=p.y;cancel(r);}
 if(input.aim!==undefined&&[-1,0,1].includes(input.aim))p.face=input.aim;
 const axis=(input.right?1:0)-(input.left?1:0);if(axis)p.face=axis;
 if(input.press&&p.ground!==null){s.charging=true;s.charge=0;}
 if(input.cancel)cancel(r);
 if(s.charging){if(p.ground===null)cancel(r);else{s.charge=Math.min(CHARGE,s.charge+dt);if(input.release){const v=launch(s);p.vx=v.vx;p.vy=v.vy;s.fallFrom=p.y;p.ground=null;s.started=true;s.jumps++;cancel(r);emit(r,'jump',{power:v.vy});}}}
 if(p.ground!==null){p.vx=0;p.vy=0;if(!s.charging){p.x=clamp(p.x+axis*85*dt,RADIUS,WIDTH-RADIUS);if(!support(p)){p.ground=null;s.fallFrom=p.y;}}return;}
 const old={x:p.x,y:p.y};p.vy=Math.max(-1500,p.vy-GRAVITY*dt);let nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;
 if(nx<RADIUS){nx=RADIUS;p.vx=Math.abs(p.vx)*.7;r.wallPose=.15;emit(r,'wall');}if(nx>WIDTH-RADIUS){nx=WIDTH-RADIUS;p.vx=-Math.abs(p.vx)*.7;r.wallPose=.15;emit(r,'wall');}
 // Side hits use the old vertical interval; top/bottom sweeps resolve below.
 for(const q of platforms){if(old.y>=q.y-.01||old.y+BODY<=q.y-q.h+.01)continue;if(p.vx>0&&old.x+RADIUS<=q.x+.01&&nx+RADIUS>q.x){nx=q.x-RADIUS;p.vx=-Math.abs(p.vx)*.65;r.wallPose=.15;emit(r,'wall');}else if(p.vx<0&&old.x-RADIUS>=q.x+q.w-.01&&nx-RADIUS<q.x+q.w){nx=q.x+q.w+RADIUS;p.vx=Math.abs(p.vx)*.65;r.wallPose=.15;emit(r,'wall');}}
 let landing=null;const ascending=p.vy>0;
 for(const q of platforms){if(nx+RADIUS<=q.x||nx-RADIUS>=q.x+q.w)continue;if(!ascending&&old.y>=q.y-.01&&ny<=q.y){if(!landing||q.y>landing.y)landing=q;}else if(ascending&&old.y+BODY<=q.y-q.h+.01&&ny+BODY>=q.y-q.h){ny=q.y-q.h-BODY;p.vy=-Math.abs(p.vy)*.2;emit(r,'head');}}
 p.x=nx;p.y=ny;if(landing)land(r,landing);
 s.maxHeight=Math.max(s.maxHeight,p.y);if(s.mode==='practice'&&s.checkpoint>0&&p.y<platforms[s.checkpoint].y-280){const q=platforms[s.checkpoint],drop=Math.max(0,s.fallFrom-p.y);if(p.ground===null&&drop>=40){s.falls++;s.biggestFall=Math.max(s.biggestFall,drop);emit(r,'fall',{drop});}s.fallFrom=q.y;p.x=q.x+q.w/2;land(r,q);emit(r,'practice');}
}
const api={WIDTH,GRAVITY,RADIUS,BODY,CHARGE,GOAL,zones,platforms,fresh,restore,create,step,launch,cancel};if(typeof module!=='undefined')module.exports=api;else root.Sora=api;
})(typeof window!=='undefined'?window:globalThis);
