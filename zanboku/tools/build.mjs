import { mkdir, copyFile, cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const out = resolve(root, "dist");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of [
  "index.html",
  "style.css",
  "core.js",
  "controls.js",
  "art.js",
  "sound.js",
  "game.js",
])
  await copyFile(resolve(root, file), resolve(out, file));
await cp(resolve(root, "assets"), resolve(out, "assets"), { recursive: true });
console.log("Static release ready: zanboku/dist/ (no runtime dependencies)");
