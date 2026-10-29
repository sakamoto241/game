(async function(){
'use strict';
const G=window.Tabi,A=window.TabiArt,$=s=>document.querySelector(s),KEY='lili-tabijitaku-v1',canvas=$('#world'),modal=$('#modal');
let s=null;try{s=G.load(JSON.parse(localStorage.getItem(KEY)));}catch(_){}
let running=!!s,tab='magic',toastTimer,lastFrame=performance.now(),acc=0,saveClock=0,uiClock=0,lastProgress='',failedSave=false;
if(!s)s=G.newGame();const away=running?G.offline(s):{coins:0},r=G.createRun(s);
const coin=n=>Number.isFinite(n)?Math.floor(n).toLocaleString('ja-JP'):'MAX';
const art=(id,cls='')=>`<img src="${A.url(id)}" alt="${id==='cart'?'手押し車':id==='wagon'?'屋根付き馬車':G.HEROES[id]?.name||id}" class="${cls}" draggable="false">`;
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600);}
function save(){if(!running)return;try{s.savedAt=Date.now();const snapshot={...s};if(r.mode==='travel'||r.mode==='rest'){snapshot.stage=r.nextStage;snapshot.encounter=r.nextEncounter;}localStorage.setItem(KEY,JSON.stringify(snapshot));}catch(_){if(!failedSave){failedSave=true;$('#save-status').textContent='このブラウザでは保存できません';toast('保存できません。ブラウザのストレージ設定を確認してください。');}}}
function open(html){$('#close').hidden=!running;$('#modal-content').innerHTML=html;if(!modal.open)modal.showModal();}
function close(){modal.close();}
$('#close').onclick=close;modal.addEventListener('cancel',e=>{if(!running)e.preventDefault();});
function welcome(){open(`<span class="eyebrow">はじめての旅</span>${art('lili','intro-portrait')}<h2>小さな魔女と、<br>旅の支度を。</h2><p>上では、仲間が戦います。<br>下では、あなたが魔法と一行を育てます。<br>森の主を越えて、初めての「帰る場所」をつくろう。</p><div class="actions"><button class="primary" data-start>リリと旅に出る →</button></div><p style="font-size:10px;margin-bottom:0">無料・登録不要。仲間と旅の記録は自動保存。</p>`);}
function row({icon,title,level,text,fine='',key,skill=false,color='',disabled=false,learned=false}){
 const d=skill?G.SKILLS[key]:G.UPGRADES[key],price=skill?d.cost:G.cost(s,key);
 return `<article class="upgrade-row"><div class="upgrade-icon ${color} ${key==='noa'||key==='mina'?'hero-icon':''}">${icon}</div><div class="upgrade-info"><h2>${title}${level?`<small>Lv.${level}</small>`:''}</h2><p>${text}</p>${fine?`<div class="fine">${fine}</div>`:''}</div><button class="buy ${skill?'skill':''} ${learned?'learned':''}" ${skill?'data-learn':'data-upgrade'}="${key}" ${disabled||learned?'disabled':''} aria-label="${title}を${skill?'覚える':'強化する'}">${learned?'習得済み':`${skill?'◆':'●'} ${coin(price)}<small>${skill?'覚える':'強化する'}</small>`}</button></article>`;
}
function renderPanel(){
 for(const b of document.querySelectorAll('[data-tab]')){b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab));}
 const st=G.stats(s,'lili');
 if(tab==='magic')$('#panel').innerHTML=row({icon:'✹',title:'火の玉',level:s.upgrades.fire,text:`威力 ${st.atk} → ${st.atk+4}`,fine:'魔法が強くなると、敵を早く倒せる。',key:'fire'})+row({icon:'⚚',title:'木の杖',level:s.upgrades.staff,text:`魔力 ＋2 ・ HP ＋13`,fine:`リリのHP ${st.maxHp} → ${st.maxHp+13}`,key:'staff'})+row({icon:'✦',title:'ふたつの火',text:'火の玉が2つになる',fine:'合計威力が50%アップ。',key:'double',skill:true,learned:s.skills.double})+speech();
 else if(tab==='friends'){
  let html=`<article class="upgrade-row companion"><div class="upgrade-icon">${art('lili')}</div><div class="upgrade-info"><h2>リリ<small>魔法・後衛</small></h2><p>一行の、小さな魔法使い。</p><div class="hero-stat">HP ${st.maxHp}　魔力 ${st.atk}</div></div><button class="buy learned" data-tab="magic">魔法へ</button></article>`;
  for(const id of ['noa','mina']){const d=G.HEROES[id],yes=s.unlocked[id],h=G.stats(s,id);html+=yes?row({icon:art(id),title:d.name,level:s.upgrades[id],text:d.role,fine:`HP ${h.maxHp} ・ ${id==='noa'?'攻撃 '+h.atk:'回復 '+h.heal}`,key:id,color:id==='noa'?'blue':'green'}):`<article class="upgrade-row companion locked"><div class="upgrade-icon">？</div><div class="upgrade-info"><h2>${id==='noa'?'青いマントの剣士':'花の祈りの癒やし手'}</h2><p>森の道を${id==='noa'?'3':'6'}つ進むと、出会えます。</p></div></article>`;}
  if(s.unlocked.noa)html+=row({icon:'♧',title:'まもりの盾',text:'ノアが全員にバリア',fine:'3回攻撃するたびに発動。',key:'ward',skill:true,learned:s.skills.ward,color:'blue'});
  if(s.unlocked.mina)html+=row({icon:'❀',title:'花の祈り',text:'ミナが仲間全員を回復',fine:'3回目の回復が、全員に届く。',key:'bloom',skill:true,learned:s.skills.bloom,color:'green'});
  html+='<div class="cooperation"><b>連携技「木漏れ日の約束」</b>星がたまったら「おねがい！」。7秒間の攻撃アップ・バリア・回復。</div>';$('#panel').innerHTML=html+speech();
 }else{
  $('#panel').innerHTML=`<article class="wagon-panel"><span class="eyebrow">旅する、小さなおうち</span><h2>${s.wagon?'屋根付き馬車':'手押し車'} <small>Lv.${s.wagon+1}</small></h2><p>${s.wagon?'雨の日にも、帰る場所ができました。':'次の改築：屋根付き馬車'}</p><div class="wagon-view">${!s.wagon?art('cart')+'<span class="arrow">→</span>':''}${art('wagon',!s.wagon?'future':'')}</div><div class="benefits"><span>❀ 道中の回復量アップ</span><span>⚒ 杖の仕立て直し</span></div>${s.wagon?'<button class="buy" data-replay>森の探索を続ける →</button><div class="requirement">仲間と強化を引き継いで、少し手ごわい森へ。</div>':`<button class="buy" data-renovate ${s.highest<12||s.wood<30?'disabled':''}>改築する　▰ 30</button><div class="requirement">${s.highest<12?'森の主を倒すと、改築できます。':s.wood<30?'木材があと'+(30-s.wood)+'必要です。':'準備ができました。はじめての、おうちへ。'}</div>`}${s.wagon?`<div class="craft-card"><b>装備づくり：花飾りの杖</b><small>リリの魔力＋6・HP＋20</small><button class="secondary" data-craft ${s.crafted||s.wood<6||s.crystals<1?'disabled':''}>${s.crafted?'仕立て直し済み':'仕立て直す　▰6 ◆1'}</button></div><div class="actions"><button class="secondary" data-ending>旅の思い出</button><button class="secondary" data-share>一行をシェア</button></div>`:''}<div class="requirement" style="margin-top:16px">移動工房は、次の旅のお楽しみ。<br>この初版は、屋根付き馬車への改築まで遊べます。</div></article>${speech()}`;
 }updateUI();
}
function speech(){const line=s.wagon?'「ただいま」って言える場所が、できたね。':s.highest>=12?'木材をしまって、屋根をつけよう！':s.unlocked.mina?'三人なら、もっと遠くまで行けそう！':s.unlocked.noa?'ノアがいると、ちょっと心強いね。':'おやつは持った。勇気も、すこし。';return `<div class="speech">${art('lili')}<p>${line}</p></div>`;}
function objective(){if(s.wagon)return'今日の旅は、大成功。仲間と森をもう一度歩けます。';if(s.highest>=12)return'森の主を倒しました！ 「荷馬車」で屋根付き馬車に改築しよう。';if(!s.unlocked.noa)return'まずは魔法を強化。森の道を3つ進むと、剣士ノアと出会えます。';if(!s.unlocked.mina)return'仲間の強化も忘れずに。6つ目の道で、癒やし手ミナが待っています。';return'森の主まで、あと'+(12-s.highest)+'つの道。魔法と守りを、バランスよく。';}
function updateUI(){
 $('#coins').textContent=coin(s.coins);$('#wood').textContent=coin(s.wood);$('#crystals').textContent=coin(s.crystals);$('#place').textContent=G.PLACES[s.stage-1];$('#objective').textContent=objective();
 $('#journey-label').textContent=['camp','complete'].includes(r.mode)?s.wagon?'はじめての旅、達成。':'森の主を越えました。':`道 ${s.stage} / 12　出会い ${s.encounter+1} / ${G.ENCOUNTERS}`;
 const progress=s.stage+':'+s.encounter+':'+r.mode;if(progress!==lastProgress){lastProgress=progress;$('#progress').innerHTML=Array.from({length:G.ENCOUNTERS},(_,i)=>`<i class="${i<s.encounter?'past':i===s.encounter?'now':''}"></i>`).join('');}
 const ready=s.rally>=100&&r.mode==='fight'&&running;$('#rally').disabled=!ready;$('#rally-charge').textContent=r.heroBuff>0?'みんなの力が、ひとつに。':ready?'連携技を発動':`星の力 ${Math.floor(s.rally)} / 100`;$('#rally-meter').style.width=s.rally+'%';
 const big=r.enemies.some(e=>e.hp>0&&e.boss&&e.actions%3===2&&e.cooldown<1.1)&&r.mode==='fight';const banner=$('#world-banner');banner.className='world-banner'+(big?' danger':r.heroBuff>0?' success':'');banner.textContent=big?'大技がくる！「おねがい！」でバリアを張ろう':r.heroBuff>0?'連携中 ✧ 攻撃1.6倍・バリアで守る':r.mode!=='fight'?r.label:'';
 $('#wagon-dot').hidden=s.wagon||s.highest<12;
 for(const b of document.querySelectorAll('[data-upgrade]')){const key=b.dataset.upgrade;b.disabled=s.coins<G.cost(s,key);}
 for(const b of document.querySelectorAll('[data-learn]')){const key=b.dataset.learn;b.disabled=s.skills[key]||s.crystals<G.SKILLS[key].cost;}
 for(const b of document.querySelectorAll('[data-renovate]'))b.disabled=s.wagon||s.highest<12||s.wood<30;
}
function consume(events){A.add(events,r);let refresh=false;for(const e of events){if(e.type==='join'){toast(e.text);refresh=true;save();sound.note(523.25,.5);}else if(e.type==='material'){save();}else if(e.type==='bossclear'){toast('森の主を撃破！ 荷馬車タブで改築しよう。');tab='wagon';refresh=true;save();}else if(e.type==='defeat')toast('荷馬車で立て直します。素材と強化は残ります。');else if(e.type==='upgrade'){refresh=true;sound.note(659.25,.25);}else if(e.type==='rally')sound.chime();}if(refresh)renderPanel();}
function ending(){open(`<span class="eyebrow">旅のひと区切り</span><h2>屋根の下に、ただいま。</h2><img class="ending-art" src="tabi-simple-ending.png" alt="屋根付き馬車のそばで、リリ・ノア・ミナが初めてのお茶を楽しむ"><p>森を抜けた三人に、小さな帰る場所ができました。<br>夜露をしのいで、お茶をいれて。<br>明日は、どこへ行こう。</p><p style="font-size:11px">${s.wins}戦の思い出 ・ 仲間3人 ・ 屋根付き馬車<br>移動工房へ続く物語は、この先のお楽しみ。</p><div class="actions"><button class="primary" data-share>一行をシェア</button><button class="secondary" data-close>馬車を眺める</button></div>`);}
function help(){open(`<span class="eyebrow">リリの旅じたく帳</span><h2>旅のしおり</h2><div class="help-grid"><article><h3>上で戦って、下で育てる</h3>通常攻撃と回復は自動。コインで魔法と仲間を強化できます。強化は戦闘の途中でも、すぐ反映されます。</article><article><h3>三人で、ひとつの作戦</h3>リリは魔法。ノアは前に立って守り、ミナは傷ついた仲間を回復。仲間は3つ目・6つ目の道で必ず加入します。</article><article><h3>新しい魔法と連携</h3>新しい道を踏破すると魔石を入手。「ふたつの火」は攻撃、「まもりの盾」は防御、「花の祈り」は回復。星100で「おねがい！」が使えます。敵の大技の予告に合わせるのもおすすめ。</article><article><h3>負けても、旅はつづく</h3>全員が倒れると荷馬車で休み、3つの道ごとの区切りから自動で再挑戦。コイン・素材・強化は残ります。</article><article><h3>初版のゴール</h3>森の12の道を進み、森の主を倒して屋根付き馬車へ改築。改築後は道中の回復が増え、強化を引き継いだ再探索ができます。移動工房と次の地域は今後の内容です。</article><article><h3>羽根のしおり</h3>このブラウザに自動保存。閉じている間は最大4時間、踏破した道に応じてコインを集めます。素材と道の進行は、画面を開いている間に増えます。</article></div><h3 style="font-family:var(--serif)">一行の記録</h3><ul class="story-list"><li>踏破した道 ${s.highest}/12</li><li>ノア ${s.unlocked.noa?'一緒に旅しています':'3つ目の道で出会う'}</li><li>ミナ ${s.unlocked.mina?'一緒に旅しています':'6つ目の道で出会う'}</li><li>荷馬車 ${s.wagon?'屋根付き馬車':'手押し車'}</li><li>勝利 ${s.wins}回 ・ 立て直し ${s.defeats}回</li></ul>`);}
async function share(){
 const c=document.createElement('canvas');c.width=1200;c.height=630;const x=c.getContext('2d'),bg=new Image();bg.src='tabi-simple-forest.png';await bg.decode();x.drawImage(bg,0,-80,1200,800);x.fillStyle='#fff8e9ed';x.fillRect(28,25,1144,190);x.strokeStyle='#b79b69';x.strokeRect(34,31,1132,178);x.fillStyle='#a9644d';x.font='bold 51px serif';x.fillText('ちいさな魔女の旅じたく',60,109);x.fillStyle='#8f795a';x.font='25px serif';x.fillText(s.wagon?'小さな旅が、帰る場所になった。':`リリたちと、森の道を ${s.highest} / 12 踏破。`,65,163);A.paint(x,s.wagon?'wagon':'cart',190,549,s.wagon?240:170);A.paint(x,'lili',455,550,260);if(s.unlocked.noa)A.paint(x,'noa',715,550,260);if(s.unlocked.mina)A.paint(x,'mina',955,550,250);x.fillStyle='#fff7e5ee';x.fillRect(28,574,1144,37);x.fillStyle='#8b7152';x.font='16px sans-serif';x.fillText('戦う仲間と、育つおうち。無料・登録不要。',48,599);x.textAlign='right';x.fillText('sakamoto241.github.io/game/tabi.html',1152,599);const url=c.toDataURL('image/png');const text=`上では仲間が戦って、下ではあなたが育てる。\n\n${s.wagon?'リリたちと森の主を倒して、手押し車が屋根付き馬車になりました。':`朝つゆの森を${s.highest}/12踏破！`}\n#ちいさな魔女の旅じたく #ブラウザゲーム`;
 open(`<span class="eyebrow">一行の、旅の記録</span><h2>この一行で、旅をした。</h2><img class="share-card" src="${url}" alt="リリたちの旅の記録"><div class="actions"><a class="primary" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://sakamoto241.github.io/game/tabi.html')}" target="_blank" rel="noopener noreferrer">Xに投稿する ↗</a><a class="secondary" href="${url}" download="ちいさな魔女の旅じたく.png">画像を保存</a></div><p style="font-size:10px">画像も載せるときは、保存した画像を投稿に添えてください。</p>`);
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-start')){running=true;$('#close').hidden=false;close();save();updateUI();toast('まずは「火の玉」を強化してみよう。');}
 else if(b.dataset.tab){tab=b.dataset.tab;renderPanel();}
 else if(b.dataset.upgrade||b.dataset.learn){const result=b.dataset.upgrade?G.upgrade(s,r,b.dataset.upgrade):G.learn(s,r,b.dataset.learn);if(result.ok){consume(r.events.filter(e=>e.type==='upgrade'));renderPanel();save();}else toast(result.error);}
 else if(b.hasAttribute('data-renovate')){const result=G.renovate(s,r);if(result.ok){renderPanel();save();sound.chime();ending();}else toast(result.error);}
 else if(b.hasAttribute('data-replay')){if(G.replay(s,r)){close();save();renderPanel();toast('強化を引き継いで、もう一度森へ。');}}
 else if(b.hasAttribute('data-craft')){const result=G.craft(s,r);if(result.ok){consume(r.events.filter(e=>e.type==='upgrade'));save();renderPanel();toast('花飾りの杖ができました。');}else toast(result.error);}
 else if(b.hasAttribute('data-ending'))ending();else if(b.hasAttribute('data-close'))close();else if(b.hasAttribute('data-share'))share().catch(()=>toast('画像を作れませんでした。もう一度お試しください。'));
});
$('#rally').onclick=()=>{const result=G.rally(s,r);if(result.ok){consume(r.events.filter(e=>e.type==='rally'||e.type==='heal'));save();updateUI();}else toast(result.error);};$('#help').onclick=help;
const sound=new window.TabiMusic.Player({volume:.7});
async function toggleMusic(){
 const button=$('#sound');if(sound.busy)return;sound.busy=true;button.disabled=true;
 try{if(sound.on)await sound.disable();else await sound.enable();}
 catch(_){await sound.disable().catch(()=>{});toast('このブラウザでは音楽を再生できません。');}
 finally{sound.busy=false;button.disabled=false;button.textContent='BGM '+(sound.on?'ON':'OFF');button.setAttribute('aria-pressed',String(sound.on));button.setAttribute('aria-label','ほのぼのBGMを'+(sound.on?'止める':'再生する'));}
}
$('#sound').onclick=toggleMusic;
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
