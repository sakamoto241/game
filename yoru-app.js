(function(){
'use strict';
const G=window.YoruGame,A=window.YoruArt,$=s=>document.querySelector(s),app=$('#app'),modal=$('#modal'),KEY='yorunotomodachi-v1';
let state=null,battle=null,tab='map',foodOpen=false,locked=false,toastTimer,saveFailed=false;
try{state=G.load(JSON.parse(localStorage.getItem(KEY)));}catch(_){}
const monster=id=>id==='lantern'?G.BOSS:G.MONSTERS[id];
const art=(id,cls='',pose='idle')=>`<img class="${cls}" data-sprite="${id}" data-pose="${pose}" src="${A.url(id,pose)}" alt="${monster(id).name}" draggable="false">`;
const element=id=>`<span style="color:${G.ELEMENTS[id].color}">${G.ELEMENTS[id].name}</span>`;
const tag=id=>`<span class="tag" style="color:${G.ELEMENTS[id].color};background:#26302d">${G.ELEMENTS[id].name}</span>`;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){if(!saveFailed){toast('保存できません。このブラウザのストレージ設定を確認してください。');saveFailed=true;$('#save-status').textContent='このブラウザでは保存できません';}}}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function openModal(html){$('#modal-content').innerHTML=html;if(!modal.open)modal.showModal();}
function closeModal(){modal.close();}
$('.close').addEventListener('click',closeModal);
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function top(){window.scrollTo({top:0,behavior:'instant'});}
function scene(){return `<div class="scene" style="background-image:url('${A.background(0)}')" aria-hidden="true"><div class="moon"></div><i class="hanging a"></i><i class="hanging b"></i>${art('koke','actor side-a')}${art('akari','actor')}${art('shizu','actor side-b')}</div>`;}
function renderIntro(){
 app.innerHTML=`<section class="hero"><div class="hero-copy"><span class="eyebrow">PIXEL YOKAI ADVENTURE</span><h1>今夜、<em>化けて</em><br>出会おう。</h1><p>人が眠ると、町が目をさます。<br>おやつをひとつ。勇気をすこし。<br>あやしいあの子も、明日には仲間。</p><span class="seal">十二の妖怪と、夜の主</span></div>${scene()}</section><div class="section-heading"><h2>最初のともだちを選ぶ</h2><span>あとから、全員と出会えます</span></div><div class="starters">${G.STARTERS.map(id=>{const d=monster(id);return `<button class="starter" data-start="${id}"><span class="tag">${G.ELEMENTS[d.element].name} / ${d.role}</span>${art(id)}<strong class="name">${d.name}</strong><p>${d.tip}</p><span class="pick">この子と夜の町へ <span>↗</span></span></button>`;}).join('')}</div><div class="rules"><div class="rule"><b><i>一</i>倒す？ 仲間にする？</b>手かげんで弱らせて、好物をおすそわけ。なつき100で仲間に。</div><div class="rule"><b><i>二</i>三体で、ひとつの作戦。</b>相性・回復・足止め。攻撃だけでは越せない夜がある。</div><div class="rule"><b><i>三</i>夜の主が待っている。</b>五つの通りを抜け、歌舞伎舞台に立つ大妖怪へ。</div></div>`;
}
function party(){return `<aside class="party-box"><div class="box-title">今夜の三人組 <span>探索ごとにHP全回復</span></div><div class="party-list">${[0,1,2].map(i=>{const p=state.roster.find(p=>p.id===state.team[i]);if(!p)return '<div class="empty-slot">まだ見ぬ<br>ともだちの席</div>';const d=monster(p.id);return `<div class="party-row">${art(p.id)}<div><strong>${d.name}</strong><small>Lv.${p.level} · ${G.ELEMENTS[d.element].name} / ${d.role}</small></div><button data-profile="${p.id}" aria-label="${d.name}の詳細・編成">編成</button></div>`;}).join('')}</div><div class="party-bottom"><button class="text-link" data-tab="dex">妖怪帖 ${state.roster.length} / 12</button><button class="text-link" data-help>遊び方・相性表</button></div></aside>`;}
function guide(){if(!state.wins)return '<b>はじめての夜。</b>「おかえり横丁」で、最初のともだち探し。<br><small>「手かげん」で弱らせて → 好物のおやつ。まめだまも一緒です。</small>';if(state.team.length<3)return '<b>三人そろうと、夜はもっと面白い。</b><br><small>横丁で手かげん → 好物のおやつ。まずは3体編成を目指そう。</small>';if(state.boss)return '<b>夜明けが来ても、縁は消えない。</b><br><small>妖怪帖を埋めるもよし。別の三人組で、もう一度夜の主に挑むもよし。</small>';return '<b>火 → 木 → 水 → 火。</b> 有利な相手には威力アップ。<br><small>敵の大技予告を見たら守る。妖気が3つたまったら必殺技。</small>';}
function renderTown(){
 battle=null;audio.boss=false;foodOpen=false;
 let content='';
 if(tab==='map')content=`<div class="guide">${guide()}</div><div class="areas">${G.AREAS.map(a=>{const yes=G.unlock(state,a.id),clear=state.cleared.includes(a.id);return `<button class="area ${a.boss?'boss':''} ${yes?'':'locked'}" data-area="${a.id}" ${yes?'':'disabled'}><span class="area-scenery" style="background-image:url('${A.background(a.id)}')" aria-hidden="true"></span><span class="area-num">${a.boss?'FINAL ACT':`第 ${['一','二','三','四','五'][a.id]} 夜`} · Lv.${a.level}</span><span class="arrow">${yes?'↗':'鍵'}</span><strong>${a.name}</strong><small class="${clear?'complete':''}">${clear?'✓ 探索済み · もう一度遊べます':yes?a.subtitle:'前の通りをクリアで解放'}</small></button>`;}).join('')}</div>`;
 else if(tab==='dex')content=`<div class="guide">妖怪帖 <b>${state.roster.length} / 12</b><br><small>妖怪を選ぶと詳細と編成。同じ妖怪と仲良くなると、絆が深まりHPが少しアップ。</small></div><div class="collection">${G.SPECIES.map((d,i)=>{const p=state.roster.find(p=>p.id===d.id);return p?`<button class="dex-card" data-profile="${d.id}">${art(d.id)}<strong>${d.name}</strong><small>Lv.${p.level} · ${G.ELEMENTS[d.element].name} / ${d.role}</small></button>`:`<div class="dex-card unknown"><span class="question">？</span><strong>まだ見ぬ妖怪</strong><small>其の ${String(i+1).padStart(2,'0')}</small></div>`;}).join('')}</div>`;
 else content=`<div class="guide"><b>口説くにも、おやつがいる。</b><br><small>相手の好物なら、なつきがさらに＋25。弱らせてから渡すと効果大。</small></div><div class="shop-items">${Object.entries(G.FOODS).map(([id,d])=>`<div class="shop-item"><span class="food-icon">${d.icon}</span><div><strong>${d.name}</strong><small>持ちもの ${state.foods[id]}個 · 1個 12こばん</small></div><button data-buy="${id}" ${state.coins<12||state.foods[id]>=99?'disabled':''}>買う ＋1</button></div>`).join('')}</div>`;
 app.innerHTML=`<div class="town-head"><div><span class="eyebrow">${state.boss?'DAWN BREAKS':'THE TOWN AFTER DARK'}</span><h1>${state.boss?'夜明けの、寄り道。':'さて、どこへ化けに行く？'}</h1></div><div class="purse"><b>${state.coins}</b>こばん</div></div><div class="town-grid">${party()}<section><nav class="tabs" aria-label="町のメニュー">${[['map','町を歩く'],['dex','妖怪帖'],['shop','おやつ屋']].map(([id,name])=>`<button class="${tab===id?'active':''}" data-tab="${id}" aria-current="${tab===id?'page':'false'}">${name}</button>`).join('')}</nav>${content}</section></div>`;
}
function profile(id){
 const p=state.roster.find(p=>p.id===id);if(!p)return;const d=monster(id),s=G.stats(id,p.level,p.bond);
 openModal(`${art(id,'profile-img')}<div class="profile-name"><h2>${d.name}</h2>${tag(d.element)} <span class="tag">${d.role}</span></div><p class="profile-copy">${d.description}</p><div class="profile-stats"><span>LEVEL<b>${p.level}</b></span><span>HP<b>${s.maxHp}</b></span><span>攻撃<b>${s.atk}</b></span><span>絆<b>${p.bond}</b></span></div><p class="profile-copy">必殺技 <b style="color:var(--gold)">${d.skill}</b><br>${d.tip}<br>好物：${G.FOODS[d.fav].name}<br>${p.level<6?`次のレベルまで ${G.needed(p.level)-p.xp} 経験値`:'育成完了 · レベルMAX'}</p><h3 style="font:700 14px var(--serif)">三人組に編成する</h3><div class="slot-options">${[0,1,2].map(i=>`<button data-assign="${id}" data-slot="${i}">${i+1}番の席<small>${state.team[i]?monster(state.team[i]).name:'空いています'}</small></button>`).join('')}</div>`);
}
function help(){openModal(`<span class="eyebrow">HOW TO PLAY</span><h2>夜の町の、歩き方。</h2><div class="help-columns"><article><h3>相性で攻める</h3>火は木に、木は水に、水は火に強い。<br>有利は1.65倍、不利は0.65倍。夜はすべてに等倍。敵を選んで狙いを変えられます。</article><article><h3>敵の予告を見る</h3>「大技をためる」は準備中。次の「大技」のターンで守るとダメージ60%減。敵の狙いは予告に表示されます。</article><article><h3>おやつで仲間に</h3>手かげんは選んだ1体で攻撃し、敵のHPを1残します。HP40%以下＋好物が狙い目。なつき100で仲間に。おやつのターンは攻撃できません。</article><article><h3>妖気と必殺技</h3>全員攻撃・全員守るで妖気＋1。仲間を選び、3つたまったら必殺技。他の仲間の妖気も＋1。回復や足止めを使い分けよう。</article><article><h3>育成と編成</h3>勝つと出場した全員に経験値。最大Lv.6。妖怪帖で3体を編成。探索を始めるたびHPは全回復。負けても仲間と育成は残ります。</article><article><h3>自動保存</h3>仲間・育成・持ちものをこのブラウザに保存。戦闘の途中で閉じたときは町から再開します。使用したおやつは戻りません。</article></div>`);}
function enterArea(id){
 if(!G.unlock(state,id))return;const a=G.AREAS[id];
 openModal(`<span class="eyebrow">${a.boss?'THE FINAL ACT':'TONIGHT’S ENCOUNTER'}</span><h2>${a.name}</h2><p class="profile-copy">${a.boss?'緋色の幕が開く。町の帰り道をのみこんだ「まよい灯籠」。体力が減ると属性が変わり、取り巻きは回復と結界で主を守る。':'今夜の気配：'+a.pool.map(id=>monster(id).name).join('・')}<br><br>${a.boss?'推奨：3体ともLv.6。回復と守りを忘れずに。':`相手はLv.${a.level}・${a.count}体。味方はHP全回復で出発します。`}</p><div class="result-buttons"><button class="primary" data-go="${id}">${a.boss?'いざ、開幕。':'この通りを探索する →'}</button></div>`);
}
function begin(id){closeModal();battle=G.createBattle(state,id);foodOpen=false;save();audio.boss=!!G.AREAS[id].boss;renderBattle();top();}
function unit(u,i,enemy){
 const d=monster(u.id),alive=u.hp>0&&!u.captured,selected=(enemy?battle.target:battle.selected)===i;
 return `<button class="unit ${enemy?'enemy':'ally'} ${selected&&alive?'selected':''} ${alive?'':'down'}" ${enemy?'data-target':'data-ally'}="${i}" ${alive&&!locked?'':'disabled'} aria-label="${d.name} ${enemy?'を狙う':'を選ぶ'} HP ${u.hp}/${u.maxHp}">${enemy?`<span class="intent ${u.intent?.kind==='big'?'danger':u.intent?.kind==='heal'||u.intent?.kind==='shield'?'support':''}">${u.captured?'ともだち！':u.hp<=0?'力つきた':u.intent?.label||''}</span>`:''}${art(u.id,'',u.captured?'happy':u.hp<=0?'hurt':'idle')}<span class="unit-name">${d.name} <span class="level">Lv.${u.level}</span></span><div class="bar ${u.hp/u.maxHp<.3?'low':''}"><i style="width:${100*u.hp/u.maxHp}%"></i></div><span class="hp-text"><span>${element(u.element)}${u.shield?' · 盾'+u.shield:''}${u.burn?' · 火傷':''}</span><span>${u.hp} / ${u.maxHp}</span></span>${enemy?`<div class="rapport">${u.id==='lantern'?'夜の主':u.captured?'ともだちになった':`なつき ${u.rapport} / 100`}</div>`:`<div class="pips" aria-label="妖気 ${u.charge}/3"><b>${'◆'.repeat(u.charge)}</b>${'◇'.repeat(3-u.charge)}${u.charge===3?' 必殺OK':''}</div>`}</button>`;
}
function battleHint(){
 const target=battle.enemies[battle.target],actor=battle.allies[battle.selected];
 if(state.roster.length===2&&target?.hp>0&&target.id!=='lantern')return `最初のともだち探し：手かげん → HPを減らす → 好物の${G.FOODS[monster(target.id).fav].name}！`;
 if(battle.enemies.some(e=>e.hp>0&&!e.captured&&e.intent?.kind==='big'))return '大技の予告！ 全員で守るか、相手の行動を止めよう。';
 return actor?`${monster(actor.id).name}：${monster(actor.id).tip}`:'仲間を選んで指示を出そう。';
}
function foodMenu(){
 const t=battle.enemies[battle.target];if(!t)return '';
 return `<div class="food-menu"><p>${monster(t.id).name} におすそわけ <span style="color:var(--gold)">なつき ${t.rapport}</span><br><small class="detail-desc">${t.id==='lantern'?'今はおやつを受け取りません。':`好物：${G.FOODS[monster(t.id).fav].name} · 100になったら、ともだち。`}</small></p><div class="food-grid">${Object.entries(G.FOODS).map(([id,f])=>{const gain=G.foodGain(t,id,state.roster.length===2);return `<button data-feed="${id}" ${state.foods[id]>0&&t.id!=='lantern'&&!locked?'':'disabled'}>${f.icon} ${f.name}<small>残り${state.foods[id]}個 · ＋${gain}${t.rapport+gain>=100?' 仲間に！':''}</small></button>`;}).join('')}</div><button class="text-link" data-food>閉じる</button></div>`;
}
function renderBattle(){
 const a=G.AREAS[battle.area],actor=battle.allies[battle.selected];
 app.innerHTML=`<section class="battle-main"><div class="battle-top"><div><small>${a.boss?'FINAL ACT / 夜の主':'ENCOUNTER / 夜道の出会い'}</small><h1>${a.name}</h1></div><button data-retreat>町へ戻る</button></div><div class="combat-layout"><div><div class="arena ${a.boss?'boss-arena':''}" style="background-image:url('${A.background(battle.area)}')"><div class="arena-moon"></div><div class="round-mark">${a.boss?'─ 幕が上がる ─':'─ 百鬼夜行 ─'}　TURN ${String(battle.turn).padStart(2,'0')}</div><div class="units enemies">${battle.enemies.map((u,i)=>unit(u,i,true)).join('')}</div><div class="versus">縁を結ぶか、刃を交えるか。</div><div class="units allies">${battle.allies.map((u,i)=>unit(u,i,false)).join('')}</div></div><div class="command-panel">${foodOpen?foodMenu():''}<div class="commands"><button class="command attack" data-command="attack" ${locked?'disabled':''}>全員攻撃<small>3体で狙った敵へ</small></button><button class="command" data-command="guard" ${locked?'disabled':''}>全員守る<small>60%軽減・妖気＋1</small></button><button class="command skill" data-command="skill" ${!actor||actor.hp<=0||actor.charge<3||locked?'disabled':''}>必殺技<small>${actor?monster(actor.id).skill:'仲間を選ぶ'}</small></button><button class="command" data-command="mercy" ${!actor||actor.hp<=0||locked?'disabled':''}>手かげん<small>選んだ1体でHP1残し</small></button><button class="command" data-food ${locked?'disabled':''}>おやつ<small>なつき100で仲間に</small></button><button class="command" data-help>作戦帳<small>相性・遊び方を見る</small></button></div><p class="battle-helper" role="status">${locked?'妖怪たちが動いている……':battleHint()}</p></div></div><aside class="combat-sidebar"><h2>夜道のきろく</h2><div class="battle-log" role="log">${battle.log.length?battle.log.slice(-12).reverse().map(text=>`<p>${text}</p>`).join(''):'<p>妖怪があらわれた！<br>相手を選んで、最初の指示を。</p>'}</div><div class="matchup"><b>火 → 木 → 水 → 火</b><br>矢印の相手に強い。夜は等倍。<br>仲間を押すと、必殺技の使い手を変更。</div></aside></div></section>`;
}
async function command(cmd,food){
 if(!battle||battle.done||locked)return;
 const acting=cmd==='attack'||cmd==='guard'?battle.allies.map((a,i)=>a.hp>0?i:-1).filter(i=>i>=0):[battle.selected];
 const r=G.act(battle,state,cmd,food);if(!r.ok){toast(r.error);return;}
 foodOpen=false;locked=true;save();audio.effect(cmd==='skill'?'skill':cmd==='food'?'food':'hit');renderBattle();
 for(const i of acting){const unit=document.querySelector(`[data-ally="${i}"]`);if(unit){unit.classList.add(cmd==='guard'?'guarding':'acting');const img=unit.querySelector('img');img.src=A.url(img.dataset.sprite,cmd==='food'?'happy':cmd==='guard'?'idle':'attack');}}
 const hits=new Map();for(const e of battle.events.filter(e=>e.type==='damage')){const key=e.side+':'+e.slot;hits.set(key,(hits.get(key)||0)+e.amount);}
 for(const [key,n] of hits){const [side,slot]=key.split(':'),el=document.querySelector(`[data-${side==='enemy'?'target':'ally'}="${slot}"]`);if(el){el.classList.add('hit');const img=el.querySelector('img');img.src=A.url(img.dataset.sprite,'hurt');const pop=document.createElement('span');pop.className='damage-pop';pop.textContent=n>0?'−'+n:'防御';el.appendChild(pop);}}
 await new Promise(r=>setTimeout(r,420));locked=false;
 if(battle.done){G.finishBattle(state,battle);save();renderResult();audio.effect(battle.victory?'win':'lose');top();}
 else renderBattle();
}
function renderResult(){
 const r=battle.reward,friend=r.friends.find(f=>!f.duplicate),title=r.victory?(r.boss?'夜明けを、つれてきた。':friend?'ともだちが、増えた。':'今夜も、ひとつ前へ。'):'この夜は、手ごわかった。';
 app.innerHTML=`<section class="result-wrap"><div class="result-head"><span class="eyebrow">${r.victory?r.boss?'THE DAWN / 夜の主 討伐':'GOOD NIGHT, GOOD FIGHT':'UNTIL NEXT NIGHT'}</span><h1>${title}</h1><span class="seal">${G.AREAS[r.area].name} · ${r.turns}ターン</span><div class="result-team">${(friend?[friend.id,...state.team.filter(id=>id!==friend.id)].slice(0,3):state.team).map(id=>art(id,'',r.victory?'happy':'hurt')).join('')}</div><div class="reward-line"><span>＋${r.coins} こばん</span><span>出場した全員 EXP ＋${r.exp}</span></div></div><div class="result-notes">${r.friends.map(f=>`<p>${G.FOODS[monster(f.id).fav].icon} <b>${monster(f.id).name}</b> ${f.duplicate?'との絆が深まった。':'と、ともだちになった！ 妖怪帖で編成できます。'}</p>`).join('')}${r.levels.map(l=>`<p>${monster(l.id).name}　Lv.${l.from} → <b style="color:var(--gold)">Lv.${l.to}</b></p>`).join('')}${!r.victory?'<p>仲間と育成は残ります。探索するとHPは全回復。<br>回復役の編成と、大技に合わせた「全員守る」を試そう。</p>':''}${r.boss&&r.victory?'<p>幕が下り、町に帰り道が戻る。<br>その夜、あなたには三人のともだちがいた。</p>':''}</div><div class="result-buttons"><button class="primary" data-town>町へ帰る →</button><button class="secondary" data-share>今夜の三人組をシェア</button></div>${r.victory&&r.area<5?`<div class="result-buttons"><button class="secondary" data-area="${r.area+1}">次の通りへ ↗</button><button class="text-link" data-area="${r.area}">同じ通りで仲間を探す</button></div>`:`<div class="result-buttons"><button class="text-link" data-area="${r.area}">もう一度、挑む</button></div>`}</section>`;
}
function shareText(){return `その妖怪、倒す？ それとも、おやつで口説く？\n\n${state.boss?'夜の主「まよい灯籠」を倒した！':`今夜のともだち ${state.roster.length}/12体。`}\n${state.team.map(id=>{const p=state.roster.find(p=>p.id===id);return `${monster(id).name} Lv.${p.level}`;}).join(' / ')}\n\n#ヨルノトモダチ #ブラウザゲーム` ;}
async function card(){
 const c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 x.fillStyle='#eae6f5';x.fillRect(0,0,1200,630);x.strokeStyle='#bf9fd1';x.strokeRect(25,25,1150,580);x.fillStyle='#9672a8';x.font='16px sans-serif';x.fillText('MIDNIGHT COMPANIONS / 今夜の三人組',65,78);x.fillStyle='#745386';x.font='900 50px sans-serif';x.fillText('ヨルノトモダチ',62,151);x.fillStyle='#c679a4';x.font='24px serif';x.fillText(state.boss?'夜の主、討伐。':'今夜、化けて出会おう。',65,202);const sceneImg=new Image();sceneImg.src=A.background(state.boss?5:0);await sceneImg.decode();x.drawImage(sceneImg,60,235,1080,285);x.fillStyle='#fff4e5';x.fillRect(60,456,1080,64);
 for(let i=0;i<state.team.length;i++){const id=state.team[i],p=state.roster.find(p=>p.id===id),img=new Image();img.src=A.url(id);await img.decode();x.drawImage(img,130+i*340,243,205,205);x.fillStyle='#26302d';x.font='700 24px serif';x.textAlign='center';x.fillText(`${monster(id).name}  Lv.${p.level}`,232+i*340,485);}x.textAlign='left';x.fillStyle='#967c9e';x.font='19px sans-serif';x.fillText(`ともだち ${state.roster.length}/12  ・  ${state.wins}勝  ・  登録不要の妖怪あつめRPG`,65,565);x.textAlign='right';x.fillStyle='#9672a8';x.font='14px sans-serif';x.fillText('sakamoto241.github.io/game/yoru.html',1135,565);return c;
}
async function share(){
 const c=await card(),url=c.toDataURL('image/png');openModal(`<span class="eyebrow">TONIGHT’S COMPANIONS</span><h2>この三人で、夜を越えた。</h2><img class="share-preview" src="${url}" alt="今夜の三人組の結果カード"><div class="result-buttons"><a class="primary" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent('https://sakamoto241.github.io/game/yoru.html')}" target="_blank" rel="noopener noreferrer">Xに投稿する ↗</a><a class="secondary" href="${url}" download="ヨルノトモダチ.png">画像を保存</a></div><p class="detail-desc">画像も一緒に載せるときは、保存した画像をXの投稿に添えてください。</p>`);
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button,a');if(!b||b.disabled)return;
 if(b.dataset.start){state=G.newGame(b.dataset.start);save();renderTown();top();audio.effect('food');}
 else if(b.dataset.tab){tab=b.dataset.tab;renderTown();}
 else if(b.dataset.profile)profile(b.dataset.profile);
 else if(b.dataset.assign){G.setTeam(state,Number(b.dataset.slot),b.dataset.assign);save();closeModal();renderTown();toast('今夜の三人組を変更しました。');}
 else if(b.dataset.area!==undefined)enterArea(Number(b.dataset.area));
 else if(b.dataset.go!==undefined)begin(Number(b.dataset.go));
 else if(b.dataset.buy){const r=G.buyFood(state,b.dataset.buy);if(r.ok){save();renderTown();toast(G.FOODS[b.dataset.buy].name+'を買いました。');}else toast(r.error);}
 else if(b.hasAttribute('data-help'))help();
 else if(b.dataset.target!==undefined&&battle&&!locked){battle.target=Number(b.dataset.target);renderBattle();}
 else if(b.dataset.ally!==undefined&&battle&&!locked){battle.selected=Number(b.dataset.ally);renderBattle();}
 else if(b.dataset.command)command(b.dataset.command);
 else if(b.hasAttribute('data-food')&&battle&&!locked){foodOpen=!foodOpen;renderBattle();}
 else if(b.dataset.feed)command('food',b.dataset.feed);
 else if(b.hasAttribute('data-town')){renderTown();top();}
 else if(b.hasAttribute('data-retreat'))openModal('<h2>町へ戻りますか？</h2><p class="profile-copy">この戦いの経験値と報酬は受け取れません。使ったおやつは戻りません。</p><div class="result-buttons"><button class="secondary" data-stay>戦いを続ける</button><button class="primary" data-leave>町へ戻る</button></div>');
 else if(b.hasAttribute('data-stay'))closeModal();
 else if(b.hasAttribute('data-leave')){closeModal();save();renderTown();top();}
 else if(b.hasAttribute('data-share'))share().catch(()=>toast('画像を作れませんでした。もう一度お試しください。'));
});
// A new pentatonic festival loop, synthesized locally after an explicit sound tap.
const audio={on:false,boss:false,ctx:null,timer:null,beat:0,next:0,
 init(){if(this.ctx)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error('No Web Audio');this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=.18;this.master.connect(this.ctx.destination);},
 pluck(freq,t,duration=.22,volume=.18){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.01);},
 drum(t,heavy=false){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(heavy?100:160,t);o.frequency.exponentialRampToValueAtTime(45,t+.13);g.gain.setValueAtTime(heavy?.6:.3,t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.21);},
 schedule(){if(!this.on||document.hidden||!this.ctx)return;const c=this.ctx;if(this.next<c.currentTime)this.next=c.currentTime+.02;while(this.next<c.currentTime+.16){const b=this.beat%32,notes=[0,2,4,2,1,-1,2,0,4,3,2,-1,1,2,0,-1,0,2,3,4,2,-1,3,2,1,0,2,1,0,-1,0,-1],scale=[293.66,349.23,392,440,523.25];if(notes[b]>=0)this.pluck(scale[notes[b]]*(this.boss&&b%8===0?2:1),this.next,.2);if(b%4===0)this.drum(this.next,true);else if(b%4===2)this.drum(this.next);if(b%8===6)this.pluck(1174.66,this.next,.07,.07);this.next+=60/(this.boss?156:132)/2;this.beat++;}},
 async toggle(){try{this.init();this.on=!this.on;if(this.on){await this.ctx.resume();this.next=this.ctx.currentTime+.03;this.timer=setInterval(()=>this.schedule(),60);}else{clearInterval(this.timer);await this.ctx.suspend();}$('#sound').textContent='音 '+(this.on?'ON':'OFF');$('#sound').setAttribute('aria-label','祭りの音楽を'+(this.on?'オフ':'オン')+'にする');}catch(_){this.on=false;toast('このブラウザでは音を再生できません。');}},
 effect(kind){if(!this.on||!this.ctx||document.hidden)return;const t=this.ctx.currentTime;if(kind==='win'){[392,440,523.25,587.33].forEach((f,i)=>this.pluck(f,t+i*.09,.24,.3));}else if(kind==='skill'){this.drum(t,true);this.pluck(880,t,.3,.35);}else if(kind==='food')this.pluck(659.25,t,.3,.25);else this.drum(t);}
};
$('#sound').addEventListener('click',()=>audio.toggle());
document.addEventListener('visibilitychange',()=>{if(!audio.on||!audio.ctx)return;if(document.hidden)audio.ctx.suspend().catch(()=>{});else audio.ctx.resume().then(()=>{audio.next=audio.ctx.currentTime+.03;}).catch(()=>{});});
// The home link opens the town without abandoning an active battle accidentally.
$('.brand').addEventListener('click',e=>{e.preventDefault();if(battle&&!battle.done){toast('戦闘を終えるときは「町へ戻る」を選んでください。');return;}if(state)renderTown();else renderIntro();top();});
setInterval(()=>{if(document.hidden||locked)return;const imgs=[...document.querySelectorAll('img[data-sprite][data-pose="idle"]')];for(const img of imgs)img.src=A.url(img.dataset.sprite,'blink');setTimeout(()=>{for(const img of imgs)if(img.isConnected&&!locked)img.src=A.url(img.dataset.sprite);},130);},4200);
if(state)renderTown();else renderIntro();
})();
