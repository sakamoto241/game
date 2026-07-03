import { Camera } from "../core/Camera";
import type { Renderer } from "../core/Renderer";
import { UI_W, UI_H, WORLD_W, WORLD_H } from "../core/Renderer";
import { Scene } from "../core/Scene";
import {
  FISHING_BITE_WINDOW,
  FISHING_WAIT,
  INN_PRICE,
  INN_WAKE_HOUR,
  MIN_PER_STEP,
  PHASE_TINTS,
  REVIVE_PRICE_PER_LEVEL,
  SEASON_TINTS,
  TRADE_IN_RATE,
  smithyCost,
  type DayPhase,
} from "../data/balance";
import { CLASSES, type ClassId } from "../data/classes";
import { COMPANIONS } from "../data/companions";
import { NPCS } from "../data/npcs";
import { dailyQuests, type ActiveQuest } from "../data/quests";
import {
  ROUTES,
  ROUTE_IDS,
  applyBuy,
  applySell,
  innPrice,
  smithyCostMult,
  smithyMaxPlus,
  type RouteId,
} from "../data/routes";
import {
  ARMOR_SHOP_STOCK,
  EQUIPMENT,
  SLOT_NAMES,
  WEAPON_SHOP_STOCK,
  equipName,
  type EquipId,
  type EquipSlot,
} from "../data/equipment";
import {
  FACILITIES,
  FACILITY_H,
  FACILITY_IDS,
  FACILITY_W,
  facilityDoors,
  isOpen,
  type FacilityDef,
} from "../data/facilities";
import { ITEMS, ITEM_IDS, type ItemId } from "../data/items";
import { T, TILE_DEFS, TOWN_LEGEND } from "../data/tiles";
import { TOWN_MAP_ROWS } from "../data/maps";
import { TILE, TileMap } from "../gfx/TileMap";
import { WeatherFX } from "../gfx/WeatherFX";
import { ListMenu } from "../ui/ListMenu";
import { drawBanner, drawMessage, drawToast } from "../ui/Windows";
import { PauseMenu } from "../ui/PauseMenu";
import { Follower } from "../world/Follower";
import type { GameState } from "../world/GameState";
import { Npc } from "../world/Npc";
import { PartyMember } from "../world/PartyMember";
import { Player } from "../world/Player";
import { DungeonScene } from "./DungeonScene";

export const DEFAULT_SPAWN = { x: 18, y: 9 };
/** 宿屋の扉の前 */
export const INN_SPAWN = { x: 18, y: 5 };
/** ポータルの上（portalArmed ラッチで即再発動を防ぐ） */
export const PORTAL_SPAWN = { x: 18, y: 21 };

/** 依頼掲示板の位置（宿屋のとなり） */
const BOARD_POS = { x: 22, y: 5 };

/** シーン内メニューのスタック要素 */
interface OpenMenu {
  menu: ListMenu;
  onSelect: (value: string) => void;
  /** メニュー下に出す1行の補足 */
  info?: string;
}

/**
 * 街「アルバの村」。
 * 施設は facilities.ts の定義から実行時にスタンプされる（建物 or 看板）。
 * 昼夜で見た目が変わり、店には営業時間がある。街に入るたびにオートセーブ。
 */
export class TownScene extends Scene {
  readonly name = "Town";

  private map!: TileMap;
  private player!: Player;
  private followers: Follower[] = [];
  private npcs: Npc[] = [];
  private lastPhase: DayPhase | null = null;
  private weatherFx = new WeatherFX();
  private fishing: { phase: "wait" | "bite"; t: number } | null = null;
  private cam = new Camera();
  private bannerTimer = 2.6;
  private message: string[] | null = null;
  private menuStack: OpenMenu[] = [];
  private pauseMenu: PauseMenu | null = null;
  private toastTimer = 0;
  private portalArmed = false;
  private leaving = false;
  /** 村長との会話後に発展ルート選択を開く */
  private pendingRouteMenu = false;

  constructor(
    private state: GameState,
    private spawn: { x: number; y: number } = DEFAULT_SPAWN,
    private introMessage?: string[],
  ) {
    super();
  }

  override onEnter(): void {
    this.state.endRun(); // 街に戻った時点でランは終了
    this.map = TileMap.fromStrings(TOWN_MAP_ROWS, TOWN_LEGEND);
    this.applyTownState();
    this.player = new Player(this.spawn.x, this.spawn.y);
    this.followers = this.state.party
      .slice(1)
      .map((m) => new Follower(m, this.spawn.x, this.spawn.y));
    this.portalArmed = this.map.get(this.spawn.x, this.spawn.y) !== T.PORTAL;
    // 村人: 施設が建つほど住民が増える（村長は全施設で登場）
    const allBuilt = FACILITY_IDS.every((id) => this.state.built[id]);
    this.npcs = NPCS.filter((def) =>
      def.requiresAllFacilities
        ? allBuilt
        : !def.requires || this.state.built[def.requires],
    ).map((def) => new Npc(def, this.game.rootRng.fork(`npc:${def.id}`)));
    this.lastPhase = null; // 次の update で setPhase される
    this.game.audio.playBgm("town");
    if (this.introMessage) {
      this.message = this.introMessage;
      this.introMessage = undefined;
    }
    // 実績の判定（新規解除があればメッセージで祝う）
    const unlocked = this.state.checkAchievements();
    if (unlocked.length > 0) {
      this.game.audio.playSe("levelup");
      const lines = ["じっせきを かいほうした！"];
      for (const a of unlocked) lines.push(`★『${a.name}』 — ${a.desc}`);
      this.message = this.message ? [...this.message, ...lines] : lines;
    }
    this.state.save(this.game);
    this.toastTimer = 1.8;
  }

  /** 街の発展状態をマップに反映する（建物 or 建築予定地の看板） */
  private applyTownState(): void {
    this.map.set(BOARD_POS.x, BOARD_POS.y, T.BOARD);
    for (const id of FACILITY_IDS) {
      const def = FACILITIES[id];
      if (this.state.built[id]) {
        this.stampBuilding(def);
      } else {
        this.map.set(def.sign.x, def.sign.y, T.SIGN);
      }
    }
  }

  private stampBuilding(def: FacilityDef): void {
    const { x, y } = def.plot;
    for (let dx = 0; dx < FACILITY_W; dx++) {
      this.map.set(x + dx, y, def.roofTile);
      this.map.set(x + dx, y + 1, def.roofTile);
      this.map.set(x + dx, y + 2, T.WALL);
    }
    for (const door of facilityDoors(def)) {
      this.map.set(door.x, door.y, T.SHOP_DOOR);
    }
    this.map.set(def.sign.x, def.sign.y, T.GRASS);
  }

  // =========================================================================
  // 更新
  // =========================================================================
  update(dt: number): void {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.toastTimer > 0) this.toastTimer -= dt;
    for (const f of this.followers) f.update(dt);

    // 天候・村人の生活（メニュー中も世界は動き続ける）
    this.weatherFx.setWeather(this.state.weather);
    this.weatherFx.update(dt);
    const phase = this.state.phase();
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      for (const npc of this.npcs) npc.setPhase(phase);
    }
    const playerTile = { x: this.player?.tileX ?? 0, y: this.player?.tileY ?? 0 };
    for (const npc of this.npcs) npc.update(dt, this.map, TILE_DEFS, playerTile);

    if (this.leaving) return;

    const input = this.game.input;

    if (this.message) {
      if (input.pressed("confirm") || input.pressed("cancel")) {
        this.message = null;
        if (this.pendingRouteMenu) {
          this.pendingRouteMenu = false;
          this.openRouteMenu();
        }
      }
      return;
    }

    // 釣りの最中
    if (this.fishing) {
      this.updateFishing(dt);
      return;
    }

    const top = this.menuStack[this.menuStack.length - 1];
    if (top) {
      const ev = top.menu.update(input, dt);
      if (ev?.type === "cancel") this.menuStack.pop();
      else if (ev?.type === "select") top.onSelect(ev.item.value);
      return;
    }

    if (this.pauseMenu) {
      const result = this.pauseMenu.update(this.game, dt);
      if (result === "close" || result === "wing") this.pauseMenu = null;
      return;
    }
    if (input.pressed("menu")) {
      this.pauseMenu = new PauseMenu(this.state, false);
      return;
    }

    this.player.update(dt, input, this.map, TILE_DEFS, (x, y) =>
      this.npcs.some((n) => n.visible && n.tileX === x && n.tileY === y),
    );
    this.syncFollowers();
    this.game.debug.set("Pos", `(${this.player.tileX}, ${this.player.tileY})`);
    this.game.debug.set("Time", this.state.timeLabel());

    // ポータル（到着イベントで判定）
    const arrival = this.player.arrival;
    if (arrival) {
      this.state.advanceTime(MIN_PER_STEP);
      this.state.applyPoisonStep();
      if (this.map.get(arrival.x, arrival.y) !== T.PORTAL) {
        this.portalArmed = true;
      } else if (this.portalArmed) {
        this.leaving = true;
        this.game.audio.playSe("warp");
        this.game.scenes.replace(new DungeonScene(this.state, 1), 0.5);
        return;
      }
    }

    // しらべる
    if (input.pressed("confirm") && !this.player.isMoving) {
      this.interact();
    }
  }

  private syncFollowers(): void {
    this.followers.forEach((f, i) => {
      const target = this.player.trail[i];
      if (target) f.setTarget(target.x, target.y);
    });
  }

  private interact(): void {
    const facing = this.player.facingTile();

    // 村人に話しかける
    const npc = this.npcs.find(
      (n) => n.visible && n.tileX === facing.x && n.tileY === facing.y,
    );
    if (npc) {
      npc.faceToward(this.player.tileX, this.player.tileY);
      this.game.audio.playSe("decide");
      // 村長: 発展方針が未決定なら選択メニューへ
      if (npc.def.id === "mayor" && this.state.route === null) {
        this.message = [`＊ ${npc.def.name}`, ...npc.def.dialog(this.state)];
        this.pendingRouteMenu = true;
        return;
      }
      this.message = [`＊ ${npc.def.name}`, ...npc.def.dialog(this.state)];
      return;
    }

    const spots = [facing, { x: this.player.tileX, y: this.player.tileY }];
    for (const spot of spots) {
      const tile = this.map.get(spot.x, spot.y);
      if (tile === T.DOOR) {
        this.openInn();
        return;
      }
      if (tile === T.SHOP_DOOR) {
        const facility = this.facilityAtDoor(spot.x, spot.y);
        if (facility) this.openFacility(facility);
        return;
      }
      if (tile === T.SIGN) {
        const facility = this.facilityAtSign(spot.x, spot.y);
        if (facility) this.openBuildMenu(facility);
        return;
      }
      if (tile === T.BOARD) {
        this.openBoard();
        return;
      }
      if (tile === T.WATER) {
        this.tryStartFishing();
        return;
      }
    }
  }

  // =========================================================================
  // 釣り
  // =========================================================================
  private tryStartFishing(): void {
    if (this.state.itemCount("rod") <= 0) {
      this.message = this.game.text.wrap(
        "みずが きらきら ひかっている。つりざおが あれば つりが できそうだ。（いちばで うっている）",
        40,
      );
      return;
    }
    this.game.audio.playSe("decide");
    const rng = this.game.rootRng.fork(`fish:${this.state.day}:${this.state.minutes}`);
    this.fishing = { phase: "wait", t: rng.float(FISHING_WAIT.min, FISHING_WAIT.max) };
  }

  private updateFishing(dt: number): void {
    const fishing = this.fishing!;
    const input = this.game.input;
    fishing.t -= dt;

    if (fishing.phase === "wait") {
      if (input.pressed("confirm") || input.pressed("cancel")) {
        this.fishing = null;
        this.message = ["はやく あげすぎた…… さかなに にげられた。"];
        return;
      }
      if (fishing.t <= 0) {
        fishing.phase = "bite";
        fishing.t = FISHING_BITE_WINDOW;
        this.game.audio.playSe("bite");
      }
      return;
    }

    // アタリ！
    if (input.pressed("confirm")) {
      this.fishing = null;
      this.catchFish();
      return;
    }
    if (fishing.t <= 0) {
      this.fishing = null;
      this.message = ["いきおいよく ひいたのに…… にげられてしまった。"];
    }
  }

  private catchFish(): void {
    const rng = this.game.rootRng.fork(`catch:${this.state.day}:${this.state.minutes}`);
    const rainy = this.state.weather === "rain";
    const r = rng.next();
    this.game.audio.playSe("catch");
    // 雨の日はレアが釣れやすい
    if (r < (rainy ? 0.12 : 0.04)) {
      this.state.addItem("nushizakana");
      this.message = ["つよい ひきだ……！！", "でんせつの『いけのぬし』を つりあげた！！"];
    } else if (r < (rainy ? 0.22 : 0.12)) {
      this.state.addItem("houseki");
      this.message = ["なにかが かかった！", "……さかなじゃない。ほうせきだ！！"];
    } else if (r < (rainy ? 0.58 : 0.44)) {
      this.state.addItem("nijimasu");
      this.message = ["ニジマスを つりあげた！"];
    } else {
      this.state.addItem("kozakana");
      this.message = ["こざかなを つりあげた！"];
    }
    this.state.advanceTime(10);
    this.state.save(this.game);
  }

  private facilityAtDoor(x: number, y: number): FacilityDef | null {
    for (const id of FACILITY_IDS) {
      const def = FACILITIES[id];
      if (!this.state.built[id]) continue;
      if (facilityDoors(def).some((d) => d.x === x && d.y === y)) return def;
    }
    return null;
  }

  private facilityAtSign(x: number, y: number): FacilityDef | null {
    for (const id of FACILITY_IDS) {
      const def = FACILITIES[id];
      if (!this.state.built[id] && def.sign.x === x && def.sign.y === y) return def;
    }
    return null;
  }

  // =========================================================================
  // メニュー基盤
  // =========================================================================
  private pushMenu(menu: ListMenu, onSelect: (value: string) => void, info?: string): void {
    this.menuStack.push({ menu, onSelect, info });
  }

  private closeMenus(): void {
    this.menuStack = [];
  }

  private showMessage(lines: string[]): void {
    this.closeMenus();
    this.message = lines;
  }

  private setTopInfo(info: string): void {
    const top = this.menuStack[this.menuStack.length - 1];
    if (top) top.info = info;
  }

  // =========================================================================
  // 宿屋
  // =========================================================================
  private openInn(): void {
    this.game.audio.playSe("decide");
    this.pushMenu(
      new ListMenu(
        [
          {
            label: "とまる（あさまで やすむ）",
            value: "rest",
            note: `${innPrice(this.state.route, INN_PRICE)}G`,
          },
          ...(["yakusou", "tsubasa", "dokukeshi"] as const).map((id) => ({
            label: `${ITEMS[id].name}を かう`,
            value: id,
            note: `${applyBuy(this.state.route, ITEMS[id].price)}G`,
          })),
          { label: "やめる", value: "quit" },
        ],
        "やどや『ねむりのおおかみ亭』",
      ),
      (value) => this.onInnSelect(value),
    );
  }

  private onInnSelect(value: string): void {
    switch (value) {
      case "rest": {
        const price = innPrice(this.state.route, INN_PRICE);
        if (this.state.gold < price) {
          this.showMessage(["「おかねが たりないようだね。」"]);
          return;
        }
        this.state.gold -= price;
        for (const m of this.state.party) {
          if (m.alive) m.fullRestore();
        }
        this.state.sleepUntilMorning(INN_WAKE_HOUR);
        this.state.save(this.game);
        this.game.audio.playSe("heal");
        const lines = [
          "ぐっすり ねむって あさに なった。",
          "HPと MPが ぜんかいふくした！",
        ];
        if (this.state.koMembers().length > 0) {
          lines.push("（たおれた なかまは きょうかいで よみがえらせよう）");
        }
        this.showMessage(lines);
        return;
      }
      case "yakusou":
      case "tsubasa":
      case "dokukeshi": {
        const item = ITEMS[value];
        const price = applyBuy(this.state.route, item.price);
        if (this.state.gold < price) {
          this.showMessage(["「おかねが たりないようだね。」"]);
          return;
        }
        this.state.gold -= price;
        this.state.addItem(item.id);
        this.state.save(this.game);
        this.game.audio.playSe("buy");
        this.setTopInfo(`${item.name}を こうにゅう（x${this.state.itemCount(item.id)}）`);
        return;
      }
      default:
        this.closeMenus();
    }
  }

  // =========================================================================
  // 施設の振り分け
  // =========================================================================
  private openFacility(def: FacilityDef): void {
    if (!isOpen(def, this.state.hour)) {
      this.showMessage([
        `${def.name}は しまっている。`,
        `（えいぎょうは ${def.hours!.open}じ から ${def.hours!.close}じ まで）`,
      ]);
      return;
    }
    this.game.audio.playSe("decide");
    switch (def.id) {
      case "weaponShop":
        this.openEquipShop(def, WEAPON_SHOP_STOCK);
        break;
      case "armorShop":
        this.openEquipShop(def, ARMOR_SHOP_STOCK);
        break;
      case "tavern":
        this.openTavern(def);
        break;
      case "church":
        this.openChurch(def);
        break;
      case "smithy":
        this.openSmithy(def);
        break;
      case "market":
        this.openMarket(def);
        break;
    }
  }

  // =========================================================================
  // 装備ショップ（武器屋・防具屋）
  // =========================================================================
  private openEquipShop(def: FacilityDef, stock: EquipId[]): void {
    this.pushMenu(
      new ListMenu(
        [
          ...stock.map((id) => {
            const e = EQUIPMENT[id];
            const stat = e.atk > 0 ? `こうげき+${e.atk}` : `しゅび+${e.def}`;
            return {
              label: `${e.name}（${stat}）`,
              value: id,
              note: `${applyBuy(this.state.route, e.price)}G`,
            };
          }),
          { label: "やめる", value: "quit" },
        ],
        def.name,
      ),
      (value) => {
        if (value === "quit") {
          this.closeMenus();
          return;
        }
        this.chooseEquipTarget(value as EquipId);
      },
    );
  }

  private chooseEquipTarget(equipId: EquipId): void {
    const e = EQUIPMENT[equipId];
    this.pushMenu(
      new ListMenu(
        this.state.party.map((m) => ({
          label: m.name,
          value: m.id,
          note: `${SLOT_NAMES[e.slot]}: ${equipName(m.equip[e.slot])}`,
        })),
        "だれに そうびする？",
      ),
      (memberId) => this.buyAndEquip(equipId, memberId),
    );
  }

  private buyAndEquip(equipId: EquipId, memberId: string): void {
    const e = EQUIPMENT[equipId];
    const member = this.state.party.find((m) => m.id === memberId);
    if (!member) return;
    const old = member.equip[e.slot];
    if (old?.id === equipId) {
      this.showMessage(["「それは もう そうびしているぜ。」"]);
      return;
    }
    const tradeIn = old ? Math.floor(EQUIPMENT[old.id].price * TRADE_IN_RATE) : 0;
    const price = applyBuy(this.state.route, e.price);
    if (this.state.gold + tradeIn < price) {
      this.showMessage(["「おかねが たりないぜ。 また きてくれ！」"]);
      return;
    }
    this.state.gold = this.state.gold - price + tradeIn;
    member.equip[e.slot] = { id: equipId, plus: 0 };
    this.state.save(this.game);
    this.game.audio.playSe("buy");
    const lines = [`${member.name}は ${e.name}を そうびした！`];
    if (old) lines.push(`（${equipName(old)}を ${tradeIn}Gで したどり）`);
    this.showMessage(lines);
  }

  // =========================================================================
  // 酒場（勧誘・編成）
  // =========================================================================
  private openTavern(def: FacilityDef): void {
    this.pushMenu(
      new ListMenu(
        [
          { label: "なかまを さそう", value: "recruit" },
          { label: "パーティを へんせい", value: "manage" },
          { label: "やめる", value: "quit" },
        ],
        def.name,
      ),
      (value) => {
        if (value === "quit") this.closeMenus();
        else if (value === "recruit") this.openRecruitMenu();
        else this.openPartyManageMenu();
      },
    );
  }

  private openRecruitMenu(): void {
    const recruited = this.state.recruitedIds();
    const candidates = COMPANIONS.filter((c) => !recruited.has(c.id));
    if (candidates.length === 0) {
      this.showMessage(["さかばに あたらしい かおは いないようだ。"]);
      return;
    }
    this.pushMenu(
      new ListMenu(
        candidates.map((c) => ({
          label: `${c.name}（${cName(c.classId)}）`,
          value: c.id,
          note: `${c.fee}G`,
        })),
        "だれを さそう？",
      ),
      (id) => this.recruit(id),
    );
  }

  private recruit(companionId: string): void {
    const def = COMPANIONS.find((c) => c.id === companionId);
    if (!def) return;
    if (!this.state.canRecruit()) {
      this.showMessage([
        "パーティが いっぱいだ！",
        "（へんせいで だれかを やすませてから さそおう）",
      ]);
      return;
    }
    if (this.state.gold < def.fee) {
      this.showMessage(["「しきんが たりないみたいだな。」"]);
      return;
    }
    this.state.gold -= def.fee;
    const level = Math.max(1, this.state.hero.level - 1);
    this.state.party.push(PartyMember.fromCompanion(def, level));
    this.state.save(this.game);
    this.game.audio.playSe("levelup");
    this.showMessage([
      `${def.name}が なかまに くわわった！`,
      def.blurb,
    ]);
    // 隊列に反映
    this.followers = this.state.party
      .slice(1)
      .map((m) => new Follower(m, this.player.tileX, this.player.tileY));
  }

  private openPartyManageMenu(): void {
    const items = [
      ...this.state.party.slice(1).map((m) => ({
        label: `${m.name}を やすませる`,
        value: `out:${m.id}`,
        note: `Lv${m.level}`,
      })),
      ...this.state.bench.map((m) => ({
        label: `${m.name}を くわえる`,
        value: `in:${m.id}`,
        note: `Lv${m.level}`,
        disabled: !this.state.canRecruit(),
      })),
    ];
    if (items.length === 0) {
      this.showMessage(["いれかえる なかまが いない。"]);
      return;
    }
    this.pushMenu(new ListMenu(items, "パーティ へんせい"), (value) => {
      const [op, id] = value.split(":");
      if (op === "out") {
        const idx = this.state.party.findIndex((m) => m.id === id);
        if (idx > 0) {
          const [m] = this.state.party.splice(idx, 1);
          if (m) this.state.bench.push(m);
        }
      } else if (op === "in" && this.state.canRecruit()) {
        const idx = this.state.bench.findIndex((m) => m.id === id);
        if (idx >= 0) {
          const [m] = this.state.bench.splice(idx, 1);
          if (m) this.state.party.push(m);
        }
      }
      this.state.save(this.game);
      this.closeMenus();
      this.followers = this.state.party
        .slice(1)
        .map((m) => new Follower(m, this.player.tileX, this.player.tileY));
      this.openPartyManageMenu();
    });
  }

  // =========================================================================
  // 教会
  // =========================================================================
  private openChurch(def: FacilityDef): void {
    this.pushMenu(
      new ListMenu(
        [
          { label: "よみがえらせる", value: "revive" },
          { label: "おいのりを する", value: "pray" },
          { label: "やめる", value: "quit" },
        ],
        def.name,
      ),
      (value) => {
        if (value === "quit") this.closeMenus();
        else if (value === "pray") {
          const poisoned = this.state.party.filter((m) => m.alive && m.poisoned);
          for (const m of poisoned) m.poisoned = false;
          if (poisoned.length > 0) this.state.save(this.game);
          this.game.audio.playSe("heal");
          this.showMessage(
            poisoned.length > 0
              ? [
                  "しずかな いのりが つつみこむ……",
                  `${poisoned.map((m) => m.name).join("と ")}の どくが きえた！`,
                ]
              : ["しずかな いのりが きこえる……", "こころが やすらいだ。"],
          );
        } else this.openReviveMenu();
      },
    );
  }

  private openReviveMenu(): void {
    const ko = this.state.koMembers();
    if (ko.length === 0) {
      this.showMessage(["「たおれた かたは いないようですね。 なによりです。」"]);
      return;
    }
    this.pushMenu(
      new ListMenu(
        ko.map((m) => ({
          label: m.name,
          value: m.id,
          note: `${m.level * REVIVE_PRICE_PER_LEVEL}G`,
        })),
        "だれを よみがえらせる？",
      ),
      (id) => {
        const member = this.state.koMembers().find((m) => m.id === id);
        if (!member) return;
        const price = member.level * REVIVE_PRICE_PER_LEVEL;
        if (this.state.gold < price) {
          this.showMessage(["「おきふせが たりないようです……」"]);
          return;
        }
        this.state.gold -= price;
        member.revive();
        this.state.save(this.game);
        this.game.audio.playSe("heal");
        this.showMessage([`${member.name}は いきかえった！`]);
      },
    );
  }

  // =========================================================================
  // 鍛冶屋
  // =========================================================================
  private openSmithy(def: FacilityDef): void {
    this.pushMenu(
      new ListMenu(
        [
          ...this.state.party.map((m) => ({
            label: m.name,
            value: m.id,
            note: `Lv${m.level}`,
          })),
          { label: "やめる", value: "quit" },
        ],
        `${def.name}（だれの そうびを きたえる？）`,
      ),
      (value) => {
        if (value === "quit") {
          this.closeMenus();
          return;
        }
        this.openSmithySlotMenu(value);
      },
    );
  }

  private openSmithySlotMenu(memberId: string): void {
    const member = this.state.party.find((m) => m.id === memberId);
    if (!member) return;
    const slots: EquipSlot[] = ["weapon", "shield", "armor"];
    this.pushMenu(
      new ListMenu(
        slots.map((slot) => {
          const inst = member.equip[slot];
          if (!inst) {
            return { label: `${SLOT_NAMES[slot]}: なし`, value: slot, disabled: true };
          }
          if (inst.plus >= smithyMaxPlus(this.state.route)) {
            return {
              label: `${equipName(inst)}`,
              value: slot,
              note: "きたえきった",
              disabled: true,
            };
          }
          const cost = this.smithyCostFor(inst.plus + 1);
          return {
            label: `${equipName(inst)} → +${inst.plus + 1}`,
            value: slot,
            note: `こうせき${cost.kouseki} + ${cost.gold}G`,
          };
        }),
        `${member.name}の どれを きたえる？`,
      ),
      (slot) => this.forgeEquip(member, slot as EquipSlot),
    );
  }

  /** 工業都市は鍛冶コスト半額 */
  private smithyCostFor(nextPlus: number): { kouseki: number; gold: number } {
    const base = smithyCost(nextPlus);
    const mult = smithyCostMult(this.state.route);
    return {
      kouseki: Math.max(1, Math.ceil(base.kouseki * mult)),
      gold: Math.max(1, Math.floor(base.gold * mult)),
    };
  }

  private forgeEquip(member: PartyMember, slot: EquipSlot): void {
    const inst = member.equip[slot];
    if (!inst || inst.plus >= smithyMaxPlus(this.state.route)) return;
    const cost = this.smithyCostFor(inst.plus + 1);
    if (this.state.itemCount("kouseki") < cost.kouseki || this.state.gold < cost.gold) {
      this.showMessage([
        "「ざいりょうか かねが たりねえな。」",
        `（ひつよう: こうせき${cost.kouseki}こ と ${cost.gold}G）`,
      ]);
      return;
    }
    this.state.removeItem("kouseki", cost.kouseki);
    this.state.gold -= cost.gold;
    inst.plus++;
    this.state.save(this.game);
    this.game.audio.playSe("build");
    this.showMessage([
      "カン カン カン……",
      `${equipName(inst)}に きたえあげた！`,
    ]);
  }

  // =========================================================================
  // 市場（売却 + 道具の購入）
  // =========================================================================
  private openMarket(def: FacilityDef): void {
    this.pushMenu(
      new ListMenu(
        [
          { label: "ふようひんを うる", value: "sell" },
          { label: "どうぐを かう", value: "tools" },
          { label: "やめる", value: "quit" },
        ],
        def.name,
      ),
      (value) => {
        if (value === "quit") this.closeMenus();
        else if (value === "sell") this.openSellMenu();
        else this.openToolMenu();
      },
    );
  }

  private openSellMenu(): void {
    const items = this.buildSellMenuItems();
    if (items.length === 0) {
      this.showMessage(["うれる ものを もっていない。"]);
      return;
    }
    this.pushMenu(
      new ListMenu([...items, { label: "やめる", value: "quit" }], "なにを うる？"),
      (value) => {
        if (value === "quit") {
          this.closeMenus();
          return;
        }
        this.sellItem(value as ItemId);
      },
    );
  }

  private openToolMenu(): void {
    const tools: ItemId[] = ["rod", "pickaxe"];
    this.pushMenu(
      new ListMenu(
        tools.map((id) => {
          const owned = this.state.itemCount(id) > 0;
          return {
            label: `${ITEMS[id].name}（${ITEMS[id].desc}）`,
            value: id,
            note: owned ? "もっている" : `${applyBuy(this.state.route, ITEMS[id].price)}G`,
            disabled: owned,
          };
        }),
        "どうぐを かう",
      ),
      (value) => {
        const item = ITEMS[value as ItemId];
        const price = applyBuy(this.state.route, item.price);
        if (this.state.gold < price) {
          this.showMessage(["「おかねが たりないわよ。」"]);
          return;
        }
        this.state.gold -= price;
        this.state.addItem(item.id);
        this.state.save(this.game);
        this.game.audio.playSe("buy");
        this.showMessage([
          `${item.name}を こうにゅうした！`,
          item.id === "rod"
            ? "いけの みずべに むかって Zキーで つりが できる。"
            : "ダンジョンの こうみゃくを Zキーで ほれる。",
        ]);
      },
    );
  }

  private buildSellMenuItems(): { label: string; value: string; note: string }[] {
    return ITEM_IDS.filter(
      (id) => ITEMS[id].sell > 0 && this.state.itemCount(id) > 0,
    ).map((id) => ({
      label: `${ITEMS[id].name}を うる`,
      value: id,
      note: `${applySell(this.state.route, ITEMS[id].sell)}G x${this.state.itemCount(id)}`,
    }));
  }

  private sellItem(id: ItemId): void {
    if (this.state.itemCount(id) <= 0) return;
    const price = applySell(this.state.route, ITEMS[id].sell);
    this.state.removeItem(id);
    this.state.gold += price;
    this.game.audio.playSe("buy");
    // メニューを作り直して継続販売できるようにする
    const top = this.menuStack[this.menuStack.length - 1];
    if (top) {
      const items = this.buildSellMenuItems();
      top.menu.items = [...items, { label: "やめる", value: "quit" }];
      top.menu.index = Math.min(top.menu.index, top.menu.items.length - 1);
      top.info = `${ITEMS[id].name}を うった！（+${price}G / しょじ ${this.state.gold}G）`;
    }
    this.state.save(this.game);
  }

  // =========================================================================
  // 依頼掲示板
  // =========================================================================
  private questProgress(q: ActiveQuest): { done: boolean; note: string } {
    switch (q.kind) {
      case "hunt": {
        const cur = Math.min(
          q.count,
          (this.state.stats.kills[q.targetId] ?? 0) - q.baseline,
        );
        return { done: cur >= q.count, note: cur >= q.count ? "ほうこくOK!" : `${Math.max(0, cur)}/${q.count}` };
      }
      case "deliver": {
        const cur = Math.min(q.count, this.state.itemCount(q.targetId as ItemId));
        return { done: cur >= q.count, note: cur >= q.count ? "ほうこくOK!" : `${cur}/${q.count}` };
      }
      case "reach":
        return { done: q.done, note: q.done ? "ほうこくOK!" : "みとうたつ" };
    }
  }

  private openBoard(): void {
    this.game.audio.playSe("decide");
    const items: { label: string; value: string; note?: string }[] = [];
    for (const q of this.state.quests) {
      const p = this.questProgress(q);
      items.push({
        label: `[うけおい] ${q.label}`,
        value: p.done ? `report:${q.id}` : `info:${q.id}`,
        note: p.note,
      });
    }
    if (this.state.quests.length < 2) {
      const offers = dailyQuests(this.state.day).filter(
        (o) => !this.state.quests.some((q) => q.id === o.id),
      );
      for (const o of offers) {
        items.push({ label: `[ぼしゅう] ${o.label}`, value: `accept:${o.id}`, note: `${o.rewardGold}G` });
      }
    }
    items.push({ label: "やめる", value: "quit" });
    this.pushMenu(
      new ListMenu(items, "いらいけいじばん"),
      (value) => this.onBoardSelect(value),
      "いらいは どうじに 2けんまで。あしたには あたらしい ぼしゅうが はられる",
    );
  }

  private onBoardSelect(value: string): void {
    const [op, ...rest] = value.split(":");
    const id = rest.join(":");
    if (op === "quit") {
      this.closeMenus();
      return;
    }
    if (op === "accept") {
      const offer = dailyQuests(this.state.day).find((o) => o.id === id);
      if (!offer) return;
      this.state.quests.push({
        ...offer,
        baseline: this.state.stats.kills[offer.targetId] ?? 0,
        done: false,
      });
      this.state.save(this.game);
      this.game.audio.playSe("decide");
      this.closeMenus();
      this.showMessage([`いらい『${offer.label}』を うけた！`]);
      return;
    }
    const quest = this.state.quests.find((q) => q.id === id);
    if (!quest) return;
    if (op === "info") {
      const p = this.questProgress(quest);
      this.showMessage([quest.label, `しんちょく: ${p.note}   ほうしゅう: ${quest.rewardGold}G`]);
      return;
    }
    // report
    const p = this.questProgress(quest);
    if (!p.done) return;
    if (quest.kind === "deliver") {
      this.state.removeItem(quest.targetId as ItemId, quest.count);
    }
    this.state.gold += quest.rewardGold;
    this.state.stats.questsCompleted++;
    this.state.quests = this.state.quests.filter((q) => q.id !== quest.id);
    this.state.save(this.game);
    this.game.audio.playSe("levelup");
    this.showMessage([
      `いらい『${quest.label}』を たっせいした！`,
      `ほうしゅう ${quest.rewardGold}Gを うけとった！`,
    ]);
  }

  // =========================================================================
  // 発展ルート（村長）
  // =========================================================================
  private openRouteMenu(): void {
    this.pushMenu(
      new ListMenu(
        [
          ...ROUTE_IDS.map((id) => ({
            label: `${ROUTES[id].name}（${ROUTES[id].perks}）`,
            value: id,
          })),
          { label: "まだ きめない", value: "quit" },
        ],
        "むらの はってんほうしん",
      ),
      (value) => {
        if (value === "quit") {
          this.closeMenus();
          return;
        }
        this.confirmRoute(value as RouteId);
      },
      "いちど きめると かえられない！ むらの なまえも かわる",
    );
  }

  private confirmRoute(id: RouteId): void {
    this.pushMenu(
      new ListMenu(
        [
          { label: "やめておく", value: "no" },
          { label: `${ROUTES[id].name}に けってい！`, value: "yes" },
        ],
        `ほんとうに ${ROUTES[id].name}へ すすむ？`,
      ),
      (value) => {
        if (value !== "yes") {
          this.menuStack.pop();
          return;
        }
        this.state.route = id;
        this.state.save(this.game);
        this.game.audio.playSe("build");
        this.bannerTimer = 4;
        this.showMessage([
          "むらは あたらしい みちを あゆみはじめた！",
          `ここは きょうから 『${ROUTES[id].townTitle}』！`,
          `（${ROUTES[id].perks}）`,
        ]);
      },
    );
  }

  // =========================================================================
  // 建築
  // =========================================================================
  private openBuildMenu(def: FacilityDef): void {
    this.game.audio.playSe("decide");
    this.pushMenu(
      new ListMenu(
        [
          {
            label: `${def.name}を たてる`,
            value: "build",
            note: `こうせき${def.cost.kouseki} + ${def.cost.gold}G`,
          },
          { label: "やめる", value: "quit" },
        ],
        "けんちくよていち",
      ),
      (value) => {
        if (value !== "build") {
          this.closeMenus();
          return;
        }
        this.build(def);
      },
      `${def.desc}（こうせき ${this.state.itemCount("kouseki")}こ しょじ）`,
    );
  }

  private build(def: FacilityDef): void {
    if (
      this.state.itemCount("kouseki") < def.cost.kouseki ||
      this.state.gold < def.cost.gold
    ) {
      this.showMessage([
        "ざいりょうが たりない！",
        `ひつよう: こうせき${def.cost.kouseki}こ と ${def.cost.gold}ゴールド`,
      ]);
      return;
    }
    const p = def.plot;
    if (
      this.player.tileX >= p.x &&
      this.player.tileX < p.x + FACILITY_W &&
      this.player.tileY >= p.y &&
      this.player.tileY < p.y + FACILITY_H
    ) {
      this.showMessage(["そこに たっていては たてられない！"]);
      return;
    }
    this.state.removeItem("kouseki", def.cost.kouseki);
    this.state.gold -= def.cost.gold;
    this.state.built[def.id] = true;
    this.stampBuilding(def);
    this.state.save(this.game);
    this.game.audio.playSe("build");
    this.bannerTimer = 3;
    this.showMessage([
      "トンテンカン トンテンカン……",
      `${def.name}が かんせいした！！`,
      "むらが すこし にぎやかに なった。",
    ]);
  }

  // =========================================================================
  // 描画
  // =========================================================================
  render(r: Renderer): void {
    const ctx = r.world;
    const px = this.player.px + TILE / 2;
    const py = this.player.py + TILE / 2;
    this.cam.centerOn(px, py, this.map.widthPx, this.map.heightPx);

    this.cam.begin(ctx);
    this.map.render(ctx, this.cam, TILE_DEFS, this.game.assets);
    for (const npc of this.npcs) npc.render(ctx, this.game.assets);
    // 隊列は後ろから描いて勇者を最前面に
    for (let i = this.followers.length - 1; i >= 0; i--) {
      this.followers[i]!.render(ctx, this.game.assets);
    }
    this.player.render(ctx, this.game.assets, this.state.hero);
    this.cam.end(ctx);

    // 季節 → 昼夜 の順にティントを重ね、その上に天候エフェクト
    const seasonTint = SEASON_TINTS[this.state.season];
    if (seasonTint) {
      ctx.fillStyle = seasonTint;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    const tint = PHASE_TINTS[this.state.phase()];
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    this.weatherFx.render(ctx);

    this.renderUi(r.ui);
  }

  private renderUi(ctx: CanvasRenderingContext2D): void {
    const text = this.game.text;
    this.renderHud(ctx);
    drawBanner(this.game, ctx, this.state.townTitle(), this.bannerTimer, 240);
    drawToast(this.game, ctx, "オートセーブしました", this.toastTimer);

    if (this.pauseMenu) {
      this.pauseMenu.render(this.game, ctx);
      return;
    }

    // 釣りの吹き出し（… / ！）
    if (this.fishing) {
      const sx = (this.cam.toScreenX(this.player.px) + TILE / 2) * 2;
      const sy = this.cam.toScreenY(this.player.py) * 2 - 14;
      const label = this.fishing.phase === "bite" ? "！" : "・・・";
      text.window(ctx, sx - 24, sy - 18, 48, 30);
      text.draw(ctx, label, sx, sy - 10, {
        size: 14,
        align: "center",
        bold: true,
        color: this.fishing.phase === "bite" ? "#ffd970" : "#f5f1e8",
      });
      return;
    }

    if (this.message) {
      drawMessage(this.game, ctx, this.message);
      return;
    }

    if (this.menuStack.length > 0) {
      // スタックを重ねて描画（下の階層は左、上の階層は右にずらす）
      this.menuStack.forEach((entry, i) => {
        const x = 56 + i * 36;
        const y = UI_H - entry.menu.height() - 96 - i * 14;
        entry.menu.render(ctx, text, x, y, 320);
        if (i === this.menuStack.length - 1 && entry.info) {
          const w = Math.max(entry.menu.renderedWidth, 320);
          const infoText = text.truncate(ctx, entry.info, w - 28, 11);
          text.window(ctx, x, y + entry.menu.height() + 6, w, 32);
          text.draw(ctx, infoText, x + 14, y + entry.menu.height() + 16, { size: 11 });
        }
      });
      return;
    }

    text.draw(ctx, "移動: 矢印/WASD   Z: しらべる   C: メニュー", UI_W - 12, UI_H - 20, {
      size: 10,
      align: "right",
      color: "#cfc8e8",
    });
  }

  private renderHud(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const text = this.game.text;
    const h = 52 + s.party.length * 16;
    text.window(ctx, UI_W - 236, 10, 226, h);
    text.draw(
      ctx,
      `${s.timeLabel()}  ${s.seasonWeatherLabel()}`,
      UI_W - 222,
      20,
      { size: 10, color: "#ffe9a0" },
    );
    s.party.forEach((m, i) => {
      const y = 36 + i * 16;
      const hpColor = !m.alive
        ? "#7d7690"
        : m.hp <= m.maxHp * 0.25
          ? "#ff8a8a"
          : "#f5f1e8";
      text.draw(ctx, `${m.name}${m.poisoned ? "毒" : ""}`, UI_W - 222, y, {
        size: 10,
        color: m.alive ? (m.poisoned ? "#c9a7ff" : "#d8d2e8") : "#7d7690",
      });
      text.draw(ctx, `HP${m.hp}`, UI_W - 138, y, { size: 10, color: hpColor });
      text.draw(ctx, `MP${m.mp}`, UI_W - 82, y, { size: 10, color: "#a8c8f0" });
    });
    text.draw(ctx, `${s.gold} G`, UI_W - 24, 36 + s.party.length * 16, {
      size: 10,
      align: "right",
      color: "#ffd970",
    });
  }
}

/** 職業名の短縮ヘルパー */
function cName(id: ClassId): string {
  return CLASSES[id].name;
}
