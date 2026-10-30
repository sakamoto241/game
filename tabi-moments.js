/* Brief storybook highlights. Presentation only: the simulation never waits for these. */
(function(){
'use strict';
const ORDER=['noa','mina','koharu','lili'];
const ROLES={noa:'ノアが、みんなを守る。',mina:'ミナの祈りが、力になる。',koharu:'コハルが、道をひらく。',lili:'リリの魔法に、想いをのせて。'};
class Director{
 constructor(element,announcement,art,game){this.element=element;this.announcement=announcement;this.art=art;this.game=game;this.active=null;this.queue=[];this.phase=-1;this.world=document.querySelector('.world');this.resources=document.querySelector('.resources');document.body.append(element);}
 roster(s,r,ids){const present=ids||r.heroes.filter(h=>h.hp>0).map(h=>h.id);return ORDER.filter(id=>present.includes(id)).map(id=>({id,name:this.game.HEROES[id].name,url:this.art.heroURL(s,id)}));}
 consume(events,s,r){for(const e of events){
  if(e.type==='rally'){const cast=this.roster(s,r,e.heroes);this.push({kind:'rally',title:cast.length>1?'木漏れ日の約束':'リリの小さな決意',label:cast.length>1?'連携技':'小さな魔法',caption:cast.length>1?'みんなの力を、ひとつに。':'小さな勇気が、力になる。',cast,duration:2.35});}
  if(e.type==='join'){const cast=this.roster(s,r,[e.hero]);this.push({kind:'join',title:this.game.HEROES[e.hero].name+'が仲間になった！',label:'新しい旅の仲間',caption:{noa:'「前は、わたしにまかせて。」',mina:'「みんなで、お茶にしようね。」',koharu:'「この弓で、力になれたら。」'}[e.hero],cast,duration:2.6});}
  if(e.type==='boss_victory'){const next={4:'森の奥へ、道がつながった。',8:'森の主まで、あと少し。',12:'帰る場所を、つくりに行こう。',18:'水車の町へ、道がつながった。',24:'港町に、灯りが見える。',30:'星の歯車を、工房へ届けよう。'}[e.stage];this.push({kind:'victory',title:e.name+'をこえた！',label:'一行の小さな大冒険',caption:next||'またひとつ、旅の思い出ができた。',cast:this.roster(s,r),duration:2.7});}
  if(e.type==='upgrade'&&e.weapon){this.push({kind:'equipment',title:this.game.WEAPONS[e.weapon].name,label:'新しい旅じたく',caption:this.game.HEROES[e.hero].name+'が装備を持ち替えた。',cast:this.roster(s,r,[e.hero]),item:this.art.weaponURL(e.weapon),duration:1.9});}
 }}
 push(moment){if(!moment.cast.length)return;
  // Rapid equipment changes show the latest selection, rather than a long backlog.
  this.queue=this.queue.filter(m=>m.kind!==moment.kind);
  if(!this.active||this.active.kind===moment.kind||(this.active.kind==='equipment'&&moment.kind!=='equipment')){this.start(moment);return;}
  this.queue.push(moment);if(this.queue.length>3)this.queue.shift();
 }
 start(moment){this.active={...moment,age:0};this.phase=-1;const e=this.element;e.hidden=false;e.dataset.kind=moment.kind;e.dataset.phase='';e.className='world-moment moment-'+moment.kind;e.style.setProperty('--moment-left','100%');e.setAttribute('aria-label',moment.label+'。'+moment.title+'。'+moment.caption);
  e.innerHTML=`<div class="moment-heading"><small>${moment.label}</small><strong>${moment.title}</strong></div><div class="moment-cast">${moment.item?`<img class="moment-item" src="${moment.item}" alt="">`:''}${moment.cast.map((h,i)=>`<div class="moment-member" data-moment-hero="${h.id}" style="--moment-order:${i}"><span class="moment-portrait"><img src="${h.url}" alt="" draggable="false"></span><b>${h.name}</b></div>`).join('')}</div><p class="moment-caption">${moment.caption}</p><i class="moment-meter" aria-hidden="true"></i>`;
  this.announcement.textContent=moment.title+'。'+moment.caption;
  this.place();
 }
 place(){const e=this.element,rect=this.world.getBoundingClientRect(),landscape=matchMedia('(orientation:landscape) and (max-height:520px)').matches,minTop=Math.max(8,this.resources.getBoundingClientRect().bottom+8),desired=rect.top+(landscape?8:rect.width<360?62:66),docked=desired<minTop||rect.bottom-minTop<e.offsetHeight+12;e.classList.toggle('is-docked',docked);const width=Math.min(landscape?240:430,rect.width-28),height=e.offsetHeight,inside=rect.bottom-minTop>=height+12,top=inside?Math.min(Math.max(desired,minTop),rect.bottom-height-8):minTop;e.style.width=width+'px';e.style.left=(landscape?rect.right-width/2-12:rect.left+rect.width/2)+'px';e.style.right='auto';e.style.top=Math.min(top,Math.max(8,innerHeight-height-12))+'px';e.style.translate='-50% 0';}
 update(dt,paused=false){if(!this.active)return;const m=this.active,e=this.element;this.place();e.classList.toggle('is-paused',paused);if(paused)return;m.age+=Math.max(0,dt);e.style.setProperty('--moment-left',Math.max(0,1-m.age/m.duration)*100+'%');e.classList.toggle('is-finishing',m.age>m.duration-.25);
  if(m.kind==='rally'){const index=Math.floor((m.age-.12)/.43),phase=index>=0&&index<m.cast.length?index:-1;if(this.phase!==phase){this.phase=phase;e.dataset.phase=phase<0?'together':m.cast[phase].id;e.querySelectorAll('.moment-member').forEach((el,i)=>el.classList.toggle('is-leading',i===phase));e.querySelector('.moment-caption').textContent=phase<0?m.caption:ROLES[m.cast[phase].id];}}
  if(m.age>=m.duration){this.active=null;e.hidden=true;e.dataset.kind='';if(this.queue.length)this.start(this.queue.shift());}
 }
 blocksStory(){return !!(this.active&&this.active.kind!=='equipment');}
}
window.TabiMoments={create:(element,announcement,art,game)=>new Director(element,announcement,art,game)};
})();
