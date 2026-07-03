import type { DayPhase } from "./balance";
import type { FacilityId } from "./facilities";
import type { GameState } from "../world/GameState";

/**
 * 村人定義。施設が建つと住民が増える（街の発展 = 人が増える実感）。
 * schedule: 時間帯ごとの居場所アンカー。null の時間帯は姿を消す（家で寝ている）。
 * dialog: 状態（天候・季節・進行度）に応じたセリフを返す。
 */
export interface NpcDef {
  id: string;
  name: string;
  /** キャラ配色 */
  hair: string;
  body: string;
  /** この施設が建つと村に現れる（省略時は最初からいる） */
  requires?: FacilityId;
  schedule: Record<DayPhase, { x: number; y: number } | null>;
  dialog: (state: GameState) => string[];
}

export const NPCS: NpcDef[] = [
  {
    id: "polka",
    name: "女将ポルカ",
    hair: "#b5453c",
    body: "#e8d8b0",
    schedule: {
      morning: { x: 17, y: 6 },
      day: { x: 20, y: 6 },
      evening: { x: 17, y: 6 },
      night: { x: 18, y: 6 },
    },
    dialog: (s) => {
      if (s.hero.hp < s.hero.maxHp * 0.4) {
        return ["「ひどい かおいろだよ！", "  うちで やすんでいきな。ひとばん 10Gだよ。」"];
      }
      if (s.weather === "rain") {
        return ["「あめの ひは やどが こんで うれしいねえ。」"];
      }
      return [
        "「ようこそ ねむりのおおかみ亭へ！",
        "  ダンジョンに もぐるまえは やくそうを わすれずにね。」",
      ];
    },
  },
  {
    id: "nico",
    name: "農夫ニコ",
    hair: "#7a4a2b",
    body: "#4d9448",
    schedule: {
      morning: { x: 11, y: 6 },
      day: { x: 15, y: 12 },
      evening: { x: 16, y: 13 }, // 道路の脇（交差点を塞がない）
      night: null,
    },
    dialog: (s) => {
      switch (s.weather) {
        case "rain":
          return ["「めぐみの あめだなあ。", "  あめの ひは さかなも よく つれるらしいぞ。」"];
        case "snow":
          return ["「ゆきかあ…… はたけは おやすみだな。」"];
        case "fog":
          return ["「きりが ふかいなあ。むりを するなよ。」"];
        default:
          return [`「いい てんきだ！ ${seasonTalk(s)}」`];
      }
    },
  },
  {
    id: "mame",
    name: "こどものマメ",
    hair: "#c8a832",
    body: "#e08bb0",
    schedule: {
      morning: { x: 16, y: 9 },
      day: { x: 18, y: 19 },
      evening: { x: 20, y: 9 },
      night: null,
    },
    dialog: (s) => {
      if (s.bossDefeated) {
        return ["「どうくつの ぬしを たおしたんでしょ！？", "  ぼくも ゆうしゃに なる！！」"];
      }
      return ["「その あなの したには こわ〜い ぬしが いるんだって！", "  よるは おばけも でるらしいよ……」"];
    },
  },
  {
    id: "bald",
    name: "店主バルド",
    hair: "#5a5666",
    body: "#b5453c",
    requires: "weaponShop",
    schedule: {
      morning: { x: 9, y: 5 },
      day: { x: 9, y: 5 },
      evening: { x: 9, y: 5 },
      night: null,
    },
    dialog: () => [
      "「ぶきは そうびしなきゃ ただの ぼうだぜ。",
      "  かじやで きたえれば もっと つよくなる！」",
    ],
  },
  {
    id: "noa",
    name: "シスター・ノア",
    hair: "#e8e8e0",
    body: "#c9cbde",
    requires: "church",
    schedule: {
      morning: { x: 34, y: 6 },
      day: { x: 33, y: 8 },
      evening: { x: 34, y: 6 },
      night: { x: 34, y: 6 },
    },
    dialog: (s) => {
      if (s.koMembers().length > 0) {
        return ["「たおれた おなかまが いるのですね……", "  きょうかいで よみがえらせて さしあげます。」"];
      }
      return ["「みなさまの たびに かごが ありますように。」"];
    },
  },
  {
    id: "rico",
    name: "売り子リコ",
    hair: "#a2643a",
    body: "#c8963c",
    requires: "market",
    schedule: {
      morning: { x: 26, y: 12 },
      day: { x: 26, y: 12 },
      evening: { x: 26, y: 12 },
      night: null,
    },
    dialog: (s) => {
      if (s.itemCount("houseki") > 0) {
        return ["「あら、いい ほうせき もってるじゃない！", "  いちばで たかく かいとるわよ。」"];
      }
      return [
        "「つりざおが あれば いけで つりが できるわよ。",
        "  つるはしなら どうくつの こうみゃくを ほれるわ。」",
      ];
    },
  },
];

function seasonTalk(s: GameState): string {
  switch (s.season) {
    case "spring":
      return "はるは たびだちの きせつだね。";
    case "summer":
      return "なつの ひざしは つよいなあ。";
    case "autumn":
      return "あきは しゅうかくの きせつだ。";
    case "winter":
      return "ふゆは いけの さかなも ねぼすけさ。";
  }
}
