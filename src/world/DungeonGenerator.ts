import { Rng, hashString } from "../core/Rng";
import { DUNGEON_MAX_FLOOR } from "../data/balance";
import { T } from "../data/tiles";
import { TileMap } from "../gfx/TileMap";

/**
 * ランダムダンジョン生成（部屋 + 通路方式）。
 * 同じ (runSeed, floor) からは常に同じマップが生成される。
 */
export interface FloorPlan {
  map: TileMap;
  entry: { x: number; y: number };
}

const COLS = 36;
const ROWS = 24;

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function generateFloor(runSeed: number, floor: number): FloorPlan {
  const rng = new Rng((runSeed ^ hashString(`floor:${floor}`)) >>> 0);
  const map = new TileMap(COLS, ROWS, T.ROCK);

  const rooms = placeRooms(rng);
  for (const room of rooms) {
    carveRoom(map, room);
  }
  // 隣り合う部屋同士をL字通路で接続（placeRooms が中心x順にソート済み）
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(map, center(rooms[i - 1]!), center(rooms[i]!), rng);
  }

  const entryRoom = rooms[0]!;
  const lastRoom = rooms[rooms.length - 1]!;
  const entry = center(entryRoom);
  map.set(entry.x, entry.y, T.EXIT);

  // 最下層はボスの祭壇、それ以外は下り階段
  const goal = center(lastRoom);
  map.set(goal.x, goal.y, floor >= DUNGEON_MAX_FLOOR ? T.BOSS : T.STAIRS);

  placeChests(map, rooms, rng, entry, goal);

  return { map, entry };
}

/** 4近傍BFSで from から to へ歩いて到達できるか（宝箱は通行不可として扱う） */
function isReachable(
  map: TileMap,
  from: { x: number; y: number },
  to: { x: number; y: number },
): boolean {
  const walkable = (x: number, y: number): boolean => {
    const id = map.get(x, y);
    return id === T.FLOOR || id === T.STAIRS || id === T.BOSS || id === T.EXIT;
  };
  const seen = new Set<number>([from.y * COLS + from.x]);
  const queue = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === to.x && cur.y === to.y) return true;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = ny * COLS + nx;
      if (!seen.has(key) && walkable(nx, ny)) {
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return false;
}

function placeRooms(rng: Rng): Room[] {
  const target = rng.int(5, 7);
  const rooms: Room[] = [];
  for (let attempt = 0; attempt < 80 && rooms.length < target; attempt++) {
    const w = rng.int(4, 8);
    const h = rng.int(3, 6);
    const x = rng.int(1, COLS - w - 2);
    const y = rng.int(1, ROWS - h - 2);
    const candidate = { x, y, w, h };
    if (rooms.some((r) => overlaps(r, candidate, 1))) continue;
    rooms.push(candidate);
  }
  // 万一部屋が少なすぎたら中央に大部屋を保証（生成失敗を起こさない）
  if (rooms.length < 2) {
    rooms.push({ x: 4, y: 4, w: 10, h: 8 });
    rooms.push({ x: 20, y: 12, w: 10, h: 8 });
  }
  rooms.sort((a, b) => a.x + a.w / 2 - (b.x + b.w / 2));
  return rooms;
}

function overlaps(a: Room, b: Room, pad: number): boolean {
  return (
    a.x - pad < b.x + b.w &&
    a.x + a.w + pad > b.x &&
    a.y - pad < b.y + b.h &&
    a.y + a.h + pad > b.y
  );
}

function center(room: Room): { x: number; y: number } {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function carveRoom(map: TileMap, room: Room): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      map.set(x, y, T.FLOOR);
    }
  }
}

function carveCorridor(
  map: TileMap,
  from: { x: number; y: number },
  to: { x: number; y: number },
  rng: Rng,
): void {
  // 水平→垂直か垂直→水平かをランダムに（通路の形に変化をつける）
  const bend = rng.chance(0.5) ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
  carveLine(map, from, bend);
  carveLine(map, bend, to);
}

function carveLine(
  map: TileMap,
  from: { x: number; y: number },
  to: { x: number; y: number },
): void {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let { x, y } = from;
  map.set(x, y, T.FLOOR);
  while (x !== to.x) {
    x += dx;
    map.set(x, y, T.FLOOR);
  }
  while (y !== to.y) {
    y += dy;
    map.set(x, y, T.FLOOR);
  }
}

function placeChests(
  map: TileMap,
  rooms: Room[],
  rng: Rng,
  entry: { x: number; y: number },
  goal: { x: number; y: number },
): void {
  const count = rng.int(2, 4);
  let placed = 0;
  for (let attempt = 0; attempt < 60 && placed < count; attempt++) {
    const room = rng.pick(rooms);
    if (!room) break;
    const x = rng.int(room.x, room.x + room.w - 1);
    const y = rng.int(room.y, room.y + room.h - 1);
    if ((x === entry.x && y === entry.y) || (x === goal.x && y === goal.y)) continue;
    if (map.get(x, y) !== T.FLOOR) continue;
    map.set(x, y, T.CHEST);
    // 宝箱は通行不可なので、通路の接続セルを塞いで階段への道を
    // 断ってしまうことがある。置いてみて到達不能になったら取り消す。
    if (!isReachable(map, entry, goal)) {
      map.set(x, y, T.FLOOR);
      continue;
    }
    placed++;
  }
}
