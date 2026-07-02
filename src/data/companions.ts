import type { ClassId } from "./classes";

/** 酒場で勧誘できる仲間候補。追加はここに書くだけ */
export interface CompanionDef {
  id: string;
  name: string;
  classId: ClassId;
  fee: number;
  blurb: string;
}

export const COMPANIONS: CompanionDef[] = [
  {
    id: "garon",
    name: "ガロン",
    classId: "warrior",
    fee: 120,
    blurb: "もと えいへいの おおおとこ。かたい まもりが じまん。",
  },
  {
    id: "lira",
    name: "リラ",
    classId: "mage",
    fee: 150,
    blurb: "ほのおの じゅもんを あやつる りろんは たてじま の まじょ。",
  },
  {
    id: "teo",
    name: "テオ",
    classId: "priest",
    fee: 150,
    blurb: "たびの そうりょ。かいふくじゅもんで パーティを ささえる。",
  },
  {
    id: "mina",
    name: "ミナ",
    classId: "thief",
    fee: 130,
    blurb: "すばしっこい とうぞく。にげあしと おたからさがしが とくい。",
  },
];
