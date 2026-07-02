import { Game } from "./core/Game";
import { registerPlaceholderArt } from "./data/tiles";
import { TitleScene } from "./scenes/TitleScene";

const app = document.getElementById("app");
if (!app) throw new Error("#app が見つかりません");

const game = new Game(app);
registerPlaceholderArt(game.assets);

// 開発時のみ: E2E テスト・デバッグコンソール用フック
if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
}

void game.start(() => new TitleScene());
