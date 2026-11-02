import type {Area, AreaId} from '../core/types.ts';
export const WORLD = {width: 540, height: 860};
export const AREAS: Record<AreaId, Area> = {
 forest: {
  id: 'forest', name: '森の入口', subtitle: '知らないはずの、懐かしい森。', texture: 'forest', spawn: {x:270,y:744},
  walkPolygon: [{x:125,y:823},{x:440,y:823},{x:433,y:707},{x:393,y:622},{x:405,y:551},{x:431,y:473},{x:408,y:372},{x:354,y:298},{x:338,y:180},{x:312,y:102},{x:215,y:102},{x:195,y:252},{x:155,y:337},{x:108,y:441},{x:116,y:552},{x:150,y:641}],
  obstacles: [{x:402,y:172,w:121,h:140}],
  hotspots: [
   {id:'rabbit',label:'ウタウサギ',kind:'npc',frame:'rabbit-idle',position:{x:302,y:443},approach:{x:276,y:506}},
   {id:'sign',label:'古い看板',kind:'object',position:{x:103,y:474},approach:{x:193,y:502}},
   {id:'leaf',label:'大きな落ち葉',kind:'object',position:{x:171,y:658},approach:{x:245,y:681}},
   {id:'book',label:'小さな絵本',kind:'object',position:{x:467,y:553},approach:{x:378,y:587}},
   {id:'to-clearing',label:'どんぐり広場へ',kind:'exit',position:{x:270,y:121},approach:{x:270,y:158}}
  ]
 },
 clearing: {
  id:'clearing',name:'どんぐり広場',subtitle:'風のない場所で、葉だけが揺れている。',texture:'clearing',spawn:{x:270,y:756},
  walkPolygon:[{x:91,y:270},{x:180,y:199},{x:287,y:159},{x:356,y:207},{x:405,y:285},{x:405,y:329},{x:441,y:385},{x:457,y:575},{x:402,y:713},{x:333,y:825},{x:207,y:825},{x:130,y:704},{x:96,y:540},{x:79,y:395}],
  obstacles:[{x:82,y:318,w:73,h:84},{x:410,y:170,w:124,h:112}],
  hotspots:[
   {id:'acorn',label:'どんぐり',kind:'npc',frame:'acorn-idle',position:{x:310,y:438},approach:{x:270,y:496}},
   {id:'rabbit-clearing',label:'ウタウサギ',kind:'npc',frame:'rabbit-wave',position:{x:168,y:636},approach:{x:226,y:644}},
   {id:'chair',label:'小さな椅子',kind:'object',position:{x:110,y:359},approach:{x:208,y:418}},
   {id:'stump',label:'切り株の扉',kind:'object',position:{x:458,y:223},approach:{x:405,y:311}},
   {id:'unfinished',label:'白く途切れた道',kind:'object',position:{x:270,y:166},approach:{x:270,y:222}},
   {id:'to-forest',label:'森の入口へ',kind:'exit',position:{x:270,y:807},approach:{x:270,y:767}}
  ]
 }
};
