(async function(){
'use strict';
const I=window.TabiIcons,G=window.Tabi,S=window.TabiStory,A=window.TabiArt,$=s=>document.querySelector(s),KEY='lili-tabijitaku-v1',canvas=$('#world'),modal=$('#modal');
let s=null;try{s=G.load(JSON.parse(localStorage.getItem(KEY)));}catch(_){}
let running=!!s,tab='home',townFacility='routes',memoryReplay=false,toastTimer,lastFrame=performance.now(),acc=0,saveClock=0,uiClock=0,lastProgress='',failedSave=false;
if(!s)s=G.newGame();const away=running?G.offline(s):{coins:0},r=G.createRun(s);
const conversation=$('#conversation');let talk=null,talkLog=[],talkChars=[],talkVisible=0,talkElapsed=0,talkQueue=s.story.pending,autoTalksAllowed=true,talkCooldown=0,lastStoryHighest=s.highest;
function syncScenerySize(){const rect=$('.world').getBoundingClientRect();if(rect.width>0){const height=Math.max(530,Math.min(1400,Math.round(rect.height/rect.width*960)));if(canvas.height!==height)canvas.height=height;}}
syncScenerySize();
const coin=n=>Number.isFinite(n)?Math.floor(n).toLocaleString('ja-JP'):'MAX';
const art=(id,cls='')=>`<img src="${A.url(id)}" alt="${id==='cart'?'手押し車':id==='wagon'?'屋根付き馬車':G.HEROES[id]?.name||({mole:'麦わらもぐら',straw:'風のかかし',crab:'潮のヤドカリ',owl:'雪ふくろう',slime:'スライム',mushroom:'もりきのこ',golem:'石の守り人'}[id])||id}" class="${cls}" draggable="false">`;
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600);}
function save(){if(!running)return;try{s.savedAt=Date.now();const snapshot={...s};if(r.mode==='travel'||r.mode==='rest'){snapshot.stage=r.nextStage;snapshot.encounter=r.nextEncounter;}localStorage.setItem(KEY,JSON.stringify(snapshot));}catch(_){if(!failedSave){failedSave=true;$('#save-status').textContent='このブラウザでは保存できません';toast('保存できません。ブラウザのストレージ設定を確認してください。');}}}
function open(html){$('#close').hidden=!running;$('#modal-content').innerHTML=html;if(!modal.open)modal.showModal();modal.scrollTop=0;}
function close(){modal.close();}
$('#close').onclick=close;modal.addEventListener('cancel',e=>{if(!running)e.preventDefault();});
function welcome(){open(`<span class="eyebrow">はじめての旅</span>${art('lili','intro-portrait')}<h2>小さな魔女と、<br>旅の支度を。</h2><p>おばあちゃんが残した、壊れた移動工房。<br>台車に設計図を積んで、リリは森へ。<br>仲間と出会い、まずは雨をしのげる屋根をつくろう。</p><div class="actions"><button class="primary" data-start>リリと旅に出る →</button></div><p style="font-size:10px;margin-bottom:0">採集・料理・装備・作戦・依頼も楽しめます。自動保存。</p>`);}
const SECTIONS={adventure:[['home','旅の支度'],['outing','採集'],['journal','依頼・図鑑'],['wagon','荷馬車']],party:[['friends','仲間'],['magic','リリの魔法'],['equipment','装備'],['story','絆・会話']],items:[['bag','道具袋'],['cooking','料理'],['materials','素材']],town:[]};
function sectionOf(key){return Object.keys(SECTIONS).find(k=>SECTIONS[k].some(([id])=>id===key))||(key==='workshop'?'items':'town');}
function symbol(name){return I.html(({adventure:'map',party:'party',items:'bag',town:'town'})[name]||name);}
function renderNavigation(){const group=sectionOf(tab);for(const b of document.querySelectorAll('[data-section]')){const on=b.dataset.section===group;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));}$('#section-tabs').innerHTML=SECTIONS[group].map(([id,label])=>`<button data-tab="${id}" class="${id===tab?'active':''}" aria-selected="${id===tab}">${label}</button>`).join('');$('#section-tabs').hidden=group==='town';$('#section-tabs').setAttribute('aria-label',{adventure:'冒険',party:'仲間',items:'持ち物',town:'町'}[group]+'のメニュー');}
function equipmentArt(id,lv){return `<div class="equipment-illustration">${I.html(id==='lili'?'magic':id==='noa'?'equipment':'herb')}${lv>0?`<span class="equipment-badge">${I.html(lv>=3?'crystals':'herb')}</span>`:''}</div>`;}
function renderCollection(){
 if(tab==='home'){$('#panel').innerHTML=`<div class="journey-card"><span class="eyebrow">きょうの旅じたく</span><h2>${s.location==='town'?G.TOWNS[s.townId].name:G.region(s).name}</h2><p>${objective()}</p><div class="quick-actions"><button data-tab="friends">${symbol('party')}<b>仲間を育てる</b><small>強化・魔法・装備</small></button><button data-tab="outing">${I.html('gather')}<b>素材を集める</b><small>採集かごを送る</small></button><button data-tab="cooking">${I.html('cooking')}<b>料理を作る</b><small>回復や戦闘のお助け</small></button><button data-tab="journal">${I.html('quest')}<b>依頼を確認</b><small>報酬と魔物図鑑</small></button></div></div>`;return;}
 if(tab==='equipment'){$('#panel').innerHTML=supplyBar()+'<div class="section-heading"><h2>三人の装備じたく</h2><p>仕立ての段階に合わせて、装備の意匠が変わります。</p></div>'+Object.entries(G.GEAR).map(([id,d])=>{const lv=s.gear[id],max=s.town.workshop?5:3;return `<article class="equipment-card"><div class="equipment-display">${equipmentArt(id,lv)}${art(id)}</div><div><small>${G.HEROES[id].name}の装備　${lv}/${max}</small><h2>${id==='lili'?(lv>=3?'月あかりの杖':lv>0?'花飾りの杖':'旅の木の杖'):id==='noa'?(lv>=3?'月紋の剣':lv>0?'花結びの剣':'旅の剣'):(lv>=3?'月葉の枝杖':lv>0?'花咲く枝杖':'祈りの枝杖')}</h2><p>${d.name}<br>${d.text}</p><small>${id!=='lili'&&!s.unlocked[id]?'仲間になると仕立てられます':lv>=max?'仕立て上がりました':materialText(G.gearCost(s,id))}</small><button class="secondary" data-equip="${id}">${lv>=max?'完成':'仕立てる'}</button></div></article>`;}).join('');return;}
 const materials=tab==='materials';$('#panel').innerHTML=`<div class="section-heading"><h2>${materials?'旅で集めた素材':'道具袋'}</h2><p>${materials?'料理・装備・町の依頼に使えます。':'戦闘中に使うと、仲間を助けられます。'}</p></div>`+(materials?`<div class="material-grid">${['herb','berry','ore','star'].map((id,i)=>`<article><span>${I.html(id)}</span><b>${G.ITEMS[id]}</b><strong data-bag="${id}">${s.bag[id]}</strong></article>`).join('')}</div><button class="primary" data-tab="outing">採集へ →</button>`:Object.entries(G.RECIPES).map(([id,d])=>`<article class="inventory-card"><div class="item-symbol ${id}">${I.html(id)}</div><div><h2>${d.name}</h2><p>${d.text}</p><small>所持 <b data-bag="${id}">${s.bag[id]}</b></small></div><button class="secondary" data-bag-use="${id}">使う</button></article>`).join('')+'<button class="primary" data-tab="cooking">料理を作る →</button>');
}
function row({icon,title,level,text,fine='',key,skill=false,color='',disabled=false,learned=false}){
 if(!['noa','mina'].includes(key))icon=I.html(key==='ward'?'equipment':key==='bloom'?'herb':'magic');
 const d=skill?G.SKILLS[key]:G.UPGRADES[key],price=skill?d.cost:G.cost(s,key);
 return `<article class="upgrade-row"><div class="upgrade-icon ${color} ${key==='noa'||key==='mina'?'hero-icon':''}">${icon}</div><div class="upgrade-info"><h2>${title}${level?`<small>Lv.${level}</small>`:''}</h2><p>${text}</p>${fine?`<div class="fine">${fine}</div>`:''}</div><button class="buy ${skill?'skill':''} ${learned?'learned':''}" ${skill?'data-learn':'data-upgrade'}="${key}" ${disabled||learned?'disabled':''} aria-label="${title}を${skill?'覚える':'強化する'}">${learned?'習得済み':`${skill?'◆':'●'} ${coin(price)}<small>${skill?'覚える':'強化する'}</small>`}</button></article>`;
}
function renderPanel(){
 $('#objective').hidden=true;$('.travel-tools').hidden=tab!=='home';renderNavigation();
 if(tab==='story'){renderStory();updateUI();return;}
 if(tab==='town'){renderTown();updateUI();return;}
 if(['home','equipment','bag','materials'].includes(tab)){renderCollection();updateUI();return;}
 const st=G.stats(s,'lili');
 if(['outing','workshop','cooking','journal'].includes(tab)){renderExtras();updateUI();return;}
 if(tab==='magic')$('#panel').innerHTML=row({icon:'✹',title:'火の玉',level:s.upgrades.fire,text:`威力 ${Math.round(st.atk)} → ${Math.round(st.atk+4*(s.tactic==='rush'?1.2:s.tactic==='safe'?.9:1))}`,fine:'魔法が強くなると、敵を早く倒せる。',key:'fire'})+row({icon:'⚚',title:'木の杖',level:s.upgrades.staff,text:`魔力 ＋2 ・ HP ＋13`,fine:`リリのHP ${st.maxHp} → ${G.stats({...s,upgrades:{...s.upgrades,staff:Math.min(20,s.upgrades.staff+1)}},'lili').maxHp}`,key:'staff'})+row({icon:'✦',title:'ふたつの火',text:'火の玉が2つになる',fine:'合計威力が50%アップ。',key:'double',skill:true,learned:s.skills.double})+speech();
 else if(tab==='friends'){
  let html=`<article class="upgrade-row companion"><div class="upgrade-icon">${art('lili')}</div><div class="upgrade-info"><h2>リリ<small>魔法・後衛</small></h2><p>一行の、小さな魔法使い。</p><div class="hero-stat">HP ${st.maxHp}　魔力 ${st.atk}</div></div><button class="buy learned" data-tab="magic">魔法へ</button></article>`;
  for(const id of ['noa','mina']){const d=G.HEROES[id],yes=s.unlocked[id],h=G.stats(s,id);html+=yes?row({icon:art(id),title:d.name,level:s.upgrades[id],text:d.role,fine:`HP ${h.maxHp} ・ ${id==='noa'?'攻撃 '+h.atk:'回復 '+h.heal}`,key:id,color:id==='noa'?'blue':'green'}):`<article class="upgrade-row companion locked"><div class="upgrade-icon">？</div><div class="upgrade-info"><h2>${id==='noa'?'青いマントの剣士':'花の祈りの癒やし手'}</h2><p>森の道を${id==='noa'?'3':'6'}つ進むと、出会えます。</p></div></article>`;}
  if(s.unlocked.noa)html+=row({icon:'♧',title:'まもりの盾',text:'ノアが全員にバリア',fine:'3回攻撃するたびに発動。',key:'ward',skill:true,learned:s.skills.ward,color:'blue'});
  if(s.unlocked.mina)html+=row({icon:'❀',title:'花の祈り',text:'ミナが仲間全員を回復',fine:'3回目の回復が、全員に届く。',key:'bloom',skill:true,learned:s.skills.bloom,color:'green'});
  html+='<div class="cooperation"><b>連携技「木漏れ日の約束」</b>星がたまったら「おねがい！」。7秒間の攻撃アップ・バリア・回復。</div>';$('#panel').innerHTML=html+speech();
 }else{
  $('#panel').innerHTML=`<article class="wagon-panel"><span class="eyebrow">旅する、小さなおうち</span><h2>${I.html('wagon')}${s.wagon?'屋根付き馬車':'手押し車'} <small>Lv.${s.wagon+1}</small></h2><p>${s.wagon?'雨の日にも、帰る場所ができました。':'次の改築：屋根付き馬車'}</p><div class="wagon-view">${!s.wagon?art('cart')+'<span class="arrow">→</span>':''}${art('wagon',!s.wagon?'future':'')}</div><div class="benefits"><span>❀ 道中の回復量アップ</span><span>⚒ 杖の仕立て直し</span></div>${s.wagon?'<button class="buy" data-visit-town>町へ向かう →</button><div class="requirement">宿屋・道具屋・町の依頼。次の地域へ出発できます。</div><button class="secondary" data-replay>強い森で腕だめし</button>':`<button class="buy" data-renovate ${s.highest<12||s.wood<30?'disabled':''}>改築する　▰ 30</button><div class="requirement">${s.highest<12?'森の主を倒すと、改築できます。':s.wood<30?'木材があと'+(30-s.wood)+'必要です。':'準備ができました。はじめての、おうちへ。'}</div>`}${s.wagon?`<div class="craft-card"><b>装備づくり：花飾りの杖</b><small>リリの魔力＋6・HP＋20</small><button class="secondary" data-craft ${s.crafted||s.wood<6||s.crystals<1?'disabled':''}>${s.crafted?'仕立て直し済み':'仕立て直す　▰6 ◆1'}</button></div><div class="actions"><button class="secondary" data-ending>旅の思い出</button><button class="secondary" data-share>一行をシェア</button></div>`:''}<div class="requirement" style="margin-top:16px">装備は「仲間 → 装備」、料理は「持ち物 → 料理」へ。<br>森を越えたら「町」へ。麦畑・海岸・雪山を旅して、移動工房を直そう。</div></article>${speech()}`;
 }updateUI();
}
function enterTown(id){r.events=[];const result=G.visitTown(s,r,id);if(!result.ok){toast(result.error);return;}tab='town';townFacility='routes';consume(r.events);save();renderPanel();}
function renderTown(){
 if(!s.wagon){$('#panel').innerHTML='<div class="story-intro"><h2>森の向こうに、町がある。</h2><p>森の主を越え、荷馬車に屋根をつけると町へ向かえます。</p><button class="primary" data-tab="wagon">荷馬車の支度へ →</button></div>';return;}
 const town=G.TOWNS[s.townId];let html=`<div class="town-welcome"><span class="eyebrow">旅の立ち寄り先</span><h2>${town.name}</h2><p>${town.text}</p><small>町の評判 ${s.town.reputation} / ${G.TOWN_REQUESTS.length}　依頼 ${s.town.claimed.length}件達成</small><div class="town-travel">${Object.entries(G.TOWNS).map(([id,d])=>`<button class="${id===s.townId?'selected':''}" data-town="${id}" ${s.highest<d.need?'disabled':''}>${d.name}</button>`).join('')}</div><div class="inn-row"><span>${I.html('inn')}宿屋：全員のHPを回復<br><small>出発しても、傷はそのまま。休んで旅じたく。</small></span><button class="secondary" data-inn>泊まる ●40</button></div></div><nav class="town-facilities" aria-label="町の施設">${[['routes','出発'],['shop','道具屋'],['requests','依頼'],['repair','工房修理']].map(([id,name])=>`<button data-facility="${id}" class="${townFacility===id?'selected':''}" aria-pressed="${townFacility===id}">${name}</button>`).join('')}</nav>`;
 const navStart=html.indexOf('<nav class="town-facilities"'),welcome=html.slice(0,navStart),facilities=html.slice(navStart);html=facilities+(townFacility==='routes'?welcome:`<div class="town-mini"><b>${town.name}</b><button class="secondary" data-inn>宿屋 ●40</button></div>`);
 if(townFacility==='routes'){
  if(s.resume)html+=`<article class="activity-card route-card"><div><h3>途中の道から再開</h3><p>${G.PLACES[s.resume.stage-1]}・出会い ${s.resume.encounter+1}</p></div><button class="primary" data-depart="continue">つづきへ →</button></article>`;
  const recommended=G.REGIONS.find(d=>s.highest<d.end&&s.highest>=d.need)?.id||town.next;
  html+=[...G.REGIONS].sort((a,b)=>(a.id===recommended?-1:b.id===recommended?1:a.start-b.start)).map(d=>{const done=Math.max(0,Math.min(d.end-d.start+1,s.highest-d.start+1)),locked=s.highest<d.need;return `<article class="activity-card route-card"><div><small>${d.id===recommended?'次のおすすめの道　':''}道 ${d.start}〜${d.end}　踏破 ${done}/${d.end-d.start+1}</small><h3>${d.name}</h3><p>${d.description}</p>${locked?`<small>道${d.need}を踏破すると解放</small>`:''}</div><button class="${d.id===recommended?'primary':'secondary'}" data-depart="${d.id}" ${locked?'disabled':''}>${done===d.end-d.start+1?'再探索':'出発する'} →</button></article>`;}).join('');
 }else if(townFacility==='shop')html+=I.html('shop')+'<p class="story-hint">料理も素材も、コインで旅じたく。料理は戦闘中に道具袋から使えます。</p>'+Object.entries(G.GOODS).map(([id,d])=>`<article class="activity-card"><div><h3>${I.html(id)}${d.name}</h3><p>${materialText(d.reward)}</p><small>所持 ${G.ITEMS[id]} <b data-bag="${id}">${s.bag[id]}</b></small></div><button class="secondary" data-shop="${id}">買う ●${d.price}</button></article>`).join('');
 else if(townFacility==='requests')html+='<p class="story-hint">町の人へ、料理や素材を届けよう。報酬は各依頼につき1回です。</p>'+G.TOWN_REQUESTS.filter(d=>d.town===s.townId).map(d=>`<article class="activity-card"><div><small>${d.person}からのお願い</small><h3>${d.name}</h3><p>${d.text}</p><small>届ける：${materialText(d.cost)}<br>お礼：${materialText(d.reward)}</small></div><button class="secondary" data-fulfill="${d.id}">${s.town.claimed.includes(d.id)?'お届け済み':'届ける'}</button></article>`).join('');
 else html+=`<div class="workshop-repair"><span class="eyebrow">おばあちゃんの設計図の、つづき</span><h2>${s.town.workshop?'移動工房、完成！':'動く工房を、もう一度。'}</h2>${art('wagon')}<p>星見の山頂に眠る「星の歯車」を探そう。<br>港町で最後の部品を取りつければ、工房が動き出します。</p><div class="repair-benefits">全員の攻撃・回復 ＋15% ／ HP ＋25<br>専用装備が5段階まで強化可能に</div><p class="repair-materials">木材 ${s.wood}/20　鉱石 ${s.bag.ore}/20<br>魔石 ${s.crystals}/6　星の歯車 ${s.bag.star}/1</p><button class="primary" data-repair>${s.town.workshop?'修理完了':'工房を修理する'}</button><p class="story-hint">${s.town.workshop?'仲間と、帰る場所ごと旅をしよう。':s.highest<30?'道30の山頂で、星の歯車が見つかります。':s.townId!=='port'?'灯台の港町の修理場へ向かおう。':'足りない素材は採集や町の依頼で集められます。'}</p></div>`;
 $('#panel').innerHTML=html;
}
function updateTown(){
 $('#town-tab').disabled=false;$('#town-dot').hidden=!s.wagon||s.town.visited.length>0;
 for(const b of document.querySelectorAll('[data-shop]'))b.disabled=s.location!=='town'||s.coins<G.GOODS[b.dataset.shop].price;
 for(const b of document.querySelectorAll('[data-fulfill]')){const d=G.TOWN_REQUESTS.find(d=>d.id===b.dataset.fulfill);b.disabled=s.town.claimed.includes(d.id)||!G.canPay(s,d.cost);}
 for(const b of document.querySelectorAll('[data-inn]'))b.disabled=s.coins<40||!r.heroes.some(h=>h.hp<h.maxHp);
 for(const b of document.querySelectorAll('[data-repair]'))b.disabled=s.town.workshop||s.townId!=='port'||s.highest<30||!G.canPay(s,{wood:20,ore:20,crystals:6,star:1});
}
function sceneButton(c){return `<button class="scene-link" data-scene="${c.id}"><span>${s.story.read.includes(c.id)?'読了':'未読'}</span><b>${c.title}</b><i aria-hidden="true">›</i></button>`;}
function renderStory(){
 const pending=S.available(s),chapters=S.unlockedChapters(s);let html=`<div class="story-intro"><span class="eyebrow">仲間と、ひと休み</span><h2>今日は、何を話そう？</h2><p>会話は冒険の途中で始まります。<br>好物を作って贈ると、二人だけの話も。</p>${s.story.active?'<button class="primary" data-talk-prompt>会話のつづきへ →</button>':''}</div>`;
 for(const[id,d]of Object.entries(S.BONDS)){
  const joined=S.joined(s,id),hearts=s.story.bond[id],convos=S.conversations(s,id);html+=`<article class="bond-card"><div class="bond-top">${joined?art(id):'<span class="bond-unknown">？</span>'}<div><h3>${joined?G.HEROES[id].name:'まだ見ぬ旅の仲間'}</h3><p>${joined?'好物：'+G.ITEMS[d.favorite]:'森の道を'+(id==='noa'?3:6)+'つ進むと出会えます。'}</p><span class="bond-hearts" aria-label="絆 ${Math.floor(hearts/2)} / 3">${Array.from({length:3},(_,i)=>`<i class="${hearts>=(i+1)*2?'filled':''}">♥</i>`).join('')}</span></div></div>${joined?`<button class="secondary gift-button" data-gift="${id}" ${hearts>=6||s.bag[d.favorite]<1?'disabled':''}>${hearts>=6?'心が通う旅の仲間':G.ITEMS[d.favorite]+'を贈って話す'} <small>所持 <b data-bag="${d.favorite}">${s.bag[d.favorite]}</b></small></button><small class="bond-perk">絆3：${d.perk}${hearts>=6?'（発動中）':''}</small>${convos.filter(c=>!s.story.read.includes(c.id)).map(sceneButton).join('')}`:''}</article>`;
 }
 if(pending.length)html+='<h3 class="subheading">あとで立ち寄れる場所</h3>'+pending.map(e=>`<button class="scene-link" data-story-event="${e.id}"><span>寄り道</span><b>${e.title}</b><i>›</i></button>`).join('');
 html+=`<div class="conversation-archive"><button class="secondary memories-entry" data-memories>${I.html('book')} ストーリーを振り返る</button><p class="story-hint">ここまでの物語・仲間の会話・選んだ寄り道を、いつでも。</p></div>`;$('#panel').innerHTML=html;
}
function showMemories(){
 const chapters=S.unlockedChapters(s),bonds=Object.keys(S.BONDS).flatMap(id=>S.conversations(s,id)),events=S.EVENTS.filter(e=>Object.hasOwn(s.story.choices,e.id));
 open(`<div class="memory-list"><span class="eyebrow">旅の思い出</span><h2>ストーリーを振り返る</h2><p>読み返しても、素材や報酬は増減しません。</p><h3>三人の旅の物語</h3>${chapters.map(sceneButton).join('')}<h3>仲間との会話</h3>${bonds.length?bonds.map(sceneButton).join(''):'<p>仲間に好物を贈ると、会話が増えます。</p>'}<h3>寄り道の思い出</h3>${events.length?events.map(e=>`<button class="scene-link" data-event-memory="${e.id}"><span>記録</span><b>${e.title}</b><i>›</i></button>`).join(''):'<p>寄り道で選んだ出来事が、ここに残ります。</p>'}<button class="secondary" data-close>冒険に戻る</button></div>`);
}
function introRequired(){return !s.story.read.includes('chapter-0')&&s.wins===0&&s.highest===0;}
function beginTalk(session){
 if(introRequired()&&(session.kind!=='scene'||session.id!=='chapter-0'))session={kind:'scene',id:'chapter-0',index:0};
 const lines=S.script(s,session);if(!lines.length)return false;
 close();talk={kind:session.kind,id:session.id,index:Math.min(session.index||0,lines.length-(session.kind==='event'?0:1))};autoTalksAllowed=true;talkQueue=talkQueue.filter(q=>q.kind!==talk.kind||q.id!==talk.id);s.story.pending=talkQueue;talkLog=[];s.story.active={...talk};save();
 $('#talk-later').hidden=introRequired()&&talk.kind==='scene'&&talk.id==='chapter-0';$('#talk-log').hidden=true;$('#talk-log-toggle').textContent='ログ';$('#talk-log-toggle').setAttribute('aria-expanded','false');paintTalk();if(!conversation.open)conversation.showModal();$('#talk-next').focus({preventScroll:true});return true;
}
function showScene(id,index=0){memoryReplay=modal.open&&!!$('#modal-content .memory-list');beginTalk({kind:'scene',id,index});}
function showEvent(id){beginTalk({kind:'event',id,index:0});}
function storyResult(e){memoryReplay=modal.open&&!!$('#modal-content .memory-list');beginTalk({kind:'result',id:e.id,index:0});}
function paintTalk(){
 const lines=S.script(s,talk),isChoice=talk.kind==='event'&&talk.index===lines.length,[name,line]=lines[Math.min(talk.index,lines.length-1)];
 const scene=talk.kind==='scene'?S.findScene(s,talk.id):S.EVENTS.find(e=>e.id===talk.id);$('#talk-title').textContent=scene.title;$('#talk-speaker').textContent=name;
 const portrait=name=>Object.keys(G.HEROES).find(id=>G.HEROES[id].name===name)||S.NPCS[name]?.art,speakerId=portrait(name),speakers=[...new Set(lines.map(([n])=>portrait(n)).filter(Boolean))];
 $('#talk-face').innerHTML=speakerId?art(speakerId):'';
 const sceneBG=scene.town?G.TOWNS[scene.town].bg:talk.kind==='scene'&&scene.need>12?(G.REGIONS.find(d=>scene.need>=d.start&&scene.need<=d.end)?.bg||G.scenery(s)):talk.id.startsWith('bond-')?G.scenery(s):'forest';$('.talk-stage').style.backgroundImage='url("'+A.sceneryURL(sceneBG)+'")';
 $('#talk-cast').innerHTML=speakers.slice(0,3).map((id,i)=>`<div class="cast-member ${id===speakerId?'speaking':''} ${speakers.length===1?'solo':''}" style="--cast-order:${i}">${art(id)}</div>`).join('');
 talkChars=Array.from(line);talkVisible=isChoice?talkChars.length:0;talkElapsed=0;$('#talk-text').textContent=isChoice?line:'';$('#talk-next').disabled=isChoice;$('#talk-next').setAttribute('aria-busy',String(!isChoice));$('#talk-next').setAttribute('aria-label',name+'：'+line+'。タップで次へ');$('#talk-hint').textContent=isChoice?'どうする？':'タップで全文表示';
 if(!isChoice)talkLog.push([name,line]);renderTalkLog();
 $('#talk-choices').hidden=!isChoice;$('#talk-choices').innerHTML=isChoice?scene.options.map((d,i)=>`<button data-story-choice="${scene.id}" data-option="${i}" ${d.cost&&!G.canPay(s,d.cost)?'disabled':''}><b>${d.label}</b><small>${d.detail}</small></button>`).join(''):'';
 $('#talk-receipt').hidden=talk.kind!=='result';$('#talk-receipt').textContent=talk.kind==='result'?scene.options[s.story.choices[scene.id]].detail:'';
 s.story.active={...talk};save();$('.talk-window').scrollTop=0;
}
function renderTalkLog(){const log=$('#talk-log');log.replaceChildren();for(const[name,line]of talkLog){const p=document.createElement('p'),b=document.createElement('b'),span=document.createElement('span');b.textContent=name;span.textContent=line;p.append(b,span);log.append(p);}log.scrollTop=log.scrollHeight;}
function typeTalk(dt){if(!talk||talkVisible>=talkChars.length||!$('#talk-log').hidden)return;talkElapsed+=dt;const n=Math.min(talkChars.length,Math.floor(talkElapsed/.025));if(n<=talkVisible)return;talkVisible=n;$('#talk-text').textContent=talkChars.slice(0,n).join('');if(n===talkChars.length){$('#talk-hint').textContent='タップでつづく ▾';$('#talk-next').setAttribute('aria-busy','false');}}
function advanceTalk(){
 if(!talk||!$('#talk-log').hidden)return;
 if(talkVisible<talkChars.length){talkVisible=talkChars.length;$('#talk-next').setAttribute('aria-busy','false');$('#talk-text').textContent=talkChars.join('');$('#talk-hint').textContent='タップでつづく ▾';return;}
 const lines=S.script(s,talk);if(talk.index+1<lines.length||talk.kind==='event'&&talk.index<lines.length){talk.index++;paintTalk();return;}finishTalk();
}
function finishTalk(){const finished=talk;if(!finished)return;if(finished.kind==='scene')S.markRead(s,finished.id);s.story.active=null;talk=null;conversation.close();talkCooldown=performance.now()+800;save();renderPanel();if(memoryReplay){memoryReplay=false;showMemories();return;}if(finished.id==='chapter-5'&&finished.kind==='scene')ending();}
function deferTalk(){if(!talk||introRequired()&&talk.kind==='scene'&&talk.id==='chapter-0')return;const replay=memoryReplay;memoryReplay=false;s.story.active=replay?null:{...talk};talk=null;autoTalksAllowed=replay;conversation.close();save();renderPanel();if(replay)showMemories();}
function queueTalk(session){if(talk?.kind===session.kind&&talk.id===session.id||talkQueue.some(q=>q.kind===session.kind&&q.id===session.id))return;talkQueue.push(session);s.story.pending=talkQueue;save();}
function drainTalk(now){if(!autoTalksAllowed||talk||modal.open||conversation.open||now<talkCooldown)return;while(talkQueue.length){const next=talkQueue.shift();if(next.kind==='scene'&&s.story.read.includes(next.id))continue;if(beginTalk(next))break;}}
function promptTalk(){if(s.story.active&&beginTalk(s.story.active))return;const next=S.unlockedChapters(s).find(c=>!s.story.read.includes(c.id));if(next){showScene(next.id);return;}const e=S.available(s)[0];if(e){showEvent(e.id);return;}tab='story';renderPanel();}
$('#talk-next').onclick=advanceTalk;$('#talk-later').onclick=deferTalk;conversation.addEventListener('cancel',e=>{e.preventDefault();deferTalk();});
$('#talk-log-toggle').onclick=()=>{const show=$('#talk-log').hidden;$('#talk-log').hidden=!show;$('#talk-log-toggle').textContent=show?'戻る':'ログ';$('#talk-log-toggle').setAttribute('aria-expanded',String(show));if(show)renderTalkLog();};
function updateStory(){const pending=S.available(s),unread=S.unread(s);$('#story-peek').hidden=tab!=='home'||(!s.story.active&&!pending.length&&!unread);$('#story-dot').hidden=!pending.length&&!unread;const next=pending[0];$('#story-peek-label').textContent=s.story.active?'会話のつづきを聞く →':next?'仲間が呼んでいる：'+next.title:unread?'リリたちと話す →':'おばあちゃんの工房を直す、三人の旅。';$('#story-peek').classList.toggle('has-news',!!next||!!unread);$('#tools-summary-count').textContent='料理 '+(s.bag.tea+s.bag.pie+s.bag.charm)+' 個';
 for(const b of document.querySelectorAll('[data-gift]')){const id=b.dataset.gift;b.disabled=s.story.bond[id]>=6||s.bag[S.BONDS[id].favorite]<1;}
 for(const b of document.querySelectorAll('[data-story-choice]')){const d=S.EVENTS.find(e=>e.id===b.dataset.storyChoice).options[Number(b.dataset.option)];b.disabled=!!d.cost&&!G.canPay(s,d.cost);}
}
function materialText(cost){return Object.entries(cost).map(([k,n])=>`${G.ITEMS[k]||{coins:'コイン',crystals:'魔石',wood:'木材'}[k]}${n}`).join('・');}
function supplyBar(){return `<div class="supply-bar">${['herb','berry','ore'].map(k=>`<span>${I.html(k)}${G.ITEMS[k]} <b data-bag="${k}">${s.bag[k]}</b></span>`).join('')}</div>`;}
function renderExtras(){
 let html=supplyBar();
 if(tab==='outing'){
  html+=`<div class="section-heading"><h2>寄り道の採集かご</h2><p>戦闘と並行して、8秒で素材を持ち帰ります。<br>4回の採集ごとに、魔石も1つ見つかります。</p></div><div class="gather-status" role="status" id="gather-status"></div>`;
  html+=Object.entries(G.SPOTS).map(([k,d])=>`<article class="activity-card"><div><h3>${I.html(k==='cave'||k==='ridge'?'ore':'gather')}${d.name}</h3><p>${d.text}</p><small>${s.highest<d.need?'道を'+d.need+'つ踏破すると解放':'料理にする？ 装備にする？ 集める素材を選ぼう。'}</small></div><button class="secondary" data-gather="${k}">採集する</button></article>`).join('');
  html+=`<article class="activity-card delivery"><div><h3>何度でも：森のお届け便</h3><p>薬草3・木の実3 → コイン50</p><small>3回届けるごとに魔石1。配達済み <b id="delivery-count">${s.counts.deliveries}</b>回</small></div><button class="secondary" data-deliver>届ける</button></article>`;
 }else if(tab==='workshop'||tab==='cooking'){
  html+='<div class="section-heading"><h2>火を囲む、料理の時間</h2><p>作った料理は道具袋へ。戦闘中に使って、仲間を助けよう。</p></div>';
  html+=Object.entries(G.RECIPES).map(([k,d])=>`<article class="activity-card"><div><h3>${I.html(k)}${d.name} <small>所持 <b data-bag="${k}">${s.bag[k]}</b></small></h3><p>${d.text}</p><small>${materialText(d.cost)}</small></div><button class="secondary" data-cook="${k}">作る</button></article>`).join('');
  if(tab==='workshop'){html+=`<h3 class="subheading">三人の装備・それぞれ${s.town.workshop?5:3}段階</h3>`;
  html+=Object.entries(G.GEAR).map(([k,d])=>`<article class="activity-card"><div><h3>${d.name} <small>${s.gear[k]}/${s.town.workshop?5:3}</small></h3><p>${G.HEROES[k].name}：${d.text}</p><small>${k!=='lili'&&!s.unlocked[k]?'仲間になると製作できます':s.gear[k]>=(s.town.workshop?5:3)?'最後まで仕立てました':materialText(G.gearCost(s,k))}</small></div><button class="secondary" data-equip="${k}">${s.gear[k]>=(s.town.workshop?5:3)?'完成':'仕立てる'}</button></article>`).join('');}
 }else{
  html+='<div class="section-heading"><h2>'+I.html('book')+'旅の依頼と魔物手帳</h2><p>小さな目標を達成して、旅じたくの報酬をもらおう。</p></div>';
  html+=G.MISSIONS.map(d=>{const done=s.claimed.includes(d.id);return `<article class="activity-card"><div><h3>${d.name}</h3><p>${{gathers:'採集',cooks:'料理',wins:'勝利',gears:'装備の製作・強化',meals:'料理を使う',highest:'道の踏破'}[d.key]} <b data-mission-progress="${d.id}">${Math.min(d.goal,G.progressValue(s,d.key))}</b> / ${d.goal}</p><small>報酬：${materialText(d.reward)}</small></div><button class="secondary" data-claim="${d.id}">${done?'受取済み':'受け取る'}</button></article>`;}).join('');
  html+='<h3 class="subheading">魔物図鑑</h3><div class="bestiary">'+[['slime','しずくスライム','草原から深い森まで暮らす。通常攻撃で確実に倒そう。'],['mushroom','もりきのこ','4・8の道では大きな親分も登場。守りを固めて。'],['golem','こけむす守り人','森の主。雪道には小さな石守りも。'],['mole','麦わらもぐら','麦畑のすばやい魔物。前衛を育てて支えよう。'],['straw','風のかかし','麦畑の風守り。突風の前にバリアを。'],['crab','潮のヤドカリ','海岸の殻はダメージを吸収する。'],['owl','雪ふくろう','大きな羽ばたきで足が冷える。薬草茶で回復。']].map(([id,name,tip])=>`<article>${s.bestiary[id]?art(id):'<span class="unknown">？</span>'}<h3>${s.bestiary[id]?name:'まだ出会っていない魔物'}</h3><p>${s.bestiary[id]?tip:'倒すとページが開きます。'}</p><small>討伐 <b data-bestiary="${id}">${s.bestiary[id]}</b>体</small></article>`).join('')+'</div>';
 }
 $('#panel').innerHTML=html;
}
function updateExtras(){
 for(const b of document.querySelectorAll('[data-bag]'))b.textContent=s.bag[b.dataset.bag];
 for(const b of document.querySelectorAll('[data-gather]'))b.disabled=!!s.gatherJob||s.highest<G.SPOTS[b.dataset.gather].need;
 const status=$('#gather-status');if(status)status.textContent=s.gatherJob?G.SPOTS[s.gatherJob.spot].name+'で採集中… あと'+Math.ceil(s.gatherJob.left)+'秒':'かごは空っぽ。採集先を選ぼう！';
 for(const b of document.querySelectorAll('[data-cook]'))b.disabled=!G.canPay(s,G.RECIPES[b.dataset.cook].cost);
 for(const b of document.querySelectorAll('[data-equip]')){const k=b.dataset.equip;b.disabled=s.gear[k]>=(s.town.workshop?5:3)||(k!=='lili'&&!s.unlocked[k])||!G.canPay(s,G.gearCost(s,k));}
 for(const b of document.querySelectorAll('[data-claim]')){const d=G.MISSIONS.find(m=>m.id===b.dataset.claim);b.disabled=s.claimed.includes(d.id)||G.progressValue(s,d.key)<d.goal;}
 for(const b of document.querySelectorAll('[data-mission-progress]')){const d=G.MISSIONS.find(m=>m.id===b.dataset.missionProgress);b.textContent=Math.min(d.goal,G.progressValue(s,d.key));}
 for(const b of document.querySelectorAll('[data-bestiary]'))b.textContent=s.bestiary[b.dataset.bestiary];
 for(const b of document.querySelectorAll('[data-deliver]'))b.disabled=!G.canPay(s,{herb:3,berry:3});
 if($('#delivery-count'))$('#delivery-count').textContent=s.counts.deliveries;
 for(const b of document.querySelectorAll('[data-bag-use]')){const id=b.dataset.bagUse;b.disabled=s.bag[id]<1||r.mode!=='fight'||(id==='pie'&&s.foodTime>0);}
 for(const b of document.querySelectorAll('[data-use-item]')){const k=b.dataset.useItem;b.querySelector('b').textContent=s.bag[k];b.disabled=!s.bag[k]||r.mode!=='fight'||(k==='pie'&&s.foodTime>0);}
 const active=$('#food-status');active.textContent=s.foodTime>0?'パイの力：攻撃・回復＋25% あと'+Math.ceil(s.foodTime)+'秒':'';
 $('#journal-dot').hidden=!G.MISSIONS.some(m=>!s.claimed.includes(m.id)&&G.progressValue(s,m.key)>=m.goal);
 for(const b of document.querySelectorAll('[data-tactic]')){const on=s.tactic===b.dataset.tactic;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));}
 $('#tactic-description').textContent=G.TACTICS[s.tactic].text;
}
function speech(){const line=s.wagon?'「ただいま」って言える場所が、できたね。':s.highest>=12?'木材をしまって、屋根をつけよう！':s.unlocked.mina?'三人なら、もっと遠くまで行けそう！':s.unlocked.noa?'ノアがいると、ちょっと心強いね。':'おやつは持った。勇気も、すこし。';return `<div class="speech">${art('lili')}<p>${line}</p></div>`;}
function objective(){if(s.town.workshop)return'移動工房が完成！ 町の依頼や装備5段階への強化、各地の再探索を楽しもう。';if(s.highest>=30)return'星の歯車を入手！ 港町の「工房修理」で、移動工房を直そう。';if(s.wagon)return s.location==='town'?'町で旅じたく。依頼・道具屋を巡って、次の地域へ。':'「町」へ寄って、宿屋・道具屋・次の冒険を楽しもう。';if(!s.counts.gathers)return'戦闘の間に「採集」で素材集め。料理・装備・配達に使えます。';if(!s.claimed.includes('firstGather'))return'はじめての採集、おつかれさま！「冒険 → 依頼・図鑑」で報酬を受け取ろう。';if(s.wagon)return'旅の続きへ。装備を仕立て、依頼と魔物手帳を埋めながら再探索しよう。';if(s.highest>=12)return'森の主を倒しました！ 「荷馬車」で屋根付き馬車に改築しよう。';if(!s.unlocked.noa)return'まずは魔法を強化。森の道を3つ進むと、剣士ノアと出会えます。';if(!s.unlocked.mina)return'仲間の強化も忘れずに。6つ目の道で、癒やし手ミナが待っています。';return'森の主まで、あと'+(12-s.highest)+'つの道。魔法と守りを、バランスよく。';}
function updateUI(){
 updateTown();updateStory();updateExtras();$('#coins').textContent=coin(s.coins);$('#wood').textContent=coin(s.wood);$('#crystals').textContent=coin(s.crystals);$('#place').textContent=s.location==='town'?G.TOWNS[s.townId].name:G.PLACES[s.stage-1];$('.place small').textContent=s.location==='town'?'旅の立ち寄り先':G.region(s).name;$('.auto-badge').textContent=s.location==='town'?'◌ TOWN':'◌ AUTO';$('#objective').textContent=objective();
 $('#journey-label').textContent=r.mode==='town'?'町の評判 '+s.town.reputation+' / 6':['camp','complete'].includes(r.mode)?s.wagon?'はじめての旅、達成。':'森の主を越えました。':`道 ${s.stage} / ${G.TOTAL_STAGES}　出会い ${s.encounter+1} / ${G.ENCOUNTERS}`;
 $('#progress').hidden=r.mode==='town';
 const progress=s.stage+':'+s.encounter+':'+r.mode;if(progress!==lastProgress){lastProgress=progress;$('#progress').innerHTML=Array.from({length:G.ENCOUNTERS},(_,i)=>`<i class="${i<s.encounter?'past':i===s.encounter?'now':''}"></i>`).join('');}
 $('#rally>span').innerHTML=I.html(r.mode==='town'?'map':'rally')+(r.mode==='town'?'出発の支度':'おねがい！');
 const ready=r.mode==='town'||s.rally>=100&&r.mode==='fight'&&running;$('#rally').disabled=!ready;$('#rally-charge').textContent=r.mode==='town'?'行き先を選ぶ':r.heroBuff>0?'みんなの力が、ひとつに。':ready?'連携技を発動':`星の力 ${Math.floor(s.rally)} / 100`;$('#rally-meter').style.width=s.rally+'%';
 const big=r.enemies.some(e=>e.hp>0&&e.boss&&e.actions%3===2&&e.cooldown<1.1)&&r.mode==='fight';const banner=$('#world-banner');banner.className='world-banner'+(big?' danger':r.heroBuff>0?' success':'');banner.textContent=big?'大技がくる！「おねがい！」でバリアを張ろう':r.heroBuff>0?'連携中 ✧ 攻撃1.6倍・バリアで守る':r.chill>0?'足が冷えている！ 薬草茶で冷えを払おう':r.mode!=='fight'?r.label:'';
 $('#wagon-dot').hidden=s.wagon||s.highest<12;
 for(const b of document.querySelectorAll('[data-upgrade]')){const key=b.dataset.upgrade;b.disabled=s.coins<G.cost(s,key);}
 for(const b of document.querySelectorAll('[data-learn]')){const key=b.dataset.learn;b.disabled=s.skills[key]||s.crystals<G.SKILLS[key].cost;}
 for(const b of document.querySelectorAll('[data-renovate]'))b.disabled=s.wagon||s.highest<12||s.wood<30;
}
function consume(events){A.add(events,r);let refresh=false;for(const e of events){if(e.type==='arrival'){tab='town';townFacility='routes';refresh=true;for(const c of S.unlockedChapters(s).filter(c=>c.town===e.town&&!s.story.read.includes(c.id)))queueTalk({kind:'scene',id:c.id,index:0});save();}else if(e.type==='discover'){refresh=true;}else if(e.type==='gather'){toast(e.text);save();refresh=true;}else if(e.type==='join'){toast(e.text);refresh=true;save();sound.note(523.25,.5);}else if(e.type==='material'){save();refresh=true;}else if(e.type==='bossclear'){toast('森の主を撃破！ 冒険の「荷馬車」で改築しよう。');tab='wagon';refresh=true;save();}else if(e.type==='defeat')toast('荷馬車で立て直します。素材と強化は残ります。');else if(e.type==='upgrade'){refresh=true;sound.note(659.25,.25);}else if(e.type==='rally')sound.chime();}if(s.highest>lastStoryHighest){for(const q of S.milestones(s,lastStoryHighest))queueTalk(q);lastStoryHighest=s.highest;}if(refresh)renderPanel();}
function ending(){open(`<span class="eyebrow">旅のひと区切り</span><h2>屋根の下に、ただいま。</h2><img class="ending-art" src="tabi-simple-ending.png" alt="屋根付き馬車のそばで、リリ・ノア・ミナが初めてのお茶を楽しむ"><p>おばあちゃんの設計図に、三人の書き込みが増えました。<br>工房を直す旅は、ここから。<br>まずはこの屋根の下で、お茶にしよう。</p><p style="font-size:11px">${s.wins}戦の思い出 ・ 仲間3人 ・ 屋根付き馬車<br>この先は町・麦畑・海岸・雪山へ。全30の道を旅できます。</p><div class="actions"><button class="primary" data-visit-town>こむぎの町へ →</button><button class="secondary" data-share>一行をシェア</button><button class="secondary" data-scene="chapter-5">三人の約束を読む</button><button class="secondary" data-close>馬車を眺める</button></div>`);}
function help(){open(`<span class="eyebrow">リリの旅じたく帳</span><h2>旅のしおり</h2><div class="help-grid"><article><h3>上で戦って、下で育てる</h3>通常攻撃と回復は自動。コインで魔法と仲間を強化できます。強化は戦闘の途中でも、すぐ反映されます。</article><article><h3>三人で、ひとつの作戦</h3>リリは魔法。ノアは前に立って守り、ミナは傷ついた仲間を回復。仲間は3つ目・6つ目の道で必ず加入します。</article><article><h3>新しい魔法と連携</h3>新しい道を踏破すると魔石を入手。「ふたつの火」は攻撃、「まもりの盾」は防御、「花の祈り」は回復。星100で「おねがい！」が使えます。敵の大技の予告に合わせるのもおすすめ。</article><article><h3>負けても、旅はつづく</h3>全員が倒れると荷馬車で休み、3つの道ごとの区切りから自動で再挑戦。コイン・素材・強化は残ります。</article><article><h3>旅のゴールと、町でできること</h3>森の12の道を越えて屋根付き馬車に改築。その先は3つの町と麦畑・海岸・雪山へ。全30の道を踏破し、港町で星の歯車を使って移動工房を修理できます。町へは途中でも戻れて、保存した道の続きから出発できます。</article><article><h3>採集・料理・装備</h3>「採集」で8秒の素材集め。4回ごとに魔石も入手。「持ち物 → 料理」と「仲間 → 装備」で各3段階（移動工房完成後は5段階）の専用装備を作れます。料理は道具袋から戦闘中に使用。「冒険 → 依頼・図鑑」の報酬も忘れずに。作戦の切り替えは攻撃と最大HPに反映されます。HPの割合は引き継ぐため、切り替えによる回復はできません。</article><article><h3>旅の物語と絆</h3>本編と五つの寄り道は、道中で会話として始まります。会話中は戦闘がお休み。セリフ欄をタップすると全文表示、もう一度で次へ。「ログ」で読み返し、「あとで」で冒険に戻れます。「仲間 → 絆・会話」から再開もできます。選択の結果は一度だけ受け取り、記録はいつでも読み直せます。好物を「持ち物 → 料理」で作り、3回贈ると会話3つと専用の絆効果が開きます。好物を贈ると、その場で仲間と話せます。</article><article><h3>羽根のしおり</h3>このブラウザに自動保存。閉じている間は最大4時間、踏破した道に応じてコインを集めます。素材と道の進行は、画面を開いている間に増えます。</article></div><h3 style="font-family:var(--serif)">一行の記録</h3><ul class="story-list"><li>踏破した道 ${s.highest}/${G.TOTAL_STAGES}</li><li>ノア ${s.unlocked.noa?'一緒に旅しています':'3つ目の道で出会う'}</li><li>ミナ ${s.unlocked.mina?'一緒に旅しています':'6つ目の道で出会う'}</li><li>荷馬車 ${s.wagon?'屋根付き馬車':'手押し車'}</li><li>勝利 ${s.wins}回 ・ 立て直し ${s.defeats}回</li></ul>`);}
async function share(){
 const c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d'),bg=A.background(s);x.drawImage(bg,0,-80,1200,800);x.fillStyle='#fff8e9ed';x.fillRect(28,25,1144,190);x.strokeStyle='#b79b69';x.strokeRect(34,31,1132,178);x.fillStyle='#a9644d';x.font='bold 51px serif';x.fillText('ちいさな魔女の旅じたく',60,109);x.fillStyle='#8f795a';x.font='25px serif';x.fillText(s.town.workshop?'旅する工房が、動き出した。':s.highest>12?`三人と、旅の道を ${s.highest} / ${G.TOTAL_STAGES} 踏破。`:s.wagon?'小さな旅が、帰る場所になった。':`リリたちと、森の道を ${s.highest} / ${G.TOTAL_STAGES} 踏破。`,65,163);A.paint(x,s.wagon?'wagon':'cart',190,549,s.wagon?240:170);A.paint(x,'lili',455,550,260);if(s.unlocked.noa)A.paint(x,'noa',715,550,260);if(s.unlocked.mina)A.paint(x,'mina',955,550,250);x.fillStyle='#fff7e5ee';x.fillRect(28,574,1144,37);x.fillStyle='#8b7152';x.font='16px sans-serif';x.fillText('戦う仲間と、育つおうち。無料・登録不要。',48,599);x.textAlign='right';x.fillText('sakamoto241.github.io/game/tabi.html',1152,599);const url=c.toDataURL('image/png');const text=`上では仲間が戦って、下ではあなたが育てる。\n\n${s.town.workshop?'三人と30の道を越えて、おばあちゃんの移動工房を直しました！':s.highest>12?`リリたちと${s.highest}/${G.TOTAL_STAGES}の道を踏破！`:s.wagon?'リリたちと森の主を倒して、手押し車が屋根付き馬車になりました。':`朝つゆの森を${s.highest}/${G.TOTAL_STAGES}踏破！`}\n#ちいさな魔女の旅じたく #ブラウザゲーム`;
 open(`<span class="eyebrow">一行の、旅の記録</span><h2>この一行で、旅をした。</h2><img class="share-card" src="${url}" alt="リリたちの旅の記録"><div class="actions"><a class="primary" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://sakamoto241.github.io/game/tabi.html')}" target="_blank" rel="noopener noreferrer">Xに投稿する ↗</a><a class="secondary" href="${url}" download="ちいさな魔女の旅じたく.png">画像を保存</a></div><p style="font-size:10px">画像も載せるときは、保存した画像を投稿に添えてください。</p>`);
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-memories'))showMemories();
 else if(b.dataset.section){const group=b.dataset.section;if(group==='town'&&s.wagon&&s.location!=='town'){enterTown();return;}tab=group==='town'?'town':SECTIONS[group][0][0];renderPanel();}
 else if(b.dataset.bagUse){r.events=[];const result=G.useItem(s,r,b.dataset.bagUse);if(result.ok){consume(r.events);save();renderPanel();toast(r.events.at(-1)?.text||'道具を使いました。');}else toast(result.error);}
 else if(b.hasAttribute('data-visit-town')||b.dataset.town)enterTown(b.dataset.town);
 else if(b.dataset.facility){townFacility=b.dataset.facility;renderPanel();}
 else if(b.dataset.depart){const result=G.depart(s,r,b.dataset.depart);if(result.ok){tab='magic';save();renderPanel();$('#panel').scrollIntoView({block:'start'});toast(G.region(s).name+'へ、出発！');}else toast(result.error);}
 else if(b.dataset.shop||b.dataset.fulfill||b.hasAttribute('data-inn')||b.hasAttribute('data-repair')){r.events=[];const result=b.dataset.shop?G.shop(s,r,b.dataset.shop):b.dataset.fulfill?G.fulfill(s,r,b.dataset.fulfill):b.hasAttribute('data-inn')?G.restAtInn(s,r):G.repairWorkshop(s,r);if(result.ok){save();renderPanel();if(b.hasAttribute('data-repair'))showScene('chapter-10');else toast(r.events.at(-1)?.text||'旅じたくができました。');}else toast(result.error);}
 else if(b.hasAttribute('data-talk-prompt'))promptTalk();
 else if(b.dataset.scene)showScene(b.dataset.scene);
 else if(b.dataset.storyEvent)showEvent(b.dataset.storyEvent);
 else if(b.dataset.storyChoice){const e=S.EVENTS.find(e=>e.id===b.dataset.storyChoice),result=S.choose(s,r,e.id,Number(b.dataset.option));if(result.ok){save();renderPanel();storyResult(e);}else toast(result.error);}
 else if(b.dataset.eventMemory){const e=S.EVENTS.find(e=>e.id===b.dataset.eventMemory);if(Object.hasOwn(s.story.choices,e.id))storyResult(e);}
 else if(b.dataset.gift){const id=b.dataset.gift,result=S.gift(s,r,id);if(result.ok){save();renderPanel();const c=S.conversations(s,id).at(-1);if(c)showScene(c.id);}else toast(result.error);}
 else if(['gather','cook','equip','claim','useItem','tactic'].some(k=>b.dataset[k]!==undefined)||b.hasAttribute('data-deliver')){
  r.events=[];let result;
  if(b.dataset.gather)result=G.gather(s,r,b.dataset.gather);
  else if(b.dataset.cook)result=G.cook(s,r,b.dataset.cook);
  else if(b.dataset.equip)result=G.equip(s,r,b.dataset.equip);
  else if(b.dataset.claim)result=G.claim(s,r,b.dataset.claim);
  else if(b.dataset.useItem)result=G.useItem(s,r,b.dataset.useItem);
  else if(b.dataset.tactic)result=G.setTactic(s,r,b.dataset.tactic);
  else result=G.deliver(s,r);
  if(result.ok){consume(r.events);toast(r.events.at(-1)?.text||'旅じたくができました。');save();renderPanel();}else toast(result.error);
 }
 else if(b.hasAttribute('data-start')){running=true;$('#close').hidden=false;close();save();updateUI();showScene('chapter-0');}
 else if(b.dataset.tab){if(b.dataset.tab==='town'&&s.wagon&&s.location!=='town'){enterTown();return;}tab=b.dataset.tab;renderPanel();}
 else if(b.dataset.upgrade||b.dataset.learn){const result=b.dataset.upgrade?G.upgrade(s,r,b.dataset.upgrade):G.learn(s,r,b.dataset.learn);if(result.ok){consume(r.events.filter(e=>e.type==='upgrade'));renderPanel();save();}else toast(result.error);}
 else if(b.hasAttribute('data-renovate')){const result=G.renovate(s,r);if(result.ok){renderPanel();save();sound.chime();showScene('chapter-5');}else toast(result.error);}
 else if(b.hasAttribute('data-replay')){if(G.replay(s,r)){close();save();renderPanel();toast('強化を引き継いで、もう一度森へ。');}}
 else if(b.hasAttribute('data-craft')){const result=G.craft(s,r);if(result.ok){consume(r.events.filter(e=>e.type==='upgrade'));save();renderPanel();toast('花飾りの杖ができました。');}else toast(result.error);}
 else if(b.hasAttribute('data-ending'))ending();else if(b.hasAttribute('data-close'))close();else if(b.hasAttribute('data-share'))share().catch(()=>toast('画像を作れませんでした。もう一度お試しください。'));
});
$('#rally').onclick=()=>{if(r.mode==='town'){tab='town';townFacility='routes';renderPanel();$('#panel').scrollIntoView({block:'start'});return;}const result=G.rally(s,r);if(result.ok){consume(r.events.filter(e=>e.type==='rally'||e.type==='heal'));save();updateUI();}else toast(result.error);};$('#help').onclick=help;
const sound=new window.TabiMusic.Player({volume:.55});
async function toggleMusic(){
 const button=$('#sound');if(sound.busy)return;sound.busy=true;button.disabled=true;button.textContent=sound.on?'BGM OFF':'BGM …';button.setAttribute('aria-busy','true');
 try{if(sound.on)await sound.disable();else await sound.enable();}
 catch(_){await sound.disable().catch(()=>{});toast('このブラウザでは音楽を再生できません。');}
 finally{sound.busy=false;button.disabled=false;button.setAttribute('aria-busy','false');button.textContent='BGM '+(sound.on?'ON':'OFF');button.setAttribute('aria-pressed',String(sound.on));button.setAttribute('aria-label','ほのぼのBGMを'+(sound.on?'止める':'再生する'));}
}
$('#sound').onclick=toggleMusic;canvas.onclick=e=>{const scale=canvas.clientWidth/960,y=(e.offsetY+Math.max(0,canvas.height*scale-canvas.clientHeight))/scale,ground=425+(canvas.height-530)*.8;if(s.location==='town'&&e.offsetX/canvas.clientWidth>.6&&y>ground-205&&y<ground+25){tab='town';townFacility='shop';renderPanel();$('#panel').scrollIntoView({block:'start'});}};
const setBattleHeight=()=>{const rect=$('.sticky-world').getBoundingClientRect(),safe=parseFloat(getComputedStyle($('.resources')).top)||0;document.documentElement.style.setProperty('--battle-height',Math.max(0,rect.bottom-Math.max(safe,rect.top))+'px');};
const setMenuHeight=()=>{const main=$('.main-tabs').getBoundingClientRect().height,sub=$('#section-tabs').getBoundingClientRect().height;document.documentElement.style.setProperty('--main-menu-height',main+'px');document.documentElement.style.setProperty('--menu-height',(main+sub)+'px');};
if(window.ResizeObserver){const observer=new ResizeObserver(setMenuHeight);observer.observe($('.main-tabs'));observer.observe($('#section-tabs'));}setMenuHeight();
let sceneScrollFrame=0;window.addEventListener('scroll',()=>{if(!sceneScrollFrame)sceneScrollFrame=requestAnimationFrame(()=>{sceneScrollFrame=0;setBattleHeight();});},{passive:true});
if(window.ResizeObserver){new ResizeObserver(setBattleHeight).observe($('.sticky-world'));new ResizeObserver(syncScenerySize).observe($('.world'));}else window.addEventListener('resize',()=>{setBattleHeight();syncScenerySize();});setBattleHeight();
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();sound.background(true).catch(()=>{});}else{if(running){const reward=G.offline(s);if(reward.coins)toast('おかえりなさい。留守の間にコイン ＋'+reward.coins);save();updateUI();}lastFrame=performance.now();acc=0;sound.background(false).catch(()=>{});}});
window.addEventListener('pagehide',()=>{save();sound.background(true).catch(()=>{});});
window.addEventListener('pageshow',()=>{if(!document.hidden)sound.background(false).catch(()=>{});});
try{await Promise.all([A.load(),I.load()]);for(const el of document.querySelectorAll('[data-menu-icon]'))el.innerHTML=symbol(el.dataset.menuIcon);for(const[id,key]of[['.resources .coin','coins'],['.resources .wood','wood'],['.resources .crystal','crystals']])$(id).innerHTML=I.html(key);$('#story-peek>span:first-child').innerHTML=I.html('chat');$('#loading').remove();}catch(error){$('#loading').innerHTML='<b>絵の読み込みができませんでした。</b><small>通信を確認して、もう一度お試しください。</small><button class="primary" id="retry-assets">再読み込み</button>';$('#retry-assets').onclick=()=>location.reload();return;}
if(s.location==='town')tab='town';renderPanel();if(!running)welcome();else{save();if(introRequired())beginTalk(s.story.active?.kind==='scene'&&s.story.active.id==='chapter-0'?s.story.active:{kind:'scene',id:'chapter-0',index:0});else if(s.story.active&&!beginTalk(s.story.active)){s.story.active=null;save();}if(away.coins)toast('おかえりなさい。留守の間にコイン ＋'+away.coins);}
function frame(now){const dt=Math.max(0,Math.min(.2,(now-lastFrame)/1000));lastFrame=now;
 if(running&&!document.hidden&&!conversation.open){drainTalk(now);if(!conversation.open)acc+=dt;while(acc>=.05&&!conversation.open){consume(G.step(s,r,.05));acc-=.05;}saveClock+=dt;uiClock+=dt;if(saveClock>=10){saveClock=0;save();}if(uiClock>=.15){uiClock=0;updateUI();}}
 if(conversation.open&&!document.hidden)typeTalk(dt);A.draw(canvas,s,r,dt);requestAnimationFrame(frame);
}lastFrame=performance.now();requestAnimationFrame(frame);
})();
