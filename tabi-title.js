/* The title has its own illustration clock; it never advances the saved adventure. */
(function(){
'use strict';
class Title{
 constructor(element,art,icons,game){this.element=element;this.art=art;this.icons=icons;this.game=game;this.canvas=element.querySelector('canvas');this.button=element.querySelector('[data-start]');this.time=0;this.loaded=false;this.background=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');element.querySelector('#title-retry').onclick=()=>location.reload();}
 async ready(s,hasSave){const image=new Image();image.src=this.art.sceneryURL('village');await image.decode();this.background=image;this.loaded=true;this.element.querySelector('.title-sprig').innerHTML=this.icons.html('herb');this.show(s,hasSave);}
 show(s,hasSave){this.state={...s,armory:s.armory};this.element.hidden=false;document.body.classList.add('at-title');document.querySelector('.game').inert=true;this.button.disabled=!this.loaded;this.button.querySelector('span').textContent=hasSave?'つづきから':'旅をはじめる';this.element.querySelector('#title-save-hint').textContent=hasSave?(s.location==='town'?this.game.TOWNS[s.townId].name:this.game.region(s).name+'・道 '+s.stage+' / '+this.game.TOTAL_STAGES)+'から、旅のつづきへ。':'小さな魔女と、帰る場所をつくる旅。';this.element.querySelector('#title-load-status').textContent='';this.draw(0);}
 hide(){this.element.hidden=true;document.body.classList.remove('at-title');document.querySelector('.game').inert=false;}
 fail(){this.element.querySelector('#title-load-status').textContent='絵を読み込めませんでした。もう一度お試しください。';this.element.querySelector('#title-retry').hidden=false;this.button.disabled=true;}
 draw(dt){if(this.element.hidden||!this.loaded)return;this.time+=dt;const c=this.canvas,rect=this.element.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio);if(c.width!==width||c.height!==height){c.width=width;c.height=height;}const x=c.getContext('2d'),scale=c.width/960,H=c.height/scale,t=this.reduced.matches?0:this.time;x.setTransform(scale,0,0,scale,0,0);x.clearRect(0,0,960,H);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';
 const bg=this.background,k=Math.max(960/bg.width,H/bg.height)*1.025,w=bg.width*k,h=bg.height*k;x.drawImage(bg,(960-w)/2+Math.sin(t*.08)*12,H-h,w,h);
 // Small clouds and leaves move gently, away from the text and controls.
 if(rect.height>=rect.width)for(let i=0;i<3;i++){const px=((i*410+t*4)%1350)-160,py=H*.17+i*32;x.fillStyle='#fffcf34b';x.beginPath();x.ellipse(px,py,100,22,0,0,Math.PI*2);x.ellipse(px-30,py-12,42,26,0,0,Math.PI*2);x.ellipse(px+25,py-18,48,30,0,0,Math.PI*2);x.fill();}
 const landscape=rect.width>rect.height,feet=landscape?H*.76:H*.69,factor=landscape?.52:Math.min(1.2,Math.max(.96,H/1820));
 x.save();if(!landscape&&rect.height<620)x.translate(0,-14);const sway=Math.sin(t*.75)*.008;this.art.paint(x,'wagon',landscape?400:65,feet+2,215*factor,1,sway*.5);
 for(const[id,cx,size,phase]of[['mina',170,284,0],['koharu',345,309,1],['lili',500,300,2],['noa',750,292,3]]){const px=landscape?355+cx*.64:cx,bob=this.reduced.matches?0:Math.sin(t*1.2+phase)*2.5;x.fillStyle='#6d68422b';x.beginPath();x.ellipse(px,feet+5,size*factor*.22,10*factor,0,0,Math.PI*2);x.fill();this.art.paintHero(x,this.state,id,px,feet+bob,size*factor,1,this.reduced.matches?0:Math.sin(t*.8+phase)*.008);}x.restore();
 for(let i=0;i<6;i++){const px=i%2?950:10,py=H*.72+i*18,a=Math.sin(t*.9+i)*.09;x.save();x.translate(px,py);x.rotate(a);x.strokeStyle='#8ca17780';x.lineWidth=4;x.beginPath();x.moveTo(0,35);x.quadraticCurveTo(i%2?-18:18,-12,i%2?-28:28,-45);x.stroke();x.fillStyle='#b6c69399';x.beginPath();x.ellipse(i%2?-18:18,-17,10,22,i%2?-.7:.7,0,Math.PI*2);x.fill();x.restore();}
 }
}
window.TabiTitle={create:(element,art,icons,game)=>new Title(element,art,icons,game)};
})();
