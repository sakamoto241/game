/* Load the storybook sprites and keep their separate alpha silhouettes. */
(function(){
'use strict';
const weaponURLs={},weaponSprites={},battlers={},equippedSprites=new Map(),sprites={},urls={},positions={lili:[340,425,183],noa:[470,425,185],mina:[223,425,167],koharu:[300,425,174]};
let forest=null;const backgrounds={},backgroundURLs={};const effects=[];const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const image=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});
function trimSprite(image,l,t,w,h){const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,l,t,w,h,0,0,w,h);const pixels=x.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;for(let y=0;y<c.height;y++)for(let a=0;a<c.width;a++)if(pixels[(y*c.width+a)*4+3]>64){x0=Math.min(x0,a);x1=Math.max(x1,a);y0=Math.min(y0,y);y1=Math.max(y1,y);}if(x1<=x0)throw Error('装備の絵を読み込めませんでした。');const sprite=document.createElement('canvas');sprite.width=x1-x0+1;sprite.height=y1-y0+1;sprite.getContext('2d').drawImage(c,x0,y0,sprite.width,sprite.height,0,0,sprite.width,sprite.height);return sprite;}
async function load(){
 const [atlas,bg,world,monsters,koharu,weapons,bodies]=await Promise.all([image('tabi-simple-atlas.png'),image('tabi-simple-forest.png'),image('tabi-world-atlas.png'),image('tabi-frontier-enemies.png'),image('tabi-koharu.png'),image('tabi-weapons.png'),image('tabi-battle-bodies.png')]);forest=bg;backgrounds.forest=bg;backgroundURLs.forest='tabi-simple-forest.png';
 for(const[id,i]of Object.entries({village:0,fields:1,coast:2,snow:3})){const part=document.createElement('canvas');part.width=world.width/2;part.height=world.height/2;part.getContext('2d').drawImage(world,(i%2)*part.width,Math.floor(i/2)*part.height,part.width,part.height,0,0,part.width,part.height);backgrounds[id]=part;backgroundURLs[id]=part.toDataURL('image/png');}
 loadMonsters(monsters);
 const hero=trimSprite(koharu,0,0,koharu.width,koharu.height);sprites.koharu=hero;urls.koharu=hero.toDataURL('image/png');
 const columns=[0,400,770,1140,1536],rows=[0,360,690,1024];for(const[ri,id]of ['lili','noa','mina'].entries())for(const[ci,theme]of ['forest','moon','sea','snow'].entries()){const l=columns[ci]*weapons.width/1536,r=columns[ci+1]*weapons.width/1536,t=rows[ri]*weapons.height/1024,b=rows[ri+1]*weapons.height/1024,key=id+'-'+theme;weaponSprites[key]=trimSprite(weapons,l,t,r-l,b-t);weaponURLs[key]=weaponSprites[key].toDataURL('image/png');}
 loadBattlers(bodies);

 const c=document.createElement('canvas');c.width=atlas.width;c.height=atlas.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(atlas,0,0);
 const data=x.getImageData(0,0,c.width,c.height),w=c.width,h=c.height,N=w*h,labels=new Int32Array(N),queue=new Int32Array(N),components=[];let label=0;
 for(let i=0;i<N;i++){if(labels[i]||data.data[i*4+3]<=90)continue;label++;let head=0,tail=1,count=0,minX=w,maxX=0,minY=h,maxY=0;queue[0]=i;labels[i]=label;
  while(head<tail){const p=queue[head++],px=p%w,py=Math.floor(p/w);count++;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
   for(const q of [px>0?p-1:-1,px<w-1?p+1:-1,py>0?p-w:-1,py<h-1?p+w:-1])if(q>=0&&!labels[q]&&data.data[q*4+3]>90){labels[q]=label;queue[tail++]=q;}
  }if(count>8000)components.push({label,minX,maxX,minY,maxY,count});
 }
 if(components.length!==8)throw Error('絵の読み込みに失敗しました。再読み込みしてください。');
 let expanded=labels;for(let pass=0;pass<3;pass++){const next=new Int32Array(expanded);for(let y=1;y<h-1;y++)for(let a=1;a<w-1;a++){const i=y*w+a;if(!next[i])next[i]=expanded[i-1]||expanded[i+1]||expanded[i-w]||expanded[i+w];}expanded=next;}
 const expected={lili:[225,310],noa:[621,325],mina:[996,331],slime:[1374,426],mushroom:[141,822],golem:[486,765],cart:[901,790],wagon:[1314,760]},used=new Set();
 for(const [id,point] of Object.entries(expected)){
  const center=[point[0]*w/1536,point[1]*h/1024];
  const part=components.filter(p=>!used.has(p.label)).sort((a,b)=>Math.hypot((a.minX+a.maxX)/2-center[0],(a.minY+a.maxY)/2-center[1])-Math.hypot((b.minX+b.maxX)/2-center[0],(b.minY+b.maxY)/2-center[1]))[0];used.add(part.label);
  const left=Math.max(0,part.minX-4),top=Math.max(0,part.minY-4),sw=Math.min(w-left,part.maxX-left+5),sh=Math.min(h-top,part.maxY-top+5),sprite=document.createElement('canvas');sprite.width=sw;sprite.height=sh;const sx=sprite.getContext('2d'),out=sx.createImageData(sw,sh);
  for(let b=0;b<sh;b++)for(let a=0;a<sw;a++){const src=(top+b)*w+left+a;if(expanded[src]===part.label){const dest=(b*sw+a)*4;for(let k=0;k<4;k++)out.data[dest+k]=data.data[src*4+k];}}
  sx.putImageData(out,0,0);sprites[id]=sprite;urls[id]=sprite.toDataURL('image/png');
 }return sprites;
}
function loadMonsters(atlas){const c=document.createElement('canvas');c.width=atlas.width;c.height=atlas.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(atlas,0,0);const w=c.width,h=c.height,pixels=x.getImageData(0,0,w,h).data,visited=new Uint8Array(w*h),queue=new Int32Array(w*h),parts=[];
 for(let start=0;start<w*h;start++){if(visited[start]||pixels[start*4+3]<=90)continue;let head=0,tail=1,minX=w,minY=h,maxX=0,maxY=0;queue[0]=start;visited[start]=1;while(head<tail){const k=queue[head++],a=k%w,b=Math.floor(k/w);minX=Math.min(minX,a);maxX=Math.max(maxX,a);minY=Math.min(minY,b);maxY=Math.max(maxY,b);for(const j of[a>0?k-1:-1,a<w-1?k+1:-1,b>0?k-w:-1,b<h-1?k+w:-1])if(j>=0&&!visited[j]&&pixels[j*4+3]>90){visited[j]=1;queue[tail++]=j;}}if(tail>5000)parts.push({minX,minY,maxX,maxY});}
 if(parts.length!==4)throw Error('新しい魔物の絵を読み込めませんでした。');
 for(const[id,cx,cy]of[['straw',400,280],['mole',1150,300],['crab',400,780],['owl',1130,800]]){parts.sort((a,b)=>Math.hypot((a.minX+a.maxX)/2-cx,(a.minY+a.maxY)/2-cy)-Math.hypot((b.minX+b.maxX)/2-cx,(b.minY+b.maxY)/2-cy));const p=parts.shift(),sprite=document.createElement('canvas'),left=Math.max(0,p.minX-4),top=Math.max(0,p.minY-4);sprite.width=Math.min(w-left,p.maxX-left+5);sprite.height=Math.min(h-top,p.maxY-top+5);sprite.getContext('2d').drawImage(atlas,left,top,sprite.width,sprite.height,0,0,sprite.width,sprite.height);sprites[id]=sprite;urls[id]=sprite.toDataURL('image/png');}
}
function background(s){return backgrounds[window.Tabi.scenery(s)]||forest;}
function loadBattlers(atlas){
 const c=document.createElement('canvas');c.width=atlas.width;c.height=atlas.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(atlas,0,0);const w=c.width,h=c.height,data=x.getImageData(0,0,w,h).data,labels=new Int32Array(w*h),queue=new Int32Array(w*h),parts=[];let label=0;
 for(let start=0;start<w*h;start++){if(labels[start]||data[start*4+3]<=90)continue;label++;let head=0,tail=1,minX=w,minY=h,maxX=0,maxY=0;queue[0]=start;labels[start]=label;while(head<tail){const k=queue[head++],a=k%w,b=Math.floor(k/w);minX=Math.min(minX,a);maxX=Math.max(maxX,a);minY=Math.min(minY,b);maxY=Math.max(maxY,b);for(const j of[a>0?k-1:-1,a<w-1?k+1:-1,b>0?k-w:-1,b<h-1?k+w:-1])if(j>=0&&!labels[j]&&data[j*4+3]>90){labels[j]=label;queue[tail++]=j;}}if(tail>8000)parts.push({label,minX,minY,maxX,maxY});}
 if(parts.length!==3)throw Error('着せ替え用の仲間の絵を読み込めませんでした。');
 let expanded=labels;for(let pass=0;pass<3;pass++){const next=new Int32Array(expanded);for(let y=1;y<h-1;y++)for(let a=1;a<w-1;a++){const i=y*w+a;if(!next[i])next[i]=expanded[i-1]||expanded[i+1]||expanded[i-w]||expanded[i+w];}expanded=next;}
 const grips={lili:[445,502],noa:[976,536],mina:[1480,532]};parts.sort((a,b)=>a.minX-b.minX).forEach((part,i)=>{const id=['lili','noa','mina'][i],left=Math.max(0,part.minX-4),top=Math.max(0,part.minY-4),body=document.createElement('canvas');body.width=Math.min(w-left,part.maxX-left+5);body.height=Math.min(h-top,part.maxY-top+5);const ctx=body.getContext('2d'),out=ctx.createImageData(body.width,body.height);for(let y=0;y<body.height;y++)for(let a=0;a<body.width;a++){const src=(top+y)*w+left+a;if(expanded[src]===part.label)for(let k=0;k<4;k++)out.data[(y*body.width+a)*4+k]=data[src*4+k];}ctx.putImageData(out,0,0);battlers[id]={body,grip:[grips[id][0]*w/1536-left,grips[id][1]*h/1024-top]};});
}
const weaponGrips={lili:{forest:[.235,.69],moon:[.26,.68],sea:[.20,.70],snow:[.215,.70]},noa:{forest:[.17,.79],moon:[.18,.79],sea:[.15,.80],snow:[.17,.79]},mina:{forest:[.25,.85],moon:[.25,.85],sea:[.25,.85],snow:[.25,.85]}};
function equippedSprite(s,id){
 const part=battlers[id],theme=s.armory?.equipped?.[id]||'forest',key=id+'-'+theme,weapon=weaponSprites[key];if(!part||!weapon)return null;if(equippedSprites.has(key))return equippedSprites.get(key);
 const {body,grip}=part,ratio=body.height*(id==='mina'?.37:id==='lili'?.72:.65)/weapon.height,ww=weapon.width*ratio,wh=weapon.height*ratio,[gx,gy]=weaponGrips[id][theme],wx=grip[0]-ww*gx,wy=grip[1]-wh*gy,left=Math.floor(Math.min(0,wx)-3),top=Math.floor(Math.min(0,wy)-3),c=document.createElement('canvas');c.width=Math.ceil(Math.max(body.width,wx+ww)-left+3);c.height=Math.ceil(Math.max(body.height,wy+wh)-top+3);const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';
 x.drawImage(body,-left,-top);x.drawImage(weapon,wx-left,wy-top,ww,wh);
 // Put the closed hand back over the handle so the weapon reads as held.
 if(id!=='mina'){const r=body.height*(id==='lili'?.025:.033);x.save();x.beginPath();x.ellipse(grip[0]-left,grip[1]-top,r,r*1.1,-.2,0,Math.PI*2);x.clip();x.drawImage(body,-left,-top);x.restore();}
 const result={sprite:c,bodyWidth:body.width,bodyHeight:body.height,left,top};equippedSprites.set(key,result);return result;
}
// Large illustrations need filtered intermediate sizes to keep fine lines from aliasing.
// Cache each half-size once; portraits keep the original full-resolution sprite.
const spriteLevels=new WeakMap();
function scaledSprite(sprite,height){
 let levels=spriteLevels.get(sprite);if(!levels){levels=[sprite];spriteLevels.set(sprite,levels);}
 let level=0;while(levels[level].height>Math.max(1,height)*2){
  if(!levels[level+1]){const source=levels[level],small=document.createElement('canvas');small.width=Math.max(1,Math.round(source.width/2));small.height=Math.max(1,Math.round(source.height/2));const ctx=small.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,small.width,small.height);levels.push(small);}
  level++;
 }return levels[level];
}
function paint(x,id,cx,feet,height,alpha=1,angle=0){const s=sprites[id];if(!s)return;const width=height*s.width/s.height,transform=x.getTransform(),scale=Math.max(Math.hypot(transform.a,transform.b),Math.hypot(transform.c,transform.d)),source=scaledSprite(s,height*scale);x.save();x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.globalAlpha=alpha;x.translate(cx,feet);x.rotate(angle);x.drawImage(source,-width/2,-height,width,height);x.restore();}
function paintHero(x,s,id,cx,feet,height,alpha=1,angle=0){const item=equippedSprite(s,id);if(!item){paint(x,id,cx,feet,height,alpha,angle);return;}const k=height/item.bodyHeight,transform=x.getTransform(),scale=Math.max(Math.hypot(transform.a,transform.b),Math.hypot(transform.c,transform.d)),source=scaledSprite(item.sprite,item.sprite.height*k*scale);x.save();x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.globalAlpha=alpha;x.translate(cx,feet);x.rotate(angle);x.drawImage(source,(item.left-item.bodyWidth/2)*k,(item.top-item.bodyHeight)*k,item.sprite.width*k,item.sprite.height*k);x.restore();}
function enemyPoint(r,i){const e=r.enemies[i];return[r.enemies.length>1?725+i*145:e?.boss?765:780,428,e?.boss?(e.id==='golem'?255:225):e?.id==='golem'?155:e?.id==='straw'?145:e?.id==='slime'?115:130];}
function add(events,r){for(const e of events){
 if(e.type==='damage'){const p=e.side==='hero'?positions[e.id]:enemyPoint(r,e.index);if(p)effects.push({type:'number',x:p[0],y:p[1]-p[2]*.85,text:e.amount,color:e.side==='hero'?'#d35f53':'#fff3bd',life:.95});}
 if(e.type==='heal'){const p=positions[e.id];if(p)effects.push({type:'number',x:p[0],y:245,text:'＋'+e.amount,color:'#b0e5aa',life:1.1});}
 if(e.type==='attack'){const a=positions[e.hero],b=enemyPoint(r,e.target);effects.push({type:e.hero==='lili'?'fire':e.hero==='noa'?'slash':e.hero==='koharu'?'arrow':'leaf',x:a[0]+20,y:a[1]-90,tx:b[0],ty:b[1]-70,life:.48,double:e.double});}
 if(e.type==='upgrade'){const p=positions[e.hero];if(p)effects.push({type:'number',x:p[0],y:180,text:'LEVEL UP',color:'#ffdf8f',life:1.6});}
 if(e.type==='charm'){const p=positions[e.hero];if(p){effects.push({type:'charm-ring',x:p[0],y:p[1]-p[2]*.45,life:.7,color:['dew','acorn','bread','clover'].includes(e.charm)?'#d8edb3':'#ffdf9a'});for(const target of e.targets||[]){const b=enemyPoint(r,target);effects.push({type:e.charm==='feather'?'arrow':e.charm==='ember'?'meteor':'fire',x:p[0]+20,y:p[1]-(e.charm==='ember'?220:100),tx:b[0],ty:b[1]-75,life:.48});}}}
 }if(effects.length>65)effects.splice(0,effects.length-65);}
function bar(x,cx,y,value,max,width=100,shield=0){x.fillStyle='#4a453bcc';x.fillRect(cx-width/2-2,y-2,width+4,12);x.fillStyle='#e3d6bb';x.fillRect(cx-width/2,y,width,8);x.fillStyle=value/max<.25?'#d58b79':'#94b482';x.fillRect(cx-width/2,y,width*Math.max(0,value/max),8);if(shield>0){x.fillStyle='#a7d8e5';x.fillRect(cx-width/2,y+9,width*Math.min(1,shield/max),3);}}
function draw(canvas,s,r,dt=0){
 if(s.unlocked.koharu)Object.assign(positions,{mina:[185,425,158],koharu:[290,425,173],lili:[400,425,180],noa:[550,425,180]});else Object.assign(positions,{lili:[340,425,183],noa:[500,425,185],mina:[205,425,167]});
 const x=canvas.getContext('2d'),W=960,H=canvas.height,groundShift=(H-530)*.8;x.clearRect(0,0,W,H);x.imageSmoothingEnabled=true;
 if(forest){const pan=reduced.matches?0:Math.sin(r.time*.05)*15,bg=background(s);if(H<=530)x.drawImage(bg,-30+pan,-114,1020,680);else{const height=H*1.18,width=height*bg.width/bg.height;x.drawImage(bg,(W-width)/2+pan,425+groundShift-height*.82,width,height);}}else{x.fillStyle='#dce6c2';x.fillRect(0,0,W,H);}
 x.save();x.translate(0,groundShift);
 const move=r.mode==='travel'&&!reduced.matches,rest=['rest','camp','complete','town'].includes(r.mode);
 paint(x,s.wagon?'wagon':'cart',113,437,s.wagon?210:158,1,move?Math.sin(r.time*5)*.012:0);
 if(s.town.workshop){x.fillStyle='#82634b';x.fillRect(148,212,20,39);x.fillStyle='#b8936a';x.fillRect(144,209,28,7);for(let i=0;i<3;i++){x.fillStyle='#faf5e366';x.beginPath();x.arc(158+Math.sin(r.time+i)*5,203-i*13,6+i*2,0,Math.PI*2);x.fill();}}
 for(const h of [...r.heroes].reverse()){
  const p=positions[h.id],hop=reduced.matches?0:move?Math.sin(r.time*9+p[0])*-4:Math.sin(r.time*2+p[0])*-1.5,lunge=!rest&&h.pose>0&&!reduced.matches?Math.sin(h.pose/.36*Math.PI)*15:0;
  x.fillStyle='#4b503b25';x.beginPath();x.ellipse(p[0],430,p[2]*.25,8,0,0,Math.PI*2);x.fill();
  if(h.shield>0&&h.hp>0){x.save();x.fillStyle='#c8e9d92a';x.strokeStyle='#d5f2ebaa';x.lineWidth=3;x.beginPath();x.ellipse(p[0],p[1]-p[2]*.46,p[2]*.39,p[2]*.56,0,0,Math.PI*2);x.fill();x.stroke();x.restore();}
  paintHero(x,s,h.id,p[0]+lunge,p[1]+hop,p[2],h.hp<=0?.38:1,rest&&h.hp>0?-.025:0);
  if(!rest){bar(x,p[0],p[1]-p[2]-22,h.hp,h.maxHp,92,h.shield);x.font='bold 17px sans-serif';x.textAlign='center';x.fillStyle='#fff8e8';x.strokeStyle='#504a3c';x.lineWidth=3;x.strokeText(window.Tabi.HEROES[h.id].name,p[0],p[1]+24);x.fillText(window.Tabi.HEROES[h.id].name,p[0],p[1]+24);}
 }
 if(r.mode==='town'){const id=s.townId==='port'?'crab':s.townId==='mill'?'straw':'mole';paint(x,id,780,425,145);x.font='bold 17px sans-serif';x.textAlign='center';x.fillStyle='#fff9e8';x.fillRect(673,240,215,33);x.fillStyle='#6b7759';x.fillText('タップで道具屋へ',780,263);}
 if(r.mode==='fight')r.enemies.forEach((e,i)=>{const p=enemyPoint(r,i);if(e.hp<=0)return;const hop=reduced.matches?0:Math.sin(r.time*3+i)*2;
  if(e.boss&&e.actions%3===2&&e.cooldown<1){x.fillStyle='#e9a25c45';x.beginPath();x.ellipse(p[0],430,108,19,0,0,Math.PI*2);x.fill();}
  paint(x,e.id,p[0],p[1]+hop,p[2]);bar(x,p[0],p[1]-p[2]-18,e.hp,e.maxHp,e.boss?160:100,e.shield||0);if(e.boss){x.font='bold 18px sans-serif';x.fillStyle='#5f4d3f';x.textAlign='center';x.fillText(e.name,p[0],p[1]-p[2]-31);}
 });
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.life<=0){effects.splice(i,1);continue;}x.save();
  if(e.type==='charm-ring'){const t=1-e.life/.7;x.globalAlpha=e.life/.7;x.strokeStyle=e.color;x.lineWidth=3;x.beginPath();x.ellipse(e.x,e.y,reduced.matches?40:25+t*35,35,0,0,Math.PI*2);x.stroke();}
  else if(e.type==='number'){x.globalAlpha=Math.min(1,e.life*3);x.font='bold '+(typeof e.text==='string'&&e.text.length>4?22:32)+'px sans-serif';x.textAlign='center';x.strokeStyle='#62513d';x.lineWidth=4;const y=e.y-(reduced.matches?0:(1-e.life)*30);x.strokeText(String(e.text),e.x,y);x.fillStyle=e.color;x.fillText(String(e.text),e.x,y);}
  else{const t=1-e.life/.48,cx=e.x+(e.tx-e.x)*t,cy=e.y+(e.ty-e.y)*t;if(e.type==='meteor'){x.strokeStyle='#fff0b5';x.lineWidth=3;x.beginPath();x.moveTo(cx-18,cy-13);x.lineTo(cx,cy);x.stroke();x.fillStyle='#ffdf83';x.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,r=k%2?4:10;k?x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):x.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}x.closePath();x.fill();}else if(e.type==='fire'){for(let k=0;k<(e.double?2:1);k++){const yy=cy+k*23;x.shadowBlur=0;x.fillStyle='#ef9d49';x.beginPath();x.ellipse(cx,yy,22,9,-.2,0,Math.PI*2);x.fill();x.fillStyle='#fff2a9';x.beginPath();x.ellipse(cx+3,yy,10,5,-.2,0,Math.PI*2);x.fill();}}else if(e.type==='slash'){x.strokeStyle='#e7f1fa';x.lineWidth=5;x.beginPath();x.arc(e.tx,e.ty,40,-1.2,1.1);x.stroke();}else if(e.type==='arrow'){x.strokeStyle='#89633d';x.lineWidth=4;x.beginPath();x.moveTo(cx-20,cy);x.lineTo(cx+18,cy);x.stroke();x.fillStyle='#eadbb7';x.beginPath();x.moveTo(cx+25,cy);x.lineTo(cx+12,cy-7);x.lineTo(cx+12,cy+7);x.closePath();x.fill();}else{x.fillStyle='#d5eda0';x.beginPath();x.ellipse(cx,cy,10,5,-.5,0,Math.PI*2);x.fill();}}
  x.restore();
 }
 x.restore();
 if(r.heroBuff>0){x.strokeStyle='#efd99488';x.lineWidth=4;x.strokeRect(5,5,W-10,H-10);}
}
window.TabiArt={weaponURL:id=>weaponURLs[id],weaponURLs,background,sceneryURL:id=>backgroundURLs[id]||backgroundURLs.forest,load,paint,paintHero,draw,add,url:id=>urls[id],sprites,enemyPoint};
})();
