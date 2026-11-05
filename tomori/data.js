(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;else root.TomoriData=data;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const HEROES={
 rine:{id:'rine',name:'リネ',role:'灯術師',color:'#8aa881',hp:100,atk:17,def:4,weapon:'灯羽のペン',bio:'消えた灯りの道を描き直す、旅の灯術師。手当てと閃光で仲間を支える。',skills:[{id:'flash',name:'閃光瓶',cost:2,kind:'hit',power:.9,break:2,style:'light',text:'盾を2削る。崩すと敵の行動を止める。'},{id:'heal',name:'灯の手当て',cost:2,kind:'heal',power:39,style:'heal',text:'味方1人のHPを大きく回復。'}]},
 ash:{id:'ash',name:'アッシュ',role:'剣士',color:'#ba8b78',hp:116,atk:20,def:6,weapon:'旅鉄の剣',bio:'人を待つより先に足が動く剣士。踏み込みで守りを崩し、先頭で仲間をかばう。',skills:[{id:'lunge',name:'踏み込み',cost:2,kind:'hit',power:.95,break:2,style:'slash',text:'盾を2削る。連携の起点に。'},{id:'cleave',name:'一閃',cost:3,kind:'hit',power:2.05,break:1,style:'slash',text:'強い一撃。崩れた敵に当てたい。'}]},
 noa:{id:'noa',name:'ノア',role:'弓使い',color:'#7e9e9a',hp:92,atk:19,def:3,weapon:'木葉の弓',bio:'音のない森にも足跡を見つける弓使い。印を付けた相手への次の攻撃を強める。',skills:[{id:'mark',name:'狙いの印',cost:1,kind:'hit',power:.5,break:1,style:'arrow',mark:true,text:'次に受ける攻撃を1.5倍にする。'},{id:'pierce',name:'貫通矢',cost:3,kind:'hit',power:1.9,break:1,style:'arrow',pierce:true,text:'盾の軽減を無視する強い矢。'}]},
 finn:{id:'finn',name:'フィン',role:'星詠み',color:'#a19ec2',hp:94,atk:20,def:3,weapon:'星読みの杖',bio:'古い道の星図を持つ、穏やかな研究者。連弾で盾を削り、落星で大きく攻める。',skills:[{id:'sparks',name:'火花の連弾',cost:2,kind:'hit',power:.85,break:1,hits:2,style:'fire',text:'2回攻撃。途中で盾を崩すことも。'},{id:'star',name:'落星',cost:3,kind:'hit',power:2.15,break:1,style:'star',text:'崩しと印を合わせると大ダメージ。'}]}
};
const MONSTERS={gel:{name:'こけしずく',asset:'gel',hp:53,atk:13,shield:2,color:'#9eb96f'},imp:{name:'いばらの木霊',asset:'imp',hp:62,atk:14,shield:2,color:'#c7a569'},wolf:{name:'霧かぶり',asset:'wolf',hp:101,atk:20,shield:3,color:'#9a9aad'},stag:{name:'霧橋の守り手',asset:'stag',hp:355,atk:29,shield:4,color:'#d1bd84',boss:true}};
const NODES=[{id:0,name:'宿場の灯',type:'camp',scene:'forest'},
{id:1,name:'木漏れ日の小道',type:'battle',scene:'forest',enemies:['gel','imp'],gold:55,ore:2,xp:26,description:'小道をふさぐ、小さな魔物たち。まずは盾を崩す連携を試そう。'},
{id:2,name:'倒れた道しるべ',type:'event',scene:'forest',description:'霧の中に、傷ついた旅人と消えかけた灯の痕跡。どちらへ手を伸ばす？'},
{id:3,name:'水車の跡',type:'battle',scene:'forest',enemies:['wolf','gel'],gold:65,ore:3,xp:35,description:'霧かぶりは、一度ためてから強く噛みつく。狙われる仲間を見よう。'},
{id:4,name:'星の消えた道',type:'battle',scene:'bridge',enemies:['imp','wolf','gel'],gold:80,ore:3,xp:44,description:'橋へ続く最後の道。誰から倒すか、順番を決めよう。'},
{id:5,name:'霧の橋',type:'battle',scene:'bridge',enemies:['stag'],gold:120,ore:5,xp:65,description:'守り手の盾は、崩すたび硬くなる。印と大技の使いどころが大切。'}];
const STORIES={
 intro:[{who:'rine',text:'灯台の火が消えた夜、町へ続く道だけが、霧の中に消えてしまった。'},{who:'ash',text:'道しるべの灯をつなげば、橋まで行ける。迷っている人たちを迎えに行こう。'},{who:'finn',text:'守りの強い魔物には、先に隙を作るんだ。盾を崩せば、こちらの攻撃が通る。'},{who:'noa',text:'私の印も使って。誰が先に動くかで、同じ三人でも戦い方は変わるから。'},{who:'rine',text:'うん。消えた道に、もう一度あかりを。ここから、四人の旅が始まる。'}],
 fork:[{who:'noa',text:'道しるべが倒れてる。その向こうに、人がいる。……足をけがしているみたい。'},{who:'rine',text:'回復薬を一本使えば、ひとりで宿場まで戻れそう。反対の小道には、灯の痕跡も残ってる。'},{who:'ash',text:'どちらを選んでも、置いていくわけじゃない。できることから、道をつなごう。'}],
 help:[{who:'rine',text:'これで歩ける？　宿場の灯りが見える方へ、ゆっくり戻ってね。'},{who:'ash',text:'旅人が、母親の手作りだというお守りをくれた。少しだけ、みんなの体が軽くなった。'}],
 trace:[{who:'noa',text:'見つけた。石の角が光るときだけ、守り手の盾に綻びができる。'},{who:'finn',text:'残った灯石も持っていこう。これで装備を整えられる。橋の戦いも、少し有利になるはずだ。'}],
 beforeBoss:[{who:'finn',text:'あの守り手は、道を奪ったんじゃない。消えた火が戻るまで、橋を守っていたんだ。'},{who:'rine',text:'それでも今は、私たちを通してくれない。灯を見せよう。この先へ帰りたい人がいるって。'}],
 ending:[{who:'rine',text:'灯をひとつ置くと、橋の向こうにも、小さな明かりがともった。'},{who:'noa',text:'見える。霧の中を、町へ戻る人たちが歩いてる。'},{who:'ash',text:'道は、ちゃんとつながってたんだな。……おかえりって、言ってやろう。'},{who:'finn',text:'消えた火の理由は、まだ分からない。でも、この一歩は、私たちが取り戻した道だ。'},{who:'rine',text:'また旅に出るときも、帰る場所を忘れないで。私たちは、そこへ灯をつなぐ。'}]
};
return{HEROES,MONSTERS,NODES,STORIES,IDS:Object.keys(HEROES),XP:[0,35,85,160,260],TITLE:'灯をつなぐ旅'};
});
