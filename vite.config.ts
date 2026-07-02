import { defineConfig } from "vite";

export default defineConfig({
  // 相対パス出力。itch.io や Steam 向け Electron/Tauri ラップ等、
  // どこに置いてもそのまま動く静的ビルドにする。
  base: "./",
  server: {
    host: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
