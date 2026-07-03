import { ENEMIES } from "./enemies";
import { FACILITY_IDS } from "./facilities";
import type { GameState } from "../world/GameState";

/** 実績定義。condition が true になった瞬間に解除される（街に入ったとき判定） */
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  condition: (state: GameState) => boolean;
}

const KILLABLE = ENEMIES.filter((e) => !e.boss).length;

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "firstWin",
    name: "はじめての しょうり",
    desc: "モンスターを 1たい たおす",
    condition: (s) => s.stats.battlesWon >= 1,
  },
  {
    id: "deep5",
    name: "そこの そこまで",
    desc: "B5Fに とうたつする",
    condition: (s) => s.stats.deepestFloor >= 5,
  },
  {
    id: "bossSlayer",
    name: "ぬしの おわり",
    desc: "どうくつのぬしを たおす",
    condition: (s) => s.bossDefeated,
  },
  {
    id: "builder",
    name: "むらの おんじん",
    desc: "すべての しせつを たてる",
    condition: (s) => FACILITY_IDS.every((id) => s.built[id]),
  },
  {
    id: "fullParty",
    name: "たのもしい なかま",
    desc: "パーティを 3にんに する",
    condition: (s) => s.party.length >= 3,
  },
  {
    id: "level10",
    name: "いっぱしの ぼうけんしゃ",
    desc: "ゆうしゃが レベル10に なる",
    condition: (s) => s.hero.level >= 10,
  },
  {
    id: "rich",
    name: "こばんざくざく",
    desc: "5000ゴールドを ためる",
    condition: (s) => s.gold >= 5000,
  },
  {
    id: "plus3",
    name: "かじやの ほこり",
    desc: "そうびを +3まで きたえる",
    condition: (s) =>
      [...s.party, ...s.bench].some((m) =>
        Object.values(m.equip).some((e) => e !== null && e.plus >= 3),
      ),
  },
  {
    id: "legendFish",
    name: "いけの ぬしとの たいけつ",
    desc: "でんせつの さかなを つりあげる",
    condition: (s) => s.itemDex.includes("nushizakana"),
  },
  {
    id: "mimicHunter",
    name: "はこの なかみ",
    desc: "ミミックを たおす",
    condition: (s) => (s.stats.kills["mimic"] ?? 0) >= 1,
  },
  {
    id: "dexHalf",
    name: "かけだしの はくぶつがくしゃ",
    desc: "モンスターずかんを はんぶん うめる",
    condition: (s) => Object.keys(s.stats.kills).length >= Math.ceil(KILLABLE / 2),
  },
  {
    id: "dexAll",
    name: "アルバの はくぶつがくしゃ",
    desc: "すべての モンスターを たおす",
    condition: (s) =>
      ENEMIES.filter((e) => !e.boss).every((e) => (s.stats.kills[e.id] ?? 0) >= 1) &&
      s.bossDefeated,
  },
  {
    id: "survivor",
    name: "しんでも あきらめない",
    desc: "ぜんめつから たちあがる",
    condition: (s) => s.stats.deaths >= 1,
  },
  {
    id: "questMaster",
    name: "むらの べんりや",
    desc: "いらいを 3けん こなす",
    condition: (s) => s.stats.questsCompleted >= 3,
  },
  {
    id: "cityFounder",
    name: "とし の そうせつしゃ",
    desc: "むらの はってんほうしんを きめる",
    condition: (s) => s.route !== null,
  },
];
