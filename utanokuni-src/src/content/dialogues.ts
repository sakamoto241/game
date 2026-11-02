import type {Dialogue} from '../core/types.ts';
export const NAMES = {you:'あなた', rabbit:'ウタウサギ', acorn:'どんぐり', book:'絵本'};
export const DIALOGUES: Record<string, Dialogue> = {
 opening:{id:'opening',lines:[
  {speaker:'book',text:'棚の奥で見つけた、古い絵本。\n表紙には、うすれた文字で「うたのない国」とあった。'},
  {speaker:'you',text:'この絵、見たことがある気がする。\n……こんなに、静かな森だったっけ。'},
  {speaker:'book',text:'ページをめくると、指先を風がすり抜けた。\n次の瞬間、足の下には、やわらかな土があった。'}
 ]},
 rabbit:{id:'rabbit',lines:[
  {speaker:'rabbit',text:'やあ！　きみ、ページの外から来たんだね。\nぼくはウタウサギ。……名前だけなら、よく歌いそうでしょう。',expression:'wave'},
  {speaker:'you',text:'ここは、どこ？\nさっきまで、絵本を読んでいたはずなのに。'},
  {speaker:'rabbit',text:'ここは「うたのない国」だよ。\nでも、いつからうたを忘れたのか、みんなもよく覚えていないんだ。'}
 ],choices:[{label:'うたが、ないの？',next:'rabbit-song'},{label:'元の場所に帰れる？',next:'rabbit-home'}]},
 'rabbit-song':{id:'rabbit-song',complete:'rabbit',lines:[
  {speaker:'rabbit',text:'メロディーの代わりに、「いつもどおり」だけ残ったんだ。\n花は揺れて、どんぐりは転がる。理由は、誰も聞かない。'},
  {speaker:'rabbit',text:'木の道を、奥へ歩いてみて。どんぐり広場に住んでいる子がいるよ。\n泣き声は、うたじゃないけど……ひとりより、ふたりがいいから。',expression:'wave'}
 ]},
 'rabbit-home':{id:'rabbit-home',complete:'rabbit',lines:[
  {speaker:'rabbit',text:'帰るページを探せば、きっと。\n……ぼくは長くここにいるけれど、最初のページだけは見つからないんだ。'},
  {speaker:'rabbit',text:'まずは、どんぐり広場へ行ってみよう。\n困っている子の話を聞くと、知らなかった道が見えることもあるから。',expression:'wave'}
 ]},
 'rabbit-again':{id:'rabbit-again',lines:[
  {speaker:'rabbit',text:'どんぐり広場は、この森の奥だよ。\n歩きたい地面や、話したい相手を、そっと指さしてみて。'},
  {speaker:'rabbit',text:'落ち葉を見つけたら、絵本に挟んでみるといい。\n忘れたくないページには、目印がいるでしょう。'}
 ]},
 'rabbit-clearing':{id:'rabbit-clearing',lines:[
  {speaker:'rabbit',text:'ここが、どんぐり広場。\nあの子、さっきから帽子を握りしめているんだ。'},
  {speaker:'rabbit',text:'話は、最後まで聞いてあげてね。\n「いつもどおり」でも、悲しくないとは限らないから。'}
 ]},
 'rabbit-after':{id:'rabbit-after',lines:[{speaker:'rabbit',text:'帰りたいのに、転がらなければいけない。\n……その言葉、どこか変だと思わなかった？'}]},
 'gate-blocked':{id:'gate-blocked',lines:[{speaker:'rabbit',text:'そっちは森の奥だよ。出かける前に、少し話していかない？\n名前も知らないまま見送るのは、さみしいから。',expression:'wave'}]},
 sign:{id:'sign',lines:[{speaker:'book',text:'「きょうも、いつもどおり」\n\n看板には、それだけ書いてある。'}]},
 'sign-again':{id:'sign-again',lines:[{speaker:'book',text:'「きょうも、いつもどおり」\n\nさっき読んだ文字と、まったく同じ。\n新しい傷がひとつ増えているのに、文字だけは変わらない。'}]},
 leaf:{id:'leaf',lines:[{speaker:'you',text:'大きな落ち葉。金色の葉脈が、道みたいに分かれている。\nそっと持っていこう。絵本のしおりに、ちょうどよさそう。'}]},
 'leaf-empty':{id:'leaf-empty',lines:[{speaker:'you',text:'落ち葉があった場所だけ、土が少し温かい。'}]},
 book:{id:'book',lines:[{speaker:'book',text:'石の上の小さな絵本は、同じページで開いている。\n指を離すと、すぐ最初に戻ってしまう。'},
 {speaker:'you',text:'何か、目印になるものを挟んでおけないかな。'}]},
 'bookmark':{id:'bookmark',complete:'bookmark',lines:[{speaker:'you',text:'落ち葉を、ページの間にそっと挟んだ。\n今度は、指を離しても戻らない。'},
 {speaker:'book',text:'余白に、見えなかった文字が浮かんだ。\n\n「帰り道は、転がる道と同じでなくてもいい。」'}]},
 'book-after':{id:'book-after',lines:[{speaker:'book',text:'「帰り道は、転がる道と同じでなくてもいい。」\n\n落ち葉のしおりが、ひとつのページを覚えている。'}]},
 'wrong-item':{id:'wrong-item',lines:[{speaker:'you',text:'ここで使うものでは、なさそう。\n落ち葉なら、ページを覚えておくしおりにできるかもしれない。'}]},
 acorn:{id:'acorn',complete:'acorn',lines:[
  {speaker:'acorn',text:'うう……。ぼく、ころがるの、上手じゃないんだ。\nでも、ころがらなくちゃいけないんだって。',expression:'nervous'},
  {speaker:'you',text:'どうして？　転がらないで、歩いてもいいんじゃない？'},
  {speaker:'acorn',text:'だって、いつもそうだから。\nころがって、お池に落ちて……それから、家に帰りたくなるの。'},
  {speaker:'you',text:'まだ落ちていないのに、もう帰りたいんだね。'},
  {speaker:'acorn',text:'……うん。\nでも、きょうは誰かが話を聞いてくれた。\nそれは、いつもと少し違うね。'}
 ]},
 'acorn-again':{id:'acorn-again',lines:[{speaker:'acorn',text:'もう少しだけ、ここにいてもいい？\nまだ、家の匂いを覚えていたいんだ。'}]},
 chair:{id:'chair',lines:[{speaker:'you',text:'小さな椅子が、一脚だけ。\nどんぐりには少し高く、ウタウサギには少し低い。\n誰のために、置いてあるんだろう。'}]},
 'chair-again':{id:'chair-again',lines:[{speaker:'you',text:'椅子は空っぽだ。\nでも、座面の落ち葉だけ、さっきより少しへこんでいる。'}]},
 stump:{id:'stump',lines:[{speaker:'book',text:'切り株の扉は、内側から閉まっている。\n小さな灯りはついているのに、ノックの返事はない。'}]},
 unfinished:{id:'unfinished',lines:[{speaker:'book',text:'道の先は、白い紙のように途切れている。\nこの先の景色は、まだ絵本に描かれていない。'},
 {speaker:'rabbit',text:'この本で歩けるのは、いまは森の入口と、どんぐり広場まで。\n気になった場所を調べたり、もう一度みんなと話したりしてみてね。'}]}
};
