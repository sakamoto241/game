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
  // .ogg などの音声を data: URI としてバンドルに埋め込むため大きめに設定。
  // これで単一HTML(file://)でも BGM が鳴る（data: は file:// でも fetch 可能）。
  assetsInlineLimit: 8 * 1024 * 1024,
  build: {
    target: "es2022",
  },
});
