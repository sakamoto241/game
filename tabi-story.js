/* Story, branching encounters and companion conversations. No network or random rewards. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./tabi-core.js'));else root.TabiStory=factory(root.Tabi);})(typeof globalThis!=='undefined'?globalThis:this,function(G){
'use strict';
const CHAPTERS=[
 {id:'chapter-0',need:0,title:'おばあちゃんの置き手紙',hero:'lili',lines:[['リリ','「直せたら、好きなところへ行きなさい」……おばあちゃんらしいなあ。'],['リリ','屋根も車輪も、ばらばら。……いま動くのは、この小さな台車だけかあ。'],['リリ','まずは雨をしのげる屋根をつけよう。朝つゆの森なら、丈夫な木が見つかるはず。'],['リリ','「帰る場所は、つくれる」……うん。この設計図、私がつづきを描くね。']]},
 {id:'chapter-1',need:3,title:'剣士が探しているもの',hero:'noa',lines:[['ノア','その設計図……この印、知ってる。昔、私の村に来た工房と同じだ。'],['リリ','おばあちゃんの工房かも！ ノアは、何を探してるの？'],['ノア','兄に借りた方位磁針。森の奥に落としてしまって。……帰るに帰れなくて。'],['リリ','じゃあ、一緒に探そう。屋根ができたら、休む場所も半分こね。'],['ノア','まだ屋根もないのに。……うん、その約束、覚えておく。']]},
 {id:'chapter-2',need:6,title:'空っぽの薬箱',hero:'mina',lines:[['ミナ','守り人が暴れてから、村へ薬を届ける道が閉じてしまったの。'],['リリ','その薬箱、もう空っぽだね。'],['ミナ','道で会う人に渡していたら。でも、待ってる人がいるから、戻りたい。'],['ノア','私たちも森の奥へ行く。三人なら、道を開けられるかもしれない。'],['ミナ','ありがとう。お礼に、おいしい薬草茶をいれるね。苦くないのも、作れるんだよ。']]},
 {id:'chapter-3',need:10,title:'設計図の裏がわ',hero:'lili',lines:[['リリ','工房を直したら、どこへ行こう。まだ、何も決めてないんだ。'],['ノア','最初から行き先がなくても、いいと思う。'],['ミナ','薬を届けに、私の村へ寄らない？ あったかいパン屋さんがあるの。'],['リリ','じゃあ、設計図の裏に書いちゃおう。「帰りに、三人でパンを買う」っと！']]},
 {id:'chapter-4',need:12,title:'守り人の足もと',hero:'noa',lines:[['ノア','あった……！ 根っこの下に、私の方位磁針。'],['ミナ','守り人、道を壊していたんじゃなくて、倒れた木から泉を守っていたんだね。'],['リリ','ごめんね。折れた木は、屋根に使わせてもらうね。ちゃんと、大事にするから。'],['ノア','見て。守り人が、帰り道をあけてくれた。……ありがとう。大事に使うよ。']]},
 {id:'chapter-5',need:12,wagon:true,title:'屋根の下の約束',hero:'mina',lines:[['リリ','できた！ 工房にはまだ遠いけど……ほら、三人で座れる屋根ができたよ！'],['ノア','ほら、約束の半分こ。……三人だから、三分の一か。'],['ミナ','お茶がはいったよ。明日は、村へ続く道を探そう。'],['リリ','うん。おばあちゃん、帰る場所って、こうやってできるんだね。']]}
];
CHAPTERS.push(
 {id:'chapter-6',need:12,town:'wheat',title:'パンの香りの帰り道',hero:'mina',lines:[['ミナ','ただいま！ みんな、帰ってきたよ。……ここが、こむぎの町。'],['リリ','パンの匂いがする！ ねえ、あそこの煙突、工房の図面に似てない？'],['薬屋のサナ','ミナ、おかえり！ 薬草茶を待っている人がいるの。届けてもらえると助かるよ。'],['ミナ','薬屋さんとパン屋さんが、手を貸してほしいって。宿屋で休んで、掲示板も見てみよう。'],['リリ','よーし。お手伝いしながら、工房のつづきを直そう！']]},
 {id:'chapter-7',need:18,town:'mill',title:'水音の止まった町',hero:'noa',lines:[['ノア','着いた。……でも、水車が回っていないね。'],['水車番のトト','留め具が割れてしまってね。木材と鉱石があれば、もう一度回せるんだが……。'],['リリ','私たちの工房を直す前に、ここの工房を直そうよ。木材と鉱石、使えるかな？'],['ノア','うん。町の人に聞いてみよう。海辺へ続く道のことも。']]},
 {id:'chapter-8',need:24,town:'port',title:'灯台から見える山',hero:'lili',lines:[['リリ','海だ！ あの灯台の向こうまで、ずっと続いてる。'],['灯台守のルカ','その設計図、知ってるぞ。動力に、星の歯車が必要だ。雪山の天文台に、残っているかもしれない。'],['ミナ','雪山の天文台に、古い歯車が残っているみたい。'],['リリ','あと少しで、工房が動くんだね。灯台のお手伝いと、山へ行く支度をしよう！']]},
 {id:'chapter-9',need:30,title:'ふくろうの預かりもの',hero:'noa',lines:[['ノア','見て。ふくろうが、歯車をくわえてきた。'],['ミナ','ずっと、天文台で守っていたんだね。'],['リリ','おばあちゃんの印だ……！ ありがとう。これで工房を動かせるよ。'],['ノア','港へ戻ろう。木材と鉱石、それから魔石も集めて、修理の仕上げだ。']]},
 {id:'chapter-10',need:30,town:'port',workshop:true,title:'動き出す、小さなおうち',hero:'lili',lines:[['リリ','煙突から、煙が出た……！ 工房、本当に動いてる！'],['ミナ','中でお茶もいれられるね。雨の日も、雪の日も。'],['ノア','次はどこへ行く？ 設計図の裏、まだ余白があるよ。'],['リリ','どこでも。三人で、帰る場所ごと旅をしよう！']]}
);
const EVENTS=[
 {id:'lost',need:1,title:'葉っぱの下の迷子',hero:'lili',text:'雨のあとの小道で、小さなスライムが震えている。進みたい道とは、反対側を気にしているみたい。',options:[{label:'一緒に、親を探す',detail:'薬草3・木の実2。後の道で小さな恩返し。',reward:{herb:3,berry:2},reply:'葉っぱのかげから、大きなスライムが顔を出した。小さな子は一度だけ振り向き、ぴょんと跳ねた。'},{label:'木陰に休める場所をつくる',detail:'木材2・薬草茶1。雨宿りの場所を残す。',reward:{wood:2,tea:1},reply:'乾いた葉を重ねると、スライムは安心したように丸くなった。「帰りにも、見に来ようね」とリリが言う。'}]},
 {id:'market',need:3,title:'旅する露店と、欠けた石',hero:'noa',text:'きのこの傘を広げた露店に、工房の炉に合いそうな鉱石が並んでいる。店主は荷ほどきに困っているようだ。',options:[{label:'45コインで鉱石を買う',detail:'コイン45 → 鉱石4。装備の材料に。',cost:{coins:45},reward:{ore:4},reply:'「良い目をしてるね」店主は石を布で包んだ。ノアは一番重い包みを、何も言わずに持ってくれた。'},{label:'荷ほどきを手伝う',detail:'木の実3・薬草2。コインは使わない。',reward:{berry:3,herb:2},reply:'荷物を片づけると、店主が食べ物を分けてくれた。「旅は、急がないほうが見つかるものもあるよ」'}]},
 {id:'bridge',need:5,title:'きしむ橋の向こう',hero:'noa',text:'小川にかかる橋が傾いている。向こう岸には、きれいな鉱石。流れのゆるい下流なら、安全に回り道もできそうだ。',options:[{label:'足場を確かめ、渡ってみる',detail:'鉱石3。生きている仲間の残りHPを20%消費。',reward:{ore:3},hurt:.2,reply:'三人は声をかけ合い、一歩ずつ橋を渡った。「次は直してからにしようね」とノア。手の中の石は、少しあたたかい。'},{label:'下流の草むらへ回り道',detail:'木の実5・薬草2。迷子を助けていると魔石1も。',reward:{berry:5,herb:2},reply:'水辺に、見覚えのある小さな影が跳ねた。遠回りの道には、甘い木の実がたくさん実っていた。'}]},
 {id:'lantern',need:8,title:'消えかけの道しるべ',hero:'mina',text:'古い道しるべの灯りが、風に消えそうになっている。ミナは「帰る人が、迷っちゃうね」と立ち止まった。',options:[{label:'木材2で風よけをつける',detail:'木材2 → 魔石2・薬草茶1。灯りを残す。',cost:{wood:2},reward:{crystals:2,tea:1},reply:'木の板で風をさえぎると、灯りが静かに戻った。「誰が直したか、知らなくてもいいの」とミナは笑う。'},{label:'地図に、安全な迂回路を描く',detail:'鉱石2・木の実パイ1。次の旅人へ地図を置く。',reward:{ore:2,pie:1},reply:'ノアが道を確かめ、リリが花の印を描いた。濡れないよう石を載せて、三人の地図を道しるべに残した。'}]},
 {id:'gate',need:11,title:'守り人に渡すもの',hero:'lili',text:'大樹の根もとに、踏まれた白い花が咲いていた。設計図の印と同じ花だ。森の主の気配が、すぐ向こうにある。',options:[{label:'薬草4で花を手当てする',detail:'薬草4 → 魔石3。パイの力が45秒間つく。',cost:{herb:4},reward:{crystals:3},food:true,reply:'花を支えると、白い花びらがふわりとひらいた。「工房も、この花も。直して、一緒に先へ行こう」'},{label:'三人でひと休みしてから進む',detail:'魔石1・薬草茶1。生きている仲間のHPを30%回復。',reward:{crystals:1,tea:1},heal:.3,reply:'三つのカップから、湯気がのぼる。「怖いね」「うん。でも、一人じゃないね」。空になったカップをしまい、三人は立ち上がった。'}]}
];
const BONDS={
 lili:{favorite:'pie',perk:'リリの魔力＋4',talks:[['こげたパイの話',[['リリ','最初に焼いたパイ、真っ黒だったんだ。おばあちゃんは「夜空みたい」って。'],['リリ','ほめられたと思ったけど、たぶん、ちょっと違ったね。……今日は、ちゃんと甘いよ！']]],['小さな字の理由',[['リリ','設計図の字が小さいのは、あとから書き足せるように、なんだって。'],['リリ','私の工房も、そうしたいな。誰かの「やりたい」が、あとから乗れるように。']]],['次のページは一緒に',[['リリ','一人で直さなきゃって、思ってた。でも、一緒に悩むほうが楽しいね。'],['リリ','ねえ、次のページにも、あなたの好きなものを書こうよ。']]]]},
 noa:{favorite:'charm',perk:'ノアの最大HP＋25',talks:[['剣士の好きな味',[['ノア','こういうスープ、兄もよく作ってた。具が大きすぎるんだけど。'],['ノア','……これは食べやすいね。もう少し、もらってもいい？']]],['方位磁針の針',[['ノア','兄の方位磁針、少しだけ針がずれてる。だから迷ったんだって、言うつもりだった。'],['ノア','でも本当は、知らない道を見てみたかった。帰ったら、そう話すよ。']]],['前を歩く理由',[['ノア','前を歩くのは、強いからじゃない。後ろの足音が聞こえると、安心するから。'],['ノア','これからも、聞かせてね。二人の足音。']]]]},
 mina:{favorite:'tea',perk:'ミナの回復力＋6',talks:[['苦くない薬草茶',[['ミナ','この葉っぱ、長く煮ると苦くなるの。少し待って、火を止めるのがこつ。'],['ミナ','休むのも同じ。がんばりすぎる前に、ひと息つこうね。']]],['空っぽでも持っていく',[['ミナ','薬箱が空っぽでも、持っていくんだ。いつか、また満たせるように。'],['ミナ','リリの台車も、きっとそうだね。空いているところは、これからの楽しみ。']]],['帰り道のお茶',[['ミナ','村に着いたら、二人を家に呼んでもいい？ いつものお茶をいれたいな。'],['ミナ','特別なことがなくても、一緒に座れる人が増えた。私、それがうれしい。']]]]}
};
CHAPTERS.push({id:'chapter-11',need:12,koharu:true,title:'小さな弓と、旅の仲間',hero:'koharu',lines:[['コハル','その馬車、みんなで直したの？ 私も、木の道具を直すのが好きなんだ。'],['リリ','じゃあ、工房を動かす旅に来ない？ まだ、わからないことだらけだけど。'],['コハル','行きたい！ この弓で、みんなの背中を守るよ。'],['ノア','助かる。まずは、この町のおいしいパンを買っていこう。'],['コハル','賛成！ 私、焼きたてのパイも大好きなんだ。']]});
BONDS.koharu={favorite:'pie',perk:'コハルの攻撃＋4',talks:[['木の鳥の贈り物',[['コハル','この鳥、木の端切れから作ったんだ。手のひらに乗せると、ちょっとかわいいでしょう？'],['リリ','工房の窓辺に、飾ってもいい？'],['コハル','もちろん！ 帰ってきたとき、みんなを迎えてくれるね。']]],['弓を作る理由',[['コハル','遠くへ飛ばすだけなら、大きな弓がいい。でも私は、手になじむ小さな弓が好き。'],['ノア','使う人のことを考えて作るんだね。'],['コハル','うん。その人が、安心して旅をできるように。']]],['次の町で売るもの',[['コハル','工房が動いたら、小さな木の道具を並べたいな。'],['ミナ','私は、お茶をいれるね。'],['リリ','じゃあ私は、看板を描く！'],['コハル','ふふ。お店の支度だけで、もう楽しいね。']]]]};
function joined(s,id){return id==='lili'||s.unlocked[id];}
function available(s){return EVENTS.filter(e=>s.highest>=e.need&&!Object.hasOwn(s.story.choices,e.id));}
function unlockedChapters(s){return CHAPTERS.filter(c=>s.highest>=c.need&&(!c.koharu||s.unlocked.koharu)&&(!c.wagon||s.wagon)&&(!c.town||s.town.visited.includes(c.town))&&(!c.workshop||s.town.workshop));}
function conversations(s,id){return BONDS[id].talks.map(([title,lines],i)=>({id:`bond-${id}-${i+1}`,title,lines,hero:id,need:(i+1)*2})).filter(c=>joined(s,id)&&s.story.bond[id]>=c.need);}
function findScene(s,id){return [...unlockedChapters(s),...Object.keys(BONDS).flatMap(k=>conversations(s,k))].find(c=>c.id===id);}
function unread(s){return unlockedChapters(s).filter(c=>!s.story.read.includes(c.id)).length+Object.keys(BONDS).flatMap(k=>conversations(s,k)).filter(c=>!s.story.read.includes(c.id)).length;}
function markRead(s,id){if(!findScene(s,id))return false;if(!s.story.read.includes(id))s.story.read.push(id);return true;}
function reward(s,items){for(const[k,n]of Object.entries(items||{})){if(Object.hasOwn(s.bag,k))s.bag[k]+=n;else s[k]+=n;}}
function choose(s,r,id,index){const e=available(s).find(e=>e.id===id);if(!e||![0,1].includes(index))return{ok:false,error:'この寄り道は、まだ選べないか、すでに旅の記録に残っています。'};const d=e.options[index];if(d.cost&&!G.canPay(s,d.cost))return{ok:false,error:'必要な素材かコインが足りません。もう一つの選択肢も選べます。'};
 for(const[k,n]of Object.entries(d.cost||{})){if(Object.hasOwn(s.bag,k))s.bag[k]-=n;else s[k]-=n;}
 s.story.choices[id]=index;reward(s,d.reward);let reply=d.reply;if(id==='bridge'&&index===1&&s.story.choices.lost===0){s.crystals++;reply+=' 小さなスライムが魔石をひとつ、足もとへ置いていった。';}
 if(d.hurt)for(const h of r.heroes)if(h.hp>0)h.hp=Math.max(1,h.hp*(1-d.hurt));if(d.heal)for(const h of r.heroes)if(h.hp>0)h.hp=Math.min(h.maxHp,h.hp+h.maxHp*d.heal);if(d.food)s.foodTime=Math.max(s.foodTime,45);
 return{ok:true,reply};
}
function gift(s,r,id){if(!Object.hasOwn(BONDS,id)||!joined(s,id))return{ok:false,error:'まずは仲間と出会おう。'};if(s.story.bond[id]>=6)return{ok:false,error:'絆の会話はすべて開きました。'};const item=BONDS[id].favorite;if(s.bag[item]<1)return{ok:false,error:G.ITEMS[item]+'を工房で作ろう。'};s.bag[item]--;s.story.bond[id]=Math.min(6,s.story.bond[id]+2);G.sync(s,r);return{ok:true,reply:G.HEROES[id].name+'との絆が深まりました。新しい会話が読めます。'};}
const EVENT_TALKS={
 lost:[['リリ','あれ？ 葉っぱの下で、スライムが震えてる。'],['リリ','あっちを気にしてる……お母さんとはぐれちゃったのかな。'],['リリ','少し、寄り道してもいい？']],
 market:[['ノア','リリ、あの露店に、工房の炉に合いそうな鉱石がある。'],['リリ','ほんとだ！ でも店主さん、荷ほどきで大変そうだね。'],['ノア','買ってもいいし、手を貸してもいい。どうしようか。']],
 bridge:[['リリ','向こう岸、きれいな石がいっぱい！ ……この橋、渡れるかな。'],['ノア','慎重に渡れば。でも、少しけがをするかもしれない。'],['リリ','下流の草むらなら回れそう。どっちにしよう？']],
 lantern:[['ミナ','待って。道しるべの灯りが、消えちゃいそう。'],['ノア','風よけをつける？ 木材があれば直せそうだ。'],['リリ','それか、安全な道の地図を残そうか。次に来る人のために。']],
 gate:[['リリ','この白い花……おばあちゃんの設計図と同じ印だ。'],['ミナ','踏まれてしまったんだね。薬草があれば、手当てできるよ。'],['ノア','守り人はすぐそこ。少し休んでから進んでもいい。どうする？']]
};
const EVENT_RESULTS={
 lost:[[['リリ','あっ、お母さん！ この子、ずっと待ってたんだね。'],['リリ','ふふ。見送りはいいよ。また、森で会おうね。']],[['リリ','乾いた葉っぱを重ねて……ここなら、もう濡れないよ。'],['リリ','帰りにも見に来るからね。ゆっくりおやすみ。']]],
 market:[[['ノア','一番重い包みは、私が持つよ。'],['リリ','ありがとう！ この石で、いい装備を作ろうね。']],[['リリ','片づいた！ あれ、こんなに食べ物をもらっていいの？'],['ノア','急がない旅も、悪くないね。']]],
 bridge:[[['ノア','大丈夫？ 手を離さないで。あと、一歩。'],['リリ','着いた……！ 次は、橋を直してから渡ろうね。']],[['リリ','遠回りの道、木の実がいっぱい！ あの小さな影は……。'],['ノア','急がなくてよかったね。ほら、かごを貸して。']]],
 lantern:[[['ミナ','灯り、戻ったね。帰る人が迷わなくて済む。'],['リリ','誰が直したか、わかるかな？'],['ミナ','知らなくてもいいの。灯りがあれば、それで。']],[['ノア','ここを回れば、安全に抜けられる。'],['リリ','じゃあ花の印をつけよう。地図、濡れないように石も載せておくね。']]],
 gate:[[['ミナ','ほら、花びらがひらいた。きっと、もう大丈夫。'],['リリ','工房も、この花も。直して、一緒に先へ行こう。']],[['リリ','……ちょっと、怖いね。'],['ノア','うん。でも、一人じゃない。'],['ミナ','お茶を飲み終わったら、三人で行こうね。']]]
};
function script(s,session){
 if(session.kind==='scene')return findScene(s,session.id)?.lines||[];
 const e=EVENTS.find(e=>e.id===session.id);if(!e)return[];
 if(session.kind==='event')return available(s).some(d=>d.id===e.id)?EVENT_TALKS[e.id]:[];
 const choice=s.story.choices[e.id];if(choice!==0&&choice!==1)return[];
 return EVENT_RESULTS[e.id][choice];
}
function milestones(s,from){return [...unlockedChapters(s).filter(c=>c.need>from&&!s.story.read.includes(c.id)).map(c=>({kind:'scene',id:c.id,index:0})),...available(s).filter(e=>e.need>from).map(e=>({kind:'event',id:e.id,index:0}))];}
const NPCS={'薬屋のサナ':{art:'mole'},'水車番のトト':{art:'straw'},'灯台守のルカ':{art:'crab'}};
return{NPCS,script,milestones,CHAPTERS,EVENTS,BONDS,joined,available,unlockedChapters,conversations,findScene,unread,markRead,choose,gift};
});
