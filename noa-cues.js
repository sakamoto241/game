/* Presentation reads the live attack timer; it never changes combat. */
(function(root){'use strict';
const kinds={slam:{name:'叩きつけ',tag:'足元注意',hint:'枠の外へ逃げろ！',now:'今、回避！',color:'#ffb05e',impact:'CRASH!'},orbs:{name:'魔弾連射',tag:'弾き返せ',hint:'弾が来たら「斬る」！',now:'まもなく発射！近づいたら斬れ！',color:'#ffce72',impact:'BURST!'},sweep:{name:'大薙ぎ払い',tag:'全体攻撃',hint:'光る直前に「回避」！',now:'今、回避！',color:'#ff955e',impact:'SWEEP!'},rush:{name:'突進',tag:'すり抜けろ',hint:'突っ込む瞬間に「回避」！',now:'今、回避！',color:'#ffb56a',impact:'RUSH!'}};
function describe(a,width=1040){if(!a||!kinds[a.kind]||!Number.isFinite(a.total)||a.total<=0||!Number.isFinite(a.left)||a.left<0||a.kind==='slam'&&!Number.isFinite(a.target))return null;const progress=Math.max(0,Math.min(1,1-a.left/a.total)),urgent=a.left<=.22,k=kinds[a.kind];return{...k,kind:a.kind,progress,urgent,count:Math.max(1,Math.min(3,Math.ceil((1-progress)*3))),action:urgent?k.now:k.hint,x0:a.kind==='slam'?a.target-115:0,x1:a.kind==='slam'?a.target+115:width};}
const api={kinds,describe};if(typeof module!=='undefined')module.exports=api;else root.NoaCues=api;
})(typeof window!=='undefined'?window:globalThis);
