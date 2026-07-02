import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  // JS・CSS をすべて index.html にインライン化した単一ファイルを出力する。
  // ES モジュールの外部読み込みは file:// では CORS でブロックされるため、
  // 「ダブルクリックで遊べる配布物」にはインライン化が必須。
  // itch.io / Steam 向け Electron・Tauri ラップにもそのまま使える。
  base: "./",
  plugins: [viteSingleFile()],
  server: {
    host: true,
  },
  build: {
    target: "es2022",
  },
});
