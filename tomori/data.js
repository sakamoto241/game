(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;else root.TomoriData=data;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const HEROES={
 rine:{id:'rine',name:'リネ',role:'古道具屋',color:'#8aa881',hp:100,atk:17,def:4,weapon:'鑑定用の羽根ペン',bio:'値切り交渉には強い古道具屋。聖剣を300Gで売った。自分の目利きが外れたことは、まだ認めたくない。',skills:[{id:'flash',name:'閃光瓶',cost:2,kind:'hit',power:.9,break:2,style:'light',text:'盾を2削る。崩すと敵の行動を止める。'},{id:'heal',name:'応急手当',cost:2,kind:'heal',power:39,style:'heal',text:'味方1人のHPを大きく回復。'}]},
 ash:{id:'ash',name:'アッシュ',role:'剣士',color:'#ba8b78',hp:116,atk:20,def:6,weapon:'旅鉄の剣',bio:'剣に詳しいと言いながら、聖剣を買い手の荷台に積んだ剣士。夕食を注文した責任も感じている。',skills:[{id:'lunge',name:'踏み込み',cost:2,kind:'hit',power:.95,break:2,style:'slash',text:'盾を2削る。連携の起点に。'},{id:'cleave',name:'一閃',cost:3,kind:'hit',power:2.05,break:1,style:'slash',text:'強い一撃。崩れた敵に当てたい。'}]},
 noa:{id:'noa',name:'ノア',role:'案内屋',color:'#7e9e9a',hp:92,atk:19,def:3,weapon:'木葉の弓',bio:'裏道と相場に詳しい弓使い。仲間にも情報料を請求するが、全員のお弁当は黙って用意している。',skills:[{id:'mark',name:'狙いの印',cost:1,kind:'hit',power:.5,break:1,style:'arrow',mark:true,text:'次に受ける攻撃を1.5倍にする。'},{id:'pierce',name:'貫通矢',cost:3,kind:'hit',power:1.9,break:1,style:'arrow',pierce:true,text:'盾の軽減を無視する強い矢。'}]},
 finn:{id:'finn',name:'フィン',role:'鑑定学者',color:'#a19ec2',hp:94,atk:20,def:3,weapon:'星読みの杖',bio:'聖剣だと見抜いていた学者。説明が長すぎて誰にも最後まで聞いてもらえなかった。魔法は手短で強力。',skills:[{id:'sparks',name:'火花の連弾',cost:2,kind:'hit',power:.85,break:1,hits:2,style:'fire',text:'2回攻撃。途中で盾を崩すことも。'},{id:'star',name:'落星',cost:3,kind:'hit',power:2.15,break:1,style:'star',text:'崩しと印を合わせると大ダメージ。'}]}
};
const MONSTERS={gel:{name:'荷あさりスライム',asset:'gel',hp:53,atk:13,shield:2,color:'#9eb96f'},imp:{name:'いたずら木人',asset:'imp',hp:62,atk:14,shield:2,color:'#c7a569'},wolf:{name:'荷荒らしの牙狼',asset:'wolf',hp:101,atk:20,shield:3,color:'#9a9aad'},golem:{name:'暴走した荷役ゴーレム',asset:'golem',hp:355,atk:29,shield:4,color:'#bd9163',boss:true}};
const NPCS={hugo:{id:'hugo',name:'ヒューゴ',role:'材木商'}};
const NODES=[{id:0,name:'リネの古道具屋',type:'camp',scene:'shop'},
{id:1,name:'荷車のわだち',type:'battle',scene:'forest',enemies:['gel','imp'],gold:55,ore:2,xp:26,description:'東へ向かった荷車の跡を追う。落とし物に魔物が集まっている。'},
{id:2,name:'材木市の休憩所',type:'event',scene:'yard',description:'買い手の住所が分かった。お弁当を食べるか、役立つ情報を買ってから向かおう。'},
{id:3,name:'市のはずれの小道',type:'battle',scene:'forest',enemies:['wolf','gel'],gold:65,ore:3,xp:35,description:'薪小屋はこの先。荷を荒らす牙狼は、強く噛みつく前に崩したい。'},
{id:4,name:'ヒューゴの荷置き場',type:'battle',scene:'yard',enemies:['imp','wolf','gel'],gold:80,ore:3,xp:44,description:'剣の交渉を始める条件は、荷物を魔物から守ること。手分けして片付けよう。'},
{id:5,name:'暴走！荷役ゴーレム',type:'battle',scene:'yard',enemies:['golem'],gold:120,ore:5,xp:65,description:'荷を盾にして、留め具を何度も締め直す。崩しと大技で制御石を止めよう。'}];
const STORIES={
intro:[
 {who:'rine',scene:'shop',place:'リネの古道具屋 · 昨日の夕方',prop:'sword',text:'錆びた剣一本、300G。刃こぼれ込みで、この値段よ。'},
 {who:'hugo',scene:'shop',place:'リネの古道具屋 · 売買成立',prop:'sold',text:'薪が割れりゃ十分だ。東の材木市へ行くついでに、いい買い物ができた。'},
 {who:'ash',scene:'tavern',place:'その夜 · 四人の夕食',prop:'dinner',text:'売れた記念に肉だ！ 四人分、260G！ 剣は俺が荷台まで運んだから、遠慮なく食うぞ。'},
 {who:'noa',scene:'tavern',place:'食堂 · お会計',prop:'dinner',text:'残り40Gね。私の情報料にも足りないけど……ごちそうさま。'},
 {who:'finn',scene:'tavern',place:'食堂 · 話の途中',text:'ところで、あの剣の柄にあった王家の紋章について、少し説明を——'},
 {who:'rine',scene:'tavern',place:'食堂 · 食事優先',text:'鑑定の話は明日。今は食べる。冷めちゃうでしょ。'},
 {who:'finn',scene:'shop',place:'翌朝 · 届いた新聞',prop:'news',text:'おはよう。昨日の話の続きを、新聞の見出しが代わりに説明してくれたよ。'},
 {who:'rine',scene:'shop',place:'新聞の一面',prop:'news',text:'《王家の聖剣を探しています。発見者に1億G》……この剣、見覚えがありすぎる。'},
 {who:'ash',scene:'shop',place:'昨日の記憶',text:'……俺が荷台に積んだやつだ。昨日の夕飯、全部あれの代金だ。'},
 {who:'finn',scene:'shop',place:'最後まで聞いてほしかった',text:'聖剣だ、と最後まで言いたかったんだけど。'},
 {who:'noa',scene:'shop',place:'買い手の行き先',text:'買ったおじさんは東の材木市へ。三日後の競売に間に合わせるって。出品される前に追いつこう。'},
 {who:'rine',scene:'shop',place:'第一章 · 食べた300G',text:'買い戻す。昨日の300Gは、四人で食べたんだからね。全員、支度して。'}],
trail:[
 {who:'noa',scene:'forest',place:'東の道 · 荷車を追って',text:'このわだち、まだ新しい。おじさんは荷物を落としてる。追跡しやすくて助かるね。'},
 {who:'rine',scene:'forest',place:'道に落ちた荷物',text:'あれ、300Gの伝票。私の字だ……。荷札も一緒に拾えば、届け先が分かる。'},
 {who:'ash',scene:'forest',place:'落とし物に集まる魔物',text:'先にこいつらを散らそう。リネ、剣以外まで安売りするなよ！'}],
receipt:[
 {who:'rine',scene:'forest',place:'回収した荷札',prop:'receipt',text:'《ヒューゴ・東の薪小屋》。名前も住所も書いてある。やっと買い手が分かった。'},
 {who:'finn',scene:'forest',place:'伝票は大事',text:'控えを残しておいた昨日の君には、感謝していいと思う。'},
 {who:'rine',scene:'forest',place:'買い戻し作戦',text:'昨日の私には、ほかに言いたいことが山ほどあるわ。'}],
fork:[
 {who:'noa',scene:'yard',place:'材木市 · 出発前の準備',text:'薪小屋へ行く前に準備しよう。持ってきた薬草弁当もあるし、荷役機械の整備図を売ってる人もいる。'},
 {who:'finn',scene:'yard',place:'二つの作戦',text:'弁当は体力づくりに。整備図は、ヒューゴさんが使うゴーレムの留め具を調べるのに役立つね。'},
 {who:'rine',scene:'yard',place:'使い道を決めよう',text:'お金の使い道、今度こそ考えて決めましょう。'}],
help:[
 {who:'noa',scene:'yard',place:'薬草弁当で作戦会議',text:'昨日の残り物を、四人分包んでおいた。薬草も入れたから、この先は少し無理がきくよ。'},
 {who:'ash',scene:'yard',place:'全員の最大HP +6',text:'助かる！ 明日の俺も頼む！'},
 {who:'noa',scene:'yard',place:'仲間割引は本日限り',text:'明日は有料。昨日みたいな夕飯を食べたいなら、先に剣を取り戻してね。'}],
trace:[
 {who:'noa',scene:'yard',place:'整備図と予備の金具 · 30G',text:'整備図と金具を三つ。まとめて30Gにしてもらった。情報料を取る側も、仕入れは必要なの。'},
 {who:'finn',scene:'yard',place:'留め具の弱点を把握',text:'胸の制御石は、左の留め具が弱い。この機械と戦うことになっても、守りを一枚崩しやすくなる。'}],
market:[
 {who:'noa',scene:'forest',place:'市の外れ · 薪小屋はすぐそこ',text:'この小道を抜ければ、荷札の住所。買い戻しの言い訳は考えた？'},
 {who:'rine',scene:'forest',place:'言い訳より先に魔物',text:'「返品期間内です」……は、売った側が言うことじゃないわね。先に道を片付けましょう。'}],
buyer:[
 {who:'hugo',scene:'yard',place:'ヒューゴの薪小屋',prop:'sword',text:'おっ、昨日の店主！ この剣、刃こぼれしなくて助かるぜ。'},
 {who:'ash',scene:'yard',place:'聖剣の使い道',text:'なんで聖剣で薪を割ってるんだよ！？'},
 {who:'rine',scene:'yard',place:'300Gの買い物',text:'無事でよかった。剣も。……実は、その剣を買い戻したくて。'},
 {who:'hugo',scene:'yard',place:'交渉は後回し',text:'悪い、話はあとだ。裏の荷物に魔物が集まってる。荷役ゴーレムまで、さっきから妙な動きでな。'}],
deal:[
 {who:'hugo',scene:'yard',place:'商談を始めるための仕事',text:'荷物を守ってくれたら報酬を出す。剣の話も、落ち着いて聞ける。どうだ？'},
 {who:'noa',scene:'yard',place:'条件を確認',text:'報酬は別。剣の交渉はそのあと。そこ、曖昧にしないでね。'},
 {who:'rine',scene:'yard',place:'仕事を引き受ける',text:'受ける。交渉を始めるための、交渉ね。'}],
yard:[
 {who:'ash',scene:'yard',place:'荷物は無事、だけど',text:'魔物は片付いた！ ……おい、あの木箱の山、こっちへ歩いてこないか？'},
 {who:'hugo',scene:'yard',place:'ゴーレムが暴走',text:'それが荷役ゴーレムだ！ 荷物を盾にし始めやがった。胸の制御石を止めてくれ！'}],
beforeBoss:[
 {who:'finn',scene:'yard',place:'暴走！荷役ゴーレム',text:'荷を崩しても、留め具を締め直してくる。隙を作ったら、大技をまとめて当てよう。'},
 {who:'rine',scene:'yard',place:'買い戻し代は働いて稼ぐ',text:'剣を売った翌日に、その剣のために働くなんて。……全員、怪我だけはしないでよ。'}],
ending:[
 {who:'hugo',scene:'yard',place:'機械は停止、商談を再開',text:'助かった！ 仕事代は約束どおり払う。さて、剣を買い戻したいんだったな。'},
 {who:'rine',scene:'yard',place:'返品ではなく、買い戻し',prop:'sword',text:'ええ。売ったのは私だけど、どうしても取り戻したいの。'},
 {who:'hugo',scene:'yard',place:'買い手の問いかけ',text:'ずいぶん大事な品だったらしいな。何があった？'}],
honest:[
 {who:'rine',scene:'yard',place:'聖剣の価値を話す',prop:'news',text:'王家が探している聖剣だったの。発見者への報酬は1億G。今さらで、都合のいい話だけど。'},
 {who:'hugo',expression:'laugh',scene:'yard',place:'ヒューゴの返事',text:'一億！？ ……薪を割らせてる場合じゃねえな。俺は商売を再開できりゃ十分だ。修理のお礼に返すよ。'},
 {who:'hugo',scene:'yard',place:'紹介状を受け取った',text:'王都の鑑定所への紹介状も書こう。あっちに知り合いがいる。土産話は、あとで聞かせてくれ。'},
 {who:'noa',scene:'yard',place:'取り分の相談はまだ早い',text:'まずは本物か、ちゃんと鑑定してもらおう。情報料の計算は、そのあと。'},
 {who:'finn',scene:'yard',place:'今度こそ、最後まで',text:'そうだね。僕の鑑定の説明も、今度こそ最後まで聞いてもらえるかな。'},
 {who:'rine',scene:'yard',place:'第一章 · 聖剣を取り戻した',prop:'recovered',text:'最初から聞くわ。……今日の夕飯は、おにぎり。四人でね。'}],
barter:[
 {who:'rine',scene:'yard',place:'修理代で買い戻す',text:'制御石の調整、留め具の交換、危険手当。追加の修理代300Gと、買い戻し代300Gで相殺を提案するわ。'},
 {who:'hugo',expression:'laugh',scene:'yard',place:'商談成立',text:'ははっ、昨日より商売上手だな！ いいぜ。受け取りの領収書だけ、ここに書いてくれ。'},
 {who:'ash',scene:'yard',place:'秘密にできない剣士',text:'よし！ これで聖剣の発見報酬、一億Gに——あ。'},
 {who:'hugo',scene:'yard',place:'言うのが遅い',text:'……一億？ それは先に言え！ ま、約束は約束だ。今度はその剣で薪を割るなよ。'},
 {who:'noa',scene:'yard',place:'お土産も経費',text:'王都のお土産、ちゃんと持って戻ろうね。領収書も忘れずに。'},
 {who:'rine',scene:'yard',place:'第一章 · 聖剣を取り戻した',prop:'recovered',text:'もちろん。……今日の夕飯は、おにぎり。四人でね。'}]
};
const STORY_TITLES={intro:'300Gの剣と260Gの夕食',trail:'荷車のわだち',receipt:'伝票の住所',fork:'買い戻しの準備',help:'四人分のお弁当',trace:'30Gの整備図',market:'薪小屋への道',buyer:'聖剣で薪割り',deal:'交渉の前の仕事',yard:'動き出す木箱',beforeBoss:'荷役ゴーレムを止めろ',ending:'買い戻しの商談',honest:'正直に話した商談',barter:'修理代との相殺'};
const BEFORE_NODE={1:'trail',3:'market',4:'deal',5:'beforeBoss'};
const AFTER_BATTLE={1:'receipt',3:'buyer',4:'yard',5:'ending'};
const STORY_BATTLES=Object.fromEntries(Object.entries(BEFORE_NODE).map(([node,id])=>[id,Number(node)]));
return{HEROES,NPCS,MONSTERS,NODES,STORIES,STORY_TITLES,BEFORE_NODE,AFTER_BATTLE,STORY_BATTLES,IDS:Object.keys(HEROES),XP:[0,35,85,160,260],TITLE:'勇者の剣、売りました。',CHAPTER:'第一章・食べた300G',INFO_COST:30};
});
