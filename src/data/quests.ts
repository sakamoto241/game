import { hashString, Rng } from "../core/Rng";
import { ENEMIES } from "./enemies";
import { ITEMS, type ItemId } from "./items";

/**
 * 依頼掲示板。その日の依頼は日付から決定論的に2件生成される。
 * 受注中の依頼はセーブされる（hunt は受注時の討伐数を基準に進捗を数える）。
 */
export type QuestKind = "hunt" | "deliver" | "reach";

export interface QuestOffer {
  id: string;
  kind: QuestKind;
  /** hunt: 敵ID / deliver: アイテムID / reach: 未使用 */
  targetId: string;
  count: number;
  rewardGold: number;
  label: string;
}

export interface ActiveQuest extends QuestOffer {
  /** hunt: 受注時点の累計討伐数 */
  baseline: number;
  /** reach: 到達済みフラグ */
  done: boolean;
}

const HUNT_POOL = ENEMIES.filter((e) => !e.boss && !e.special);
const DELIVER_POOL: { item: ItemId; min: number; max: number; goldPer: number }[] = [
  { item: "kouseki", min: 3, max: 5, goldPer: 45 },
  { item: "kozakana", min: 2, max: 3, goldPer: 40 },
  { item: "yakusou", min: 3, max: 4, goldPer: 30 },
];

/** その日の依頼（2件） */
export function dailyQuests(day: number): QuestOffer[] {
  return [makeQuest(day, 0), makeQuest(day, 1)];
}

function makeQuest(day: number, slot: number): QuestOffer {
  const rng = new Rng(hashString(`quest:${day}:${slot}`));
  const id = `q:${day}:${slot}`;
  const kindRoll = rng.next();
  if (kindRoll < 0.45) {
    const enemy = rng.pick(HUNT_POOL)!;
    const count = rng.int(3, 5);
    return {
      id,
      kind: "hunt",
      targetId: enemy.id,
      count,
      rewardGold: 60 + count * 30 + enemy.floors[0] * 20,
      label: `${enemy.name}を ${count}たい たおす`,
    };
  }
  if (kindRoll < 0.8) {
    const d = rng.pick(DELIVER_POOL)!;
    const count = rng.int(d.min, d.max);
    return {
      id,
      kind: "deliver",
      targetId: d.item,
      count,
      rewardGold: count * d.goldPer,
      label: `${ITEMS[d.item].name}を ${count}こ とどける`,
    };
  }
  const floor = rng.int(2, 5);
  return {
    id,
    kind: "reach",
    targetId: "",
    count: floor,
    rewardGold: 40 + floor * 50,
    label: `どうくつ B${floor}Fに とうたつする`,
  };
}
