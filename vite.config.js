import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = process.cwd();
const publicRoot = path.join(root, "public");
const outputRoot = path.join(root, "dist");

function offlineAssets() {
  return {
    name: "recipe-book-offline-assets",
    async closeBundle() {
      await Promise.all([
        cp(path.join(publicRoot, "icons"), path.join(outputRoot, "icons"), { recursive: true }),
        cp(path.join(publicRoot, "fonts"), path.join(outputRoot, "fonts"), { recursive: true }),
        cp(path.join(publicRoot, "manifest.webmanifest"), path.join(outputRoot, "manifest.webmanifest")),
      ]);

      const assetsDir = path.join(outputRoot, "assets");
      const assets = await readdir(assetsDir);
      const precache = [
        ...assets.map((file) => `/assets/${file}`),
        "/manifest.webmanifest",
        "/icons/ui.svg",
        "/icons/app/icon-192.png",
        ...(await readdir(path.join(outputRoot, "fonts"))).filter((file) => file.endsWith(".woff2")).map((file) => `/fonts/${file}`),
        ...(await readdir(path.join(outputRoot, "icons", "food"))).filter((file) => file.endsWith(".svg")).map((file) => `/icons/food/${file}`),
      ];
      const html = await readFile(path.join(outputRoot, "index.html"), "utf8");
      const version = crypto.createHash("sha1").update(precache.join("|") + html).digest("hex").slice(0, 10);
      let serviceWorker = await readFile(path.join(publicRoot, "sw.js"), "utf8");
      serviceWorker = serviceWorker
        .replace('const VERSION = "dev";', `const VERSION = "${version}";`)
        .replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(precache)};`);
      if (!serviceWorker.includes(version)) throw new Error("Не вдалося підготувати sw.js");
      await mkdir(outputRoot, { recursive: true });
      await writeFile(path.join(outputRoot, "sw.js"), serviceWorker);
    },
  };
}

export default defineConfig({
  root: publicRoot,
  publicDir: false,
  plugins: [react(), offlineAssets()],
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3001",
      "/_local-blob": "http://127.0.0.1:3001",
    },
  },
  build: {
    outDir: outputRoot,
    emptyOutDir: true,
  },
});
