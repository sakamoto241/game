import { Game } from "./core/Game";
import { registerPlaceholderArt } from "./data/tiles";
import { TitleScene } from "./scenes/TitleScene";

const app = document.getElementById("app");
if (!app) throw new Error("#app が見つかりません");

const game = new Game(app);
registerPlaceholderArt(game.assets);

void game.start(() => new TitleScene());
