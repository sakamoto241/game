(async function(){
'use strict';
const G=window.Tabi,S=window.TabiStory,A=window.TabiArt,$=s=>document.querySelector(s),KEY='lili-tabijitaku-v1',canvas=$('#world'),modal=$('#modal');
let s=null;try{s=G.load(JSON.parse(localStorage.getItem(KEY)));}catch(_){}
let running=!!s,tab='magic',toastTimer,lastFrame=performance.now(),acc=0,saveClock=0,uiClock=0,lastProgress='',failedSave=false,sceneSession=null;
if(!s)s=G.newGame();const away=running?G.offline(s):{coins:0},r=G.createRun(s);
const coin=n=>Number.isFinite(n)?Math.floor(n).toLocaleString('ja-JP'):'MAX';
const art=(id,cls='')=>`<img src="${A.url(id)}" alt="${id==='cart'?'手押し車':id==='wagon'?'屋根付き馬車':G.HEROES[id]?.name||id}" class="${cls}" draggable="false">`;
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600);}
function save(){if(!running)return;try{s.savedAt=Date.now();const snapshot={...s};if(r.mode==='travel'||r.mode==='rest'){snapshot.stage=r.nextStage;snapshot.encounter=r.nextEncounter;}localStorage.setItem(KEY,JSON.stringify(snapshot));}catch(_){if(!failedSave){failedSave=true;$('#save-status').textContent='このブラウザでは保存できません';toast('保存できません。ブラウザのストレージ設定を確認してください。');}}}
function open(html){$('#close').hidden=!running;$('#modal-content').innerHTML=html;if(!modal.open)modal.showModal();modal.scrollTop=0;}
function close(){modal.close();}
$('#close').onclick=close;modal.addEventListener('cancel',e=>{if(!running)e.preventDefault();});
function welcome(){open(`<span class="eyebrow">はじめての旅</span>${art('lili','intro-portrait')}<h2>小さな魔女と、<br>旅の支度を。</h2><p>おばあちゃんが残した、壊れた移動工房。<br>台車に設計図を積んで、リリは森へ。<br>仲間と出会い、まずは雨をしのげる屋根をつくろう。</p><div class="actions"><button class="primary" data-start>リリと旅に出る →</button></div><p style="font-size:10px;margin-bottom:0">採集・料理・装備・作戦・依頼も楽しめます。自動保存。</p>`);}
function row({icon,title,level,text,fine='',key,skill=false,color='',disabled=false,learned=false}){
 const d=skill?G.SKILLS[key]:G.UPGRADES[key],price=skill?d.cost:G.cost(s,key);
 return `<article class="upgrade-row"><div class="upgrade-icon ${color} ${key==='noa'||key==='mina'?'hero-icon':''}">${icon}</div><div class="upgrade-info"><h2>${title}${level?`<small>Lv.${level}</small>`:''}</h2><p>${text}</p>${fine?`<div class="fine">${fine}</div>`:''}</div><button class="buy ${skill?'skill':''} ${learned?'learned':''}" ${skill?'data-learn':'data-upgrade'}="${key}" ${disabled||learned?'disabled':''} aria-label="${title}を${skill?'覚える':'強化する'}">${learned?'習得済み':`${skill?'◆':'●'} ${coin(price)}<small>${skill?'覚える':'強化する'}</small>`}</button></article>`;
}
function renderPanel(){
 $('#objective').hidden=tab==='story';$('.travel-tools').hidden=tab==='story';$('#story-peek').hidden=tab==='story';
 for(const b of document.querySelectorAll('[data-tab]')){b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab));}
 if(tab==='story'){renderStory();updateUI();return;}
 const st=G.stats(s,'lili');
 if(['outing','workshop','journal'].includes(tab)){renderExtras();updateUI();return;}
 if(tab==='magic')$('#panel').innerHTML=row({icon:'✹',title:'火の玉',level:s.upgrades.fire,text:`威力 ${Math.round(st.atk)} → ${Math.round(st.atk+4*(s.tactic==='rush'?1.2:s.tactic==='safe'?.9:1))}`,fine:'魔法が強くなると、敵を早く倒せる。',key:'fire'})+row({icon:'⚚',title:'木の杖',level:s.upgrades.staff,text:`魔力 ＋2 ・ HP ＋13`,fine:`リリのHP ${st.maxHp} → ${G.stats({...s,upgrades:{...s.upgrades,staff:Math.min(20,s.upgrades.staff+1)}},'lili').maxHp}`,key:'staff'})+row({icon:'✦',title:'ふたつの火',text:'火の玉が2つになる',fine:'合計威力が50%アップ。',key:'double',skill:true,learned:s.skills.double})+speech();
 else if(tab==='friends'){
  let html=`<article class="upgrade-row companion"><div class="upgrade-icon">${art('lili')}</div><div class="upgrade-info"><h2>リリ<small>魔法・後衛</small></h2><p>一行の、小さな魔法使い。</p><div class="hero-stat">HP ${st.maxHp}　魔力 ${st.atk}</div></div><button class="buy learned" data-tab="magic">魔法へ</button></article>`;
  for(const id of ['noa','mina']){const d=G.HEROES[id],yes=s.unlocked[id],h=G.stats(s,id);html+=yes?row({icon:art(id),title:d.name,level:s.upgrades[id],text:d.role,fine:`HP ${h.maxHp} ・ ${id==='noa'?'攻撃 '+h.atk:'回復 '+h.heal}`,key:id,color:id==='noa'?'blue':'green'}):`<article class="upgrade-row companion locked"><div class="upgrade-icon">？</div><div class="upgrade-info"><h2>${id==='noa'?'青いマントの剣士':'花の祈りの癒やし手'}</h2><p>森の道を${id==='noa'?'3':'6'}つ進むと、出会えます。</p></div></article>`;}
  if(s.unlocked.noa)html+=row({icon:'♧',title:'まもりの盾',text:'ノアが全員にバリア',fine:'3回攻撃するたびに発動。',key:'ward',skill:true,learned:s.skills.ward,color:'blue'});
  if(s.unlocked.mina)html+=row({icon:'❀',title:'花の祈り',text:'ミナが仲間全員を回復',fine:'3回目の回復が、全員に届く。',key:'bloom',skill:true,learned:s.skills.bloom,color:'green'});
  html+='<div class="cooperation"><b>連携技「木漏れ日の約束」</b>星がたまったら「おねがい！」。7秒間の攻撃アップ・バリア・回復。</div>';$('#panel').innerHTML=html+speech();
 }else{
  $('#panel').innerHTML=`<article class="wagon-panel"><span class="eyebrow">旅する、小さなおうち</span><h2>${s.wagon?'屋根付き馬車':'手押し車'} <small>Lv.${s.wagon+1}</small></h2><p>${s.wagon?'雨の日にも、帰る場所ができました。':'次の改築：屋根付き馬車'}</p><div class="wagon-view">${!s.wagon?art('cart')+'<span class="arrow">→</span>':''}${art('wagon',!s.wagon?'future':'')}</div><div class="benefits"><span>❀ 道中の回復量アップ</span><span>⚒ 杖の仕立て直し</span></div>${s.wagon?'<button class="buy" data-replay>森の探索を続ける →</button><div class="requirement">仲間と強化を引き継いで、少し手ごわい森へ。</div>':`<button class="buy" data-renovate ${s.highest<12||s.wood<30?'disabled':''}>改築する　▰ 30</button><div class="requirement">${s.highest<12?'森の主を倒すと、改築できます。':s.wood<30?'木材があと'+(30-s.wood)+'必要です。':'準備ができました。はじめての、おうちへ。'}</div>`}${s.wagon?`<div class="craft-card"><b>装備づくり：花飾りの杖</b><small>リリの魔力＋6・HP＋20</small><button class="secondary" data-craft ${s.crafted||s.wood<6||s.crystals<1?'disabled':''}>${s.crafted?'仕立て直し済み':'仕立て直す　▰6 ◆1'}</button></div><div class="actions"><button class="secondary" data-ending>旅の思い出</button><button class="secondary" data-share>一行をシェア</button></div>`:''}<div class="requirement" style="margin-top:16px">装備と料理は「工房」、素材集めは「採集」へ。<br>新しい地域と移動工房への改築は、次の旅のお楽しみ。</div></article>${speech()}`;
 }updateUI();
}
function sceneButton(c){return `<button class="scene-link" data-scene="${c.id}"><span>${s.story.read.includes(c.id)?'読了':'未読'}</span><b>${c.title}</b><i aria-hidden="true">›</i></button>`;}
function renderStory(){
 const pending=S.available(s),chapters=S.unlockedChapters(s);let html=`<div class="story-intro"><span class="eyebrow">朝つゆの森の物語</span><h2>帰る場所は、つくれる。</h2><p>おばあちゃんの移動工房を、もう一度。<br>最初の一歩は、三人で休める屋根づくり。</p><small>寄り道 ${Object.keys(s.story.choices).length} / 5　物語 ${chapters.length} / 6</small></div>`;
 if(pending.length){const e=pending[0];html+=`<article class="story-invitation">${art(e.hero)}<div><span class="eyebrow">道中の寄り道</span><h3>${e.title}</h3><p>あなたなら、どうする？</p><button class="primary" data-story-event="${e.id}">立ち寄る →</button></div></article>`;}
 else html+=`<p class="story-hint">${s.highest>=11?'五つの寄り道を、旅の記録に残しました。':'道を進むと、新しい寄り道が見つかります。'}</p>`;
 html+='<h3 class="subheading">三人の旅の物語</h3><div class="scene-list">'+chapters.map(sceneButton).join('')+'</div>';
 const next=S.CHAPTERS.find(c=>!chapters.includes(c));if(next)html+=`<p class="story-hint">次の物語：${next.wagon?'屋根付き馬車への改築後':next.need+'つ目の道を踏破すると解放'}</p>`;
 html+='<h3 class="subheading">火を囲んで、仲間とおしゃべり</h3><p class="story-hint">好物を1つ贈るたびに会話がひらきます。<br>3回贈ると、ずっと続く絆の効果も。</p>';
 for(const[id,d]of Object.entries(S.BONDS)){
  const joined=S.joined(s,id),hearts=s.story.bond[id],convos=S.conversations(s,id);html+=`<article class="bond-card"><div class="bond-top">${joined?art(id):'<span class="bond-unknown">？</span>'}<div><h3>${joined?G.HEROES[id].name:'まだ見ぬ旅の仲間'}</h3><p>${joined?'好物：'+G.ITEMS[d.favorite]:'森の道を'+(id==='noa'?3:6)+'つ進むと出会えます。'}</p><span class="bond-hearts" aria-label="絆 ${Math.floor(hearts/2)} / 3">${Array.from({length:3},(_,i)=>`<i class="${hearts>=(i+1)*2?'filled':''}">♥</i>`).join('')}</span></div></div>${joined?`<button class="secondary gift-button" data-gift="${id}" ${hearts>=6||s.bag[d.favorite]<1?'disabled':''}>${hearts>=6?'心が通う旅の仲間':G.ITEMS[d.favorite]+'を贈る'} <small>所持 <b data-bag="${d.favorite}">${s.bag[d.favorite]}</b></small></button><small class="bond-perk">絆3：${d.perk}${hearts>=6?'（発動中）':''}</small>${convos.map(sceneButton).join('')}`:''}</article>`;
 }
 html+='<h3 class="subheading">選んだ道の、思い出</h3>';
 html+=S.EVENTS.map(e=>{const chosen=Object.hasOwn(s.story.choices,e.id);return chosen?`<button class="scene-link" data-event-memory="${e.id}"><span>記録</span><b>${e.title}<small>${e.options[s.story.choices[e.id]].label}</small></b><i aria-hidden="true">›</i></button>`:`<div class="story-locked"><b>${e.title}</b><span>${s.highest>=e.need?'寄り道できる場所を見つけました':'道を'+e.need+'つ踏破すると出会えます'}</span>${s.highest>=e.need?`<button class="secondary" data-story-event="${e.id}">立ち寄る</button>`:''}</div>`;}).join('');$('#panel').innerHTML=html;
}
function showScene(id,index=0){const c=S.findScene(s,id);if(!c)return;sceneSession={id,index};const[name,line]=c.lines[index];const speaker=Object.keys(G.HEROES).find(k=>G.HEROES[k].name===name)||c.hero;
 open(`<div class="story-reader"><span class="eyebrow">旅の物語・${index+1} / ${c.lines.length}</span><h2>${c.title}</h2><div class="reader-portrait">${art(speaker)}</div><div class="dialogue"><b>${name}</b><p>${line}</p></div><div class="reader-controls">${index?'<button class="secondary" data-scene-prev>戻る</button>':''}<button class="primary" data-scene-next>${index===c.lines.length-1?'しおりを挟む ✓':'つづきを読む →'}</button></div><small class="reader-note">閉じても、物語から読み直せます。</small></div>`);
}
function showEvent(id){const e=S.available(s).find(e=>e.id===id);if(!e)return;sceneSession=null;open(`<div class="story-reader event-reader"><span class="eyebrow">道中の寄り道</span><h2>${e.title}</h2><div class="event-intro">${art(e.hero)}<p>${e.text}</p></div><div class="story-choices">${e.options.map((d,i)=>`<button data-story-choice="${e.id}" data-option="${i}" ${d.cost&&!G.canPay(s,d.cost)?'disabled':''}><b>${d.label}</b><small>${d.detail}</small></button>`).join('')}</div><p class="reader-note">選んだ道は、旅の記録に残ります。あとで決めても大丈夫。</p></div>`);}
function storyResult(e,text){open(`<div class="story-reader"><span class="eyebrow">旅の記録</span><h2>${e.title}</h2><div class="reader-portrait">${art(e.hero)}</div><div class="dialogue"><p>${text}</p></div><div class="actions"><button class="primary" data-close>旅をつづける →</button></div></div>`);}
function updateStory(){const pending=S.available(s),unread=S.unread(s);$('#story-dot').hidden=!pending.length&&!unread;const next=pending[0];$('#story-peek-label').textContent=next?'寄り道が見つかった：'+next.title:unread?'まだ読んでいない物語が '+unread+' 件あります':'おばあちゃんの工房を直す、三人の旅。';$('#story-peek').classList.toggle('has-news',!!next||!!unread);$('#tools-summary-count').textContent='料理 '+(s.bag.tea+s.bag.pie+s.bag.charm)+' 個';
 for(const b of document.querySelectorAll('[data-gift]')){const id=b.dataset.gift;b.disabled=s.story.bond[id]>=6||s.bag[S.BONDS[id].favorite]<1;}
 for(const b of document.querySelectorAll('[data-story-choice]')){const d=S.EVENTS.find(e=>e.id===b.dataset.storyChoice).options[Number(b.dataset.option)];b.disabled=!!d.cost&&!G.canPay(s,d.cost);}
}
function materialText(cost){return Object.entries(cost).map(([k,n])=>`${G.ITEMS[k]||{coins:'コイン',crystals:'魔石',wood:'木材'}[k]}${n}`).join('・');}
function supplyBar(){return `<div class="supply-bar">${['herb','berry','ore'].map(k=>`<span>${G.ITEMS[k]} <b data-bag="${k}">${s.bag[k]}</b></span>`).join('')}</div>`;}
function renderExtras(){
 let html=supplyBar();
 if(tab==='outing'){
  html+=`<div class="section-heading"><h2>寄り道の採集かご</h2><p>戦闘と並行して、8秒で素材を持ち帰ります。<br>4回の採集ごとに、魔石も1つ見つかります。</p></div><div class="gather-status" role="status" id="gather-status"></div>`;
  html+=Object.entries(G.SPOTS).map(([k,d])=>`<article class="activity-card"><div><h3>${d.name}</h3><p>${d.text}</p><small>${s.highest<d.need?'道を'+d.need+'つ踏破すると解放':'料理にする？ 装備にする？ 集める素材を選ぼう。'}</small></div><button class="secondary" data-gather="${k}">採集する</button></article>`).join('');
  html+=`<article class="activity-card delivery"><div><h3>何度でも：森のお届け便</h3><p>薬草3・木の実3 → コイン50</p><small>3回届けるごとに魔石1。配達済み <b id="delivery-count">${s.counts.deliveries}</b>回</small></div><button class="secondary" data-deliver>届ける</button></article>`;
 }else if(tab==='workshop'){
  html+='<div class="section-heading"><h2>小さな野外工房</h2><p>料理は道具袋へ。装備の効果は、作るとすぐ反映。</p></div><h3 class="subheading">火を囲んで、料理づくり</h3>';
  html+=Object.entries(G.RECIPES).map(([k,d])=>`<article class="activity-card"><div><h3>${d.name} <small>所持 <b data-bag="${k}">${s.bag[k]}</b></small></h3><p>${d.text}</p><small>${materialText(d.cost)}</small></div><button class="secondary" data-cook="${k}">作る</button></article>`).join('');
  html+='<h3 class="subheading">三人の装備・それぞれ3段階</h3>';
  html+=Object.entries(G.GEAR).map(([k,d])=>`<article class="activity-card"><div><h3>${d.name} <small>${s.gear[k]}/3</small></h3><p>${G.HEROES[k].name}：${d.text}</p><small>${k!=='lili'&&!s.unlocked[k]?'仲間になると製作できます':s.gear[k]>=3?'最後まで仕立てました':materialText(G.gearCost(s,k))}</small></div><button class="secondary" data-equip="${k}">${s.gear[k]>=3?'完成':'仕立てる'}</button></article>`).join('');
 }else{
  html+='<div class="section-heading"><h2>旅の依頼と魔物手帳</h2><p>小さな目標を達成して、旅じたくの報酬をもらおう。</p></div>';
  html+=G.MISSIONS.map(d=>{const done=s.claimed.includes(d.id);return `<article class="activity-card"><div><h3>${d.name}</h3><p>${{gathers:'採集',cooks:'料理',wins:'勝利',gears:'装備の製作・強化',meals:'料理を使う',highest:'道の踏破'}[d.key]} <b data-mission-progress="${d.id}">${Math.min(d.goal,G.progressValue(s,d.key))}</b> / ${d.goal}</p><small>報酬：${materialText(d.reward)}</small></div><button class="secondary" data-claim="${d.id}">${done?'受取済み':'受け取る'}</button></article>`;}).join('');
  html+='<h3 class="subheading">魔物図鑑</h3><div class="bestiary">'+[['slime','しずくスライム','草原から深い森まで暮らす。通常攻撃で確実に倒そう。'],['mushroom','もりきのこ','4・8の道では大きな親分も登場。守りを固めて。'],['golem','こけむす守り人','12の道の最後に待つ。3回目は全員攻撃。']].map(([id,name,tip])=>`<article>${s.bestiary[id]?art(id):'<span class="unknown">？</span>'}<h3>${s.bestiary[id]?name:'まだ出会っていない魔物'}</h3><p>${s.bestiary[id]?tip:'倒すとページが開きます。'}</p><small>討伐 <b data-bestiary="${id}">${s.bestiary[id]}</b>体</small></article>`).join('')+'</div>';
 }
 $('#panel').innerHTML=html;
}
function updateExtras(){
 for(const b of document.querySelectorAll('[data-bag]'))b.textContent=s.bag[b.dataset.bag];
 for(const b of document.querySelectorAll('[data-gather]'))b.disabled=!!s.gatherJob||s.highest<G.SPOTS[b.dataset.gather].need;
 const status=$('#gather-status');if(status)status.textContent=s.gatherJob?G.SPOTS[s.gatherJob.spot].name+'で採集中… あと'+Math.ceil(s.gatherJob.left)+'秒':'かごは空っぽ。採集先を選ぼう！';
 for(const b of document.querySelectorAll('[data-cook]'))b.disabled=!G.canPay(s,G.RECIPES[b.dataset.cook].cost);
 for(const b of document.querySelectorAll('[data-equip]')){const k=b.dataset.equip;b.disabled=s.gear[k]>=3||(k!=='lili'&&!s.unlocked[k])||!G.canPay(s,G.gearCost(s,k));}
 for(const b of document.querySelectorAll('[data-claim]')){const d=G.MISSIONS.find(m=>m.id===b.dataset.claim);b.disabled=s.claimed.includes(d.id)||G.progressValue(s,d.key)<d.goal;}
 for(const b of document.querySelectorAll('[data-mission-progress]')){const d=G.MISSIONS.find(m=>m.id===b.dataset.missionProgress);b.textContent=Math.min(d.goal,G.progressValue(s,d.key));}
 for(const b of document.querySelectorAll('[data-bestiary]'))b.textContent=s.bestiary[b.dataset.bestiary];
 for(const b of document.querySelectorAll('[data-deliver]'))b.disabled=!G.canPay(s,{herb:3,berry:3});
 if($('#delivery-count'))$('#delivery-count').textContent=s.counts.deliveries;
 for(const b of document.querySelectorAll('[data-use-item]')){const k=b.dataset.useItem;b.querySelector('b').textContent=s.bag[k];b.disabled=!s.bag[k]||r.mode!=='fight'||(k==='pie'&&s.foodTime>0);}
 const active=$('#food-status');active.textContent=s.foodTime>0?'パイの力：攻撃・回復＋25% あと'+Math.ceil(s.foodTime)+'秒':'';
 $('#journal-dot').hidden=!G.MISSIONS.some(m=>!s.claimed.includes(m.id)&&G.progressValue(s,m.key)>=m.goal);
 for(const b of document.querySelectorAll('[data-tactic]')){const on=s.tactic===b.dataset.tactic;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));}
 $('#tactic-description').textContent=G.TACTICS[s.tactic].text;
}
function speech(){const line=s.wagon?'「ただいま」って言える場所が、できたね。':s.highest>=12?'木材をしまって、屋根をつけよう！':s.unlocked.mina?'三人なら、もっと遠くまで行けそう！':s.unlocked.noa?'ノアがいると、ちょっと心強いね。':'おやつは持った。勇気も、すこし。';return `<div class="speech">${art('lili')}<p>${line}</p></div>`;}
function objective(){if(!s.counts.gathers)return'戦闘の間に「採集」で素材集め。料理・装備・配達に使えます。';if(!s.claimed.includes('firstGather'))return'はじめての採集、おつかれさま！「手帳」で依頼の報酬を受け取ろう。';if(s.wagon)return'旅の続きへ。装備を仕立て、依頼と魔物手帳を埋めながら再探索しよう。';if(s.highest>=12)return'森の主を倒しました！ 「荷馬車」で屋根付き馬車に改築しよう。';if(!s.unlocked.noa)return'まずは魔法を強化。森の道を3つ進むと、剣士ノアと出会えます。';if(!s.unlocked.mina)return'仲間の強化も忘れずに。6つ目の道で、癒やし手ミナが待っています。';return'森の主まで、あと'+(12-s.highest)+'つの道。魔法と守りを、バランスよく。';}
function updateUI(){
 updateStory();updateExtras();$('#coins').textContent=coin(s.coins);$('#wood').textContent=coin(s.wood);$('#crystals').textContent=coin(s.crystals);$('#place').textContent=G.PLACES[s.stage-1];$('#objective').textContent=objective();
 $('#journey-label').textContent=['camp','complete'].includes(r.mode)?s.wagon?'はじめての旅、達成。':'森の主を越えました。':`道 ${s.stage} / 12　出会い ${s.encounter+1} / ${G.ENCOUNTERS}`;
 const progress=s.stage+':'+s.encounter+':'+r.mode;if(progress!==lastProgress){lastProgress=progress;$('#progress').innerHTML=Array.from({length:G.ENCOUNTERS},(_,i)=>`<i class="${i<s.encounter?'past':i===s.encounter?'now':''}"></i>`).join('');}
 const ready=s.rally>=100&&r.mode==='fight'&&running;$('#rally').disabled=!ready;$('#rally-charge').textContent=r.heroBuff>0?'みんなの力が、ひとつに。':ready?'連携技を発動':`星の力 ${Math.floor(s.rally)} / 100`;$('#rally-meter').style.width=s.rally+'%';
 const big=r.enemies.some(e=>e.hp>0&&e.boss&&e.actions%3===2&&e.cooldown<1.1)&&r.mode==='fight';const banner=$('#world-banner');banner.className='world-banner'+(big?' danger':r.heroBuff>0?' success':'');banner.textContent=big?'大技がくる！「おねがい！」でバリアを張ろう':r.heroBuff>0?'連携中 ✧ 攻撃1.6倍・バリアで守る':r.mode!=='fight'?r.label:'';
 $('#wagon-dot').hidden=s.wagon||s.highest<12;
 for(const b of document.querySelectorAll('[data-upgrade]')){const key=b.dataset.upgrade;b.disabled=s.coins<G.cost(s,key);}
 for(const b of document.querySelectorAll('[data-learn]')){const key=b.dataset.learn;b.disabled=s.skills[key]||s.crystals<G.SKILLS[key].cost;}
 for(const b of document.querySelectorAll('[data-renovate]'))b.disabled=s.wagon||s.highest<12||s.wood<30;
}
function consume(events){A.add(events,r);let refresh=false;for(const e of events){if(e.type==='discover'){refresh=true;}else if(e.type==='gather'){toast(e.text);save();refresh=true;}else if(e.type==='join'){toast(e.text);refresh=true;save();sound.note(523.25,.5);}else if(e.type==='material'){save();refresh=true;}else if(e.type==='bossclear'){toast('森の主を撃破！ 荷馬車タブで改築しよう。');tab='wagon';refresh=true;save();}else if(e.type==='defeat')toast('荷馬車で立て直します。素材と強化は残ります。');else if(e.type==='upgrade'){refresh=true;sound.note(659.25,.25);}else if(e.type==='rally')sound.chime();}if(refresh)renderPanel();}
function ending(){open(`<span class="eyebrow">旅のひと区切り</span><h2>屋根の下に、ただいま。</h2><img class="ending-art" src="tabi-simple-ending.png" alt="屋根付き馬車のそばで、リリ・ノア・ミナが初めてのお茶を楽しむ"><p>おばあちゃんの設計図に、三人の書き込みが増えました。<br>工房を直す旅は、ここから。<br>まずはこの屋根の下で、お茶にしよう。</p><p style="font-size:11px">${s.wins}戦の思い出 ・ 仲間3人 ・ 屋根付き馬車<br>移動工房へ続く物語は、この先のお楽しみ。</p><div class="actions"><button class="primary" data-share>一行をシェア</button><button class="secondary" data-scene="chapter-5">三人の約束を読む</button><button class="secondary" data-close>馬車を眺める</button></div>`);}
function help(){open(`<span class="eyebrow">リリの旅じたく帳</span><h2>旅のしおり</h2><div class="help-grid"><article><h3>上で戦って、下で育てる</h3>通常攻撃と回復は自動。コインで魔法と仲間を強化できます。強化は戦闘の途中でも、すぐ反映されます。</article><article><h3>三人で、ひとつの作戦</h3>リリは魔法。ノアは前に立って守り、ミナは傷ついた仲間を回復。仲間は3つ目・6つ目の道で必ず加入します。</article><article><h3>新しい魔法と連携</h3>新しい道を踏破すると魔石を入手。「ふたつの火」は攻撃、「まもりの盾」は防御、「花の祈り」は回復。星100で「おねがい！」が使えます。敵の大技の予告に合わせるのもおすすめ。</article><article><h3>負けても、旅はつづく</h3>全員が倒れると荷馬車で休み、3つの道ごとの区切りから自動で再挑戦。コイン・素材・強化は残ります。</article><article><h3>森の旅のゴール</h3>森の12の道を進み、森の主を倒して屋根付き馬車へ改築。改築後は道中の回復が増え、強化を引き継いだ再探索ができます。移動工房と次の地域は今後の内容です。</article><article><h3>採集・料理・装備</h3>「採集」で8秒の素材集め。4回ごとに魔石も入手。「工房」で料理や各3段階の専用装備を作れます。料理は道具袋から戦闘中に使用。「手帳」の依頼報酬も忘れずに。作戦の切り替えは攻撃と最大HPに反映されます。HPの割合は引き継ぐため、切り替えによる回復はできません。</article><article><h3>旅の物語と絆</h3>「物語」で本編と五つの寄り道が読めます。選択の結果は一度だけ受け取り、記録はいつでも読み直せます。仲間の好物を工房で作り、3回贈ると会話3つと専用の絆効果が開きます。会話は好きなときに開けます。</article><article><h3>羽根のしおり</h3>このブラウザに自動保存。閉じている間は最大4時間、踏破した道に応じてコインを集めます。素材と道の進行は、画面を開いている間に増えます。</article></div><h3 style="font-family:var(--serif)">一行の記録</h3><ul class="story-list"><li>踏破した道 ${s.highest}/12</li><li>ノア ${s.unlocked.noa?'一緒に旅しています':'3つ目の道で出会う'}</li><li>ミナ ${s.unlocked.mina?'一緒に旅しています':'6つ目の道で出会う'}</li><li>荷馬車 ${s.wagon?'屋根付き馬車':'手押し車'}</li><li>勝利 ${s.wins}回 ・ 立て直し ${s.defeats}回</li></ul>`);}
async function share(){
 const c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d'),bg=new Image();bg.src='tabi-simple-forest.png';await bg.decode();x.drawImage(bg,0,-80,1200,800);x.fillStyle='#fff8e9ed';x.fillRect(28,25,1144,190);x.strokeStyle='#b79b69';x.strokeRect(34,31,1132,178);x.fillStyle='#a9644d';x.font='bold 51px serif';x.fillText('ちいさな魔女の旅じたく',60,109);x.fillStyle='#8f795a';x.font='25px serif';x.fillText(s.wagon?'小さな旅が、帰る場所になった。':`リリたちと、森の道を ${s.highest} / 12 踏破。`,65,163);A.paint(x,s.wagon?'wagon':'cart',190,549,s.wagon?240:170);A.paint(x,'lili',455,550,260);if(s.unlocked.noa)A.paint(x,'noa',715,550,260);if(s.unlocked.mina)A.paint(x,'mina',955,550,250);x.fillStyle='#fff7e5ee';x.fillRect(28,574,1144,37);x.fillStyle='#8b7152';x.font='16px sans-serif';x.fillText('戦う仲間と、育つおうち。無料・登録不要。',48,599);x.textAlign='right';x.fillText('sakamoto241.github.io/game/tabi.html',1152,599);const url=c.toDataURL('image/png');const text=`上では仲間が戦って、下ではあなたが育てる。\n\n${s.wagon?'リリたちと森の主を倒して、手押し車が屋根付き馬車になりました。':`朝つゆの森を${s.highest}/12踏破！`}\n#ちいさな魔女の旅じたく #ブラウザゲーム`;
 open(`<span class="eyebrow">一行の、旅の記録</span><h2>この一行で、旅をした。</h2><img class="share-card" src="${url}" alt="リリたちの旅の記録"><div class="actions"><a class="primary" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://sakamoto241.github.io/game/tabi.html')}" target="_blank" rel="noopener noreferrer">Xに投稿する ↗</a><a class="secondary" href="${url}" download="ちいさな魔女の旅じたく.png">画像を保存</a></div><p style="font-size:10px">画像も載せるときは、保存した画像を投稿に添えてください。</p>`);
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-scene-next')){if(!sceneSession)return;const c=S.findScene(s,sceneSession.id);if(sceneSession.index+1<c.lines.length)showScene(c.id,sceneSession.index+1);else{S.markRead(s,c.id);sceneSession=null;save();close();renderPanel();}}
 else if(b.hasAttribute('data-scene-prev')){if(sceneSession)showScene(sceneSession.id,Math.max(0,sceneSession.index-1));}
 else if(b.dataset.scene)showScene(b.dataset.scene);
 else if(b.dataset.storyEvent)showEvent(b.dataset.storyEvent);
 else if(b.dataset.storyChoice){const e=S.EVENTS.find(e=>e.id===b.dataset.storyChoice),result=S.choose(s,r,e.id,Number(b.dataset.option));if(result.ok){save();renderPanel();storyResult(e,result.reply);}else toast(result.error);}
 else if(b.dataset.eventMemory){const e=S.EVENTS.find(e=>e.id===b.dataset.eventMemory);if(Object.hasOwn(s.story.choices,e.id))storyResult(e,e.options[s.story.choices[e.id]].reply);}
 else if(b.dataset.gift){const result=S.gift(s,r,b.dataset.gift);if(result.ok){save();renderPanel();toast(result.reply);}else toast(result.error);}
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
 else if(b.hasAttribute('data-start')){running=true;$('#close').hidden=false;close();save();updateUI();toast('「採集」で素材を集めながら、魔法を育てよう。');}
 else if(b.dataset.tab){tab=b.dataset.tab;renderPanel();}
 else if(b.dataset.upgrade||b.dataset.learn){const result=b.dataset.upgrade?G.upgrade(s,r,b.dataset.upgrade):G.learn(s,r,b.dataset.learn);if(result.ok){consume(r.events.filter(e=>e.type==='upgrade'));renderPanel();save();}else toast(result.error);}
 else if(b.hasAttribute('data-renovate')){const result=G.renovate(s,r);if(result.ok){renderPanel();save();sound.chime();ending();}else toast(result.error);}
 else if(b.hasAttribute('data-replay')){if(G.replay(s,r)){close();save();renderPanel();toast('強化を引き継いで、もう一度森へ。');}}
 else if(b.hasAttribute('data-craft')){const result=G.craft(s,r);if(result.ok){consume(r.events.filter(e=>e.type==='upgrade'));save();renderPanel();toast('花飾りの杖ができました。');}else toast(result.error);}
 else if(b.hasAttribute('data-ending'))ending();else if(b.hasAttribute('data-close'))close();else if(b.hasAttribute('data-share'))share().catch(()=>toast('画像を作れませんでした。もう一度お試しください。'));
});
$('#rally').onclick=()=>{const result=G.rally(s,r);if(result.ok){consume(r.events.filter(e=>e.type==='rally'||e.type==='heal'));save();updateUI();}else toast(result.error);};$('#help').onclick=help;
const sound=new window.TabiMusic.Player({volume:.55});
async function toggleMusic(){
 const button=$('#sound');if(sound.busy)return;sound.busy=true;button.disabled=true;button.textContent=sound.on?'BGM OFF':'BGM …';button.setAttribute('aria-busy','true');
 try{if(sound.on)await sound.disable();else await sound.enable();}
 catch(_){await sound.disable().catch(()=>{});toast('このブラウザでは音楽を再生できません。');}
 finally{sound.busy=false;button.disabled=false;button.setAttribute('aria-busy','false');button.textContent='BGM '+(sound.on?'ON':'OFF');button.setAttribute('aria-pressed',String(sound.on));button.setAttribute('aria-label','ほのぼのBGMを'+(sound.on?'止める':'再生する'));}
}
$('#sound').onclick=toggleMusic;
const setBattleHeight=()=>document.documentElement.style.setProperty('--battle-height',$('.sticky-world').getBoundingClientRect().height+'px');
if(window.ResizeObserver)new ResizeObserver(setBattleHeight).observe($('.sticky-world'));else window.addEventListener('resize',setBattleHeight);setBattleHeight();
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();sound.background(true).catch(()=>{});}else{if(running){const reward=G.offline(s);if(reward.coins)toast('おかえりなさい。留守の間にコイン ＋'+reward.coins);save();updateUI();}lastFrame=performance.now();acc=0;sound.background(false).catch(()=>{});}});
window.addEventListener('pagehide',()=>{save();sound.background(true).catch(()=>{});});
window.addEventListener('pageshow',()=>{if(!document.hidden)sound.background(false).catch(()=>{});});
try{await A.load();$('#loading').remove();}catch(error){$('#loading').innerHTML='<b>絵の読み込みができませんでした。</b><small>通信を確認して、もう一度お試しください。</small><button class="primary" id="retry-assets">再読み込み</button>';$('#retry-assets').onclick=()=>location.reload();return;}
renderPanel();if(!running)welcome();else{save();if(away.coins)toast('おかえりなさい。留守の間にコイン ＋'+away.coins);}
function frame(now){const dt=Math.max(0,Math.min(.2,(now-lastFrame)/1000));lastFrame=now;
 if(running&&!document.hidden){acc+=dt;while(acc>=.05){consume(G.step(s,r,.05));acc-=.05;}saveClock+=dt;uiClock+=dt;if(saveClock>=10){saveClock=0;save();}if(uiClock>=.15){uiClock=0;updateUI();}}
 A.draw(canvas,s,r,dt);requestAnimationFrame(frame);
}lastFrame=performance.now();requestAnimationFrame(frame);
})();
