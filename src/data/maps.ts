/**
 * 固定マップデータ（Phase 0）。
 * TileMap.fromStrings が行長・未知文字を検証するので、
 * ここを書き換えるだけで安全にマップを編集できる。
 *
 * Phase 1 でダンジョンはランダム生成に置き換わる（街は固定のまま拡張）。
 */

/** 街「アルバの村」 30x20 */
export const TOWN_MAP_ROWS: readonly string[] = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "T............................T",
  "T..T......RRRRRR.......T.....T",
  "T.........RRRRRR.............T",
  "T.........######.............T",
  "T.........##DD##....~~~~.....T",
  "T...F.......--......~~~~~~...T",
  "T....B......--......~~~~.....T",
  "T.....------------------.....T",
  "T.....-.....--.........-.....T",
  "T.....-.....--.........-..T..T",
  "T..T..-.....--.........-.....T",
  "T.....-.....--...F.....-.....T",
  "T.....------------------.....T",
  "T...........--...............T",
  "T....F......--........T......T",
  "T...........--...............T",
  "T...........--...............T",
  "T...........PP..........F....T",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
];

/** 「はじまりの洞窟」 26x14（Phase 1 でランダム生成に置換予定の固定サンプル） */
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
