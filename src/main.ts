import { Game } from "./core/Game";
import { registerPixelArt } from "./data/pixelart";
import { registerPlaceholderArt } from "./data/tiles";
import { TitleScene } from "./scenes/TitleScene";

const app = document.getElementById("app");
if (!app) throw new Error("#app が見つかりません");

const game = new Game(app);
registerPlaceholderArt(game.assets); // 最終フォールバック（色付き矩形）
registerPixelArt(game.assets); // コード製ピクセルアート（manifest の画像があれば上書きされる）

// 開発時のみ: E2E テスト・デバッグコンソール用フック
if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
}

void game.start(() => new TitleScene());
