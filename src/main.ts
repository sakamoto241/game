import "./styles/fonts.css"; // DotGothic16 を data: URI で同梱（canvas 描画用）
import { Game } from "./core/Game";
import { registerPixelArt } from "./data/pixelart";
import { registerPlaceholderArt } from "./data/tiles";
import { TitleScene } from "./scenes/TitleScene";

const app = document.getElementById("app");
if (!app) throw new Error("#app が見つかりません");

// canvas はフォント読み込み完了を待たないため、最初の描画前にロードを促す。
// data: URI 同梱なので通信は発生せず即座に解決する（失敗しても無視して続行）。
if (document.fonts?.load) {
  void document.fonts.load('16px "DotGothic16"').catch(() => {});
  void document.fonts.load('bold 16px "DotGothic16"').catch(() => {});
}

const game = new Game(app);
registerPlaceholderArt(game.assets); // 最終フォールバック（色付き矩形）
registerPixelArt(game.assets); // コード製ピクセルアート（manifest の画像があれば上書きされる）

// 開発時のみ: E2E テスト・デバッグコンソール用フック
if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
}

void game.start(() => new TitleScene());
