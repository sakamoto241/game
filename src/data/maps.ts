/**
 * 固定マップデータ。
 * TileMap.fromStrings が行長・未知文字を検証するので、
 * ここを書き換えるだけで安全にマップを編集できる。
 *
 * 街の施設（建物・看板）はマップには描かず、facilities.ts の定義から
 * TownScene が実行時にスタンプする。ここにあるのは地形と宿屋・ポータルのみ。
 */

/** 街「アルバの村」 40x24 */
export const TOWN_MAP_ROWS: readonly string[] = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "T......................................T",
  "T...............RRRRRR.................T",
  "T...............RRRRRR.................T",
  "T...............##DD##.................T",
  "T.................--...................T",
  "T..........F......--............T......T",
  "T.................--...................T",
  "T.----------------------------------...T",
  "T.................--...................T",
  "T.................--...................T",
  "T.................--...................T",
  "T...........F.....--....F..............T",
  "T.................--...................T",
  "T.----------------------------------...T",
  "T.................--...................T",
  "T.................--...........~~~~~~..T",
  "T.................--...........~~~~~~..T",
  "T.................--...........~~~~~~..T",
  "T.................--...........~~~~~~..T",
  "T..........F......--.............F.....T",
  "T.................PP...................T",
  "T.....T.........................T......T",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
];

/** 「はじまりの洞窟」 26x14（Phase 1 でランダム生成に置換済み。互換のため残置） */
export const DUNGEON_MAP_ROWS: readonly string[] = [
  "rrrrrrrrrrrrrrrrrrrrrrrrrr",
  "rrrrffffffrrrrrfffffffSrrr",
  "rrrfffffffffrrffffffffffrr",
  "rrffffrrfffffffffrrrfffffr",
  "rrfffrrrrfffffffffrrffffrr",
  "rrfffrrfffffffrrffffffffrr",
  "rrrffffffffffrrrrffffffrrr",
  "rrrrfffffrrffffffffffffrrr",
  "rrfffffffrrrffffrrrfffffrr",
  "rrffffffffrrrfffffrrffffrr",
  "rrrffffffffffffffffffffrrr",
  "rrrrffffffffffffffffffrrrr",
  "rrrrrfffffffEfffffffrrrrrr",
  "rrrrrrrrrrrrrrrrrrrrrrrrrr",
];
