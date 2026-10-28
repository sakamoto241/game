/* PAST / ME: limited-palette comic sprites and an inked arena. */
(() => {
  'use strict';
  const image = new Image();
  image.src = './echo-comic.png';
  const ink = '#151d2b';
  const ready = new Promise(resolve => {
    if (image.complete) resolve(!!image.naturalWidth);
    else {
      image.addEventListener('load', () => resolve(true), {once:true});
      image.addEventListener('error', () => resolve(false), {once:true});
    }
  });
  function polygon(c, points, fill, stroke=ink, width=3) {
    c.beginPath();
    points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
    c.closePath();
    if (fill) { c.fillStyle=fill; c.fill(); }
    if (stroke) { c.strokeStyle=stroke; c.lineWidth=width; c.lineJoin='round'; c.stroke(); }
  }
  function fighter(c,x,y,opts={}) {
    const {past=false,angle=0,alpha=1,scale=1,moving=false,attack=false,time=0,flash=false,number=null,shadow=true}=opts;
    c.save(); c.translate(x,y); c.scale(scale,scale); c.globalAlpha=alpha;
    const stride=Math.floor(time*8)%2;
    if(shadow) {
      c.fillStyle='#11192866'; c.beginPath(); c.ellipse(0,20,16,5,0,0,Math.PI*2); c.fill();
      c.strokeStyle=past?'#e477a3':'#7fd9c7'; c.lineWidth=2; c.beginPath(); c.ellipse(0,19,16,5,0,0,Math.PI*2); c.stroke();
    }
    const frame=attack?2:moving&&stride?1:0;
    if(image.complete&&image.naturalWidth) {
      const sw=image.naturalWidth/3, sh=image.naturalHeight/2;
      c.save();
      if(Math.cos(angle)<-.1) c.scale(-1,1);
      if(moving) {c.translate(0,stride?-1:1);c.rotate(stride?.018:-.018);}
      if(flash) c.filter='brightness(1.9)';
      // Keep neighbouring poses outside this frame's transparent side margins.
      const inset=12, edge=inset/sw*70;
      c.drawImage(image,frame*sw+inset,past?sh:0,sw-inset*2,sh,-35+edge,-43,70-edge*2,70);
      c.restore();
    } else {
      const cloth=past?'#644064':'#286775', edge=past?'#d26b95':'#8bd8d2';
      polygon(c,[[-12,-15],[12,-15],[17,14],[-17,14]],cloth);
      polygon(c,[[-10,-15],[-7,-27],[7,-28],[12,-15]],past?'#644064':'#e8e4d8');
      c.fillStyle=edge;c.fillRect(-7,-15,4,3);c.fillRect(3,-15,4,3);
      polygon(c,[[12,-2],[28,-23],[32,-21],[16,5]],edge);
      c.fillStyle=ink;c.fillRect(-11,14,8,8);c.fillRect(4,14,8,8);
    }
    if(number!==null) {
      c.fillStyle='#151d2b';c.fillRect(-10,-51,20,12);c.fillStyle='#fff0d5';
      c.font='800 8px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(String(number),0,-44.5);
    }
    if(attack) {
      c.save(); c.rotate(angle);
      c.strokeStyle=past?'#f295b7':'#b2f0e0';c.lineWidth=2.5;c.beginPath();c.arc(2,-5,28,-.65,.55);c.stroke();
      c.restore();
    }
    c.restore();
  }
  function noise(c,x,y,time=0,alpha=1) {
    c.save();c.translate(x,y+Math.sin(time*5)*2);c.globalAlpha=alpha;
    polygon(c,[[-11,13],[-16,-4],[-10,-15],[-4,-9],[3,-12],[11,-18],[12,-8],[17,-2],[11,13],[4,9],[-3,16]],'#b87555');
    polygon(c,[[-9,-5],[-2,-2],[-6,3]],'#ffe1a2',null);
    polygon(c,[[3,-2],[10,-6],[7,3]],'#ffe1a2',null);
    c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.moveTo(-3,7);c.lineTo(4,6);c.stroke();c.restore();
  }
  const floorCanvas=document.createElement('canvas');floorCanvas.width=480;floorCanvas.height=540;
  function buildFloor() {
    const c=floorCanvas.getContext('2d');
    c.fillStyle='#172332';c.fillRect(0,0,480,540);
    const colors=['#38434e','#3b4650','#3c4750','#35424b'];
    for(let row=0;row<14;row++)for(let col=0;col<13;col++){
      const x=col*40-(row%2)*20,y=row*40;
      c.fillStyle=colors[(col*7+row*3)%colors.length];c.fillRect(x+1,y+1,38,38);
      c.strokeStyle='#26333e';c.lineWidth=1.5;c.strokeRect(x,y,40,40);
      c.fillStyle='#58616a';c.fillRect(x+3,y+3,14+(col%3)*4,1);
    }
    // A restrained clock motif keeps the battlefield legible beneath projectiles.
    c.save();c.translate(240,270);c.strokeStyle='#8d948366';c.lineWidth=2;
    for(const radius of [91,109]){c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.stroke();}
    for(let i=0;i<12;i++){c.save();c.rotate(i*Math.PI/6);c.beginPath();c.moveTo(0,-99);c.lineTo(0,-106);c.stroke();c.restore();}
    c.beginPath();c.moveTo(0,-56);c.lineTo(0,0);c.lineTo(37,24);c.stroke();c.restore();
    for(const [x,y] of [[88,126],[376,178],[150,372],[344,424],[223,101],[75,434]]){
      c.strokeStyle='#24313b';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+10,y+5);c.lineTo(x+7,y+12);c.lineTo(x+17,y+18);c.stroke();
    }
    // Graphic wall blocks: two flat tones, an ink edge, no photographic texture.
    c.fillStyle='#26323c';c.fillRect(0,0,480,35);c.fillRect(0,505,480,35);c.fillRect(0,0,29,540);c.fillRect(451,0,29,540);
    for(let x=0;x<480;x+=48){polygon(c,[[x,2],[x+46,2],[x+46,25],[x,25]],'#74796c');polygon(c,[[x,508],[x+46,508],[x+46,532],[x,532]],'#74796c');}
    for(let y=35;y<505;y+=47){polygon(c,[[2,y],[22,y],[22,y+44],[2,y+44]],'#647264');polygon(c,[[458,y],[478,y],[478,y+44],[458,y+44]],'#647264');}
    c.strokeStyle=ink;c.lineWidth=4;c.strokeRect(28,34,424,472);
    for(const [x,y] of [[38,44],[442,44],[38,496],[442,496]]){
      polygon(c,[[x-15,y-13],[x+15,y-13],[x+15,y+11],[x-15,y+11]],'#7e816e');
      polygon(c,[[x,y-7],[x+8,y],[x,y+8],[x-8,y]],'#9bd5ba');
    }
    for(const [x,y,flip] of [[18,170,1],[463,360,-1],[16,465,1],[461,95,-1]]){
      polygon(c,[[x-7,y+13],[x-9,y-8],[x+1,y+1],[x+3,y-15],[x+8,y],[x+12,y-6],[x+9,y+13]],flip>0?'#466958':'#536a53',ink,2);
    }
  }
  buildFloor();
  function floor(c,w=480,h=540) {c.drawImage(floorCanvas,0,0,w,h);}
  function cover(canvas) {
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    c.clearRect(0,0,w,h);
    polygon(c,[[0,0],[w*.62,0],[w*.41,h],[0,h]],'#7eb8ad',null);
    polygon(c,[[w*.62,0],[w,0],[w,h],[w*.41,h]],'#ad7a99',null);
    c.fillStyle='#17233222';for(let x=8;x<w;x+=15)for(let y=8;y<h;y+=15){c.beginPath();c.arc(x,y,1.5,0,Math.PI*2);c.fill();}
    c.strokeStyle=ink;c.lineWidth=6;c.beginPath();c.moveTo(w*.62,0);c.lineTo(w*.41,h);c.stroke();
    fighter(c,w*.19,h*.58,{angle:0,scale:4.4,shadow:false});
    fighter(c,w*.83,h*.58,{past:true,angle:Math.PI,scale:4.4,shadow:false});
    c.strokeStyle='#fff0ce77';c.lineWidth=3;
    for(let i=0;i<5;i++){c.beginPath();c.moveTo(0,100+i*38);c.lineTo(70,140+i*28);c.stroke();c.beginPath();c.moveTo(w,100+i*38);c.lineTo(w-70,140+i*28);c.stroke();}
  }
  function impact(c,x,y,text,scale=1,color='#f2d57b') {
    c.save();c.translate(x,y);c.scale(scale,scale);
    const points=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,r=i%2?38:54;points.push([Math.cos(a)*r,Math.sin(a)*r*.64]);}
    polygon(c,points,color,ink,3);c.fillStyle=ink;c.font='900 18px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,0,0);c.restore();
  }
  function paper(c,w,h) {
    c.fillStyle='#f4ead1';c.fillRect(0,0,w,h);
    c.fillStyle='#202a3610';for(let x=8;x<w;x+=15)for(let y=8;y<h;y+=15){c.beginPath();c.arc(x,y,1.1,0,Math.PI*2);c.fill();}
    c.strokeStyle=ink;c.lineWidth=5;c.strokeRect(22,22,w-44,h-44);
  }
  function result(canvas,r) {
    const c=canvas.getContext('2d');c.clearRect(0,0,1000,1000);paper(c,1000,1000);
    polygon(c,[[43,245],[957,245],[957,523],[43,523]],'#8cb7ac',ink,4);
    polygon(c,[[630,245],[957,245],[957,523],[470,523]],'#b582a0',null);
    c.textAlign='center';c.fillStyle='#647266';c.font='800 19px monospace';c.fillText('PAST / ME · REPLAY SURVIVAL',500,91);
    c.fillStyle=ink;c.font='900 61px sans-serif';c.fillText('敵は、さっきの俺。',500,181);
    fighter(c,365,425,{scale:3.6,shadow:false});
    fighter(c,730,425,{past:true,angle:Math.PI,scale:3.6,attack:true,shadow:false});
    impact(c,510,302,'俺!?',1.05);
    c.fillStyle=ink;c.font='900 118px monospace';c.fillText(String(r.score),500,648);
    c.font='800 20px monospace';c.fillStyle='#5e7767';c.fillText('POINTS',500,688);
    c.fillStyle=ink;c.font='900 29px sans-serif';c.fillText('LOOP '+String(r.loop).padStart(2,'0')+' 到達 / 過去の俺を '+r.kills+' 人撃破',500,759);
    c.fillStyle='#9f4a70';c.font='800 23px sans-serif';
    const line=r.reason==='rift'?'さっきの足元に、やられた。':r.reason==='noise'?'俺たちの戦いに、ノイズが乱入。':'負けた相手は、LOOP '+String(r.reason).padStart(2,'0')+' の俺。';
    c.fillText(line,500,810);
    c.strokeStyle=ink;c.lineWidth=3;c.beginPath();c.moveTo(90,855);c.lineTo(910,855);c.stroke();
    c.fillStyle=ink;c.font='900 26px sans-serif';c.fillText('この記録、超えられる？',500,910);
    c.fillStyle='#5c7668';c.font='800 17px sans-serif';c.fillText('#敵はさっきの俺',500,945);
  }
  function poster(canvas) {
    const c=canvas.getContext('2d');paper(c,1200,630);
    polygon(c,[[650,25],[1175,25],[1175,605],[575,605]],'#88b9ac',null);
    polygon(c,[[950,25],[1175,25],[1175,605],[830,605]],'#b8849c',null);
    c.strokeStyle=ink;c.lineWidth=4;c.beginPath();c.moveTo(650,25);c.lineTo(575,605);c.stroke();
    fighter(c,797,430,{scale:5,shadow:false});
    fighter(c,1015,425,{past:true,angle:Math.PI,scale:4.2,attack:true,shadow:false});
    c.fillStyle='#527567';c.font='900 21px monospace';c.fillText('PAST / ME',64,90);
    c.font='600 12px monospace';c.fillText('COMIC REPLAY SURVIVAL',65,115);
    c.fillStyle=ink;c.font='900 70px sans-serif';c.fillText('敵は、',58,238);
    c.font='900 78px sans-serif';c.fillText('さっきの俺。',56,339);
    c.fillStyle='#9f4a70';c.font='900 28px sans-serif';c.fillText('その動き、次は敵。',65,419);
    c.fillStyle='#5d7163';c.font='700 20px sans-serif';c.fillText('10秒前の自分と戦う、自己対戦ゲーム。',65,462);
    polygon(c,[[64,511],[415,511],[415,563],[64,563]],'#f2d57b',ink,3);
    c.fillStyle=ink;c.font='900 17px sans-serif';c.fillText('生き残った自分が、次の敵になる。',83,545);
    impact(c,899,125,'俺!?',1.1);
  }
  window.EchoComic={ready,fighter,noise,floor,cover,impact,result,poster};
})();
