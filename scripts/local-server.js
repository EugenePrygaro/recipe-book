/**
 * Локальний запуск без Vercel, Redis і Blob: npm run local → http://localhost:3000
 * npm run preview — те саме, але з продакшн-збіркою з dist/ (SERVE_DIR=dist).
 * Дані тримаються в пам’яті й зникають після зупинки сервера.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

register("./blob-loader.js", import.meta.url);
process.env.BLOB_READ_WRITE_TOKEN ||= "local";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { setRedisClient } = await import("../lib/store.js");
const { MemoryRedis } = await import("./memory-redis.js");
const { files } = await import("./memory-blob.js");
setRedisClient(new MemoryRedis());

const staticDir = path.join(root, process.env.SERVE_DIR || "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".webmanifest": "application/manifest+json" };

/** Додає до req/res ті самі помічники, що дає Vercel. */
async function withVercelHelpers(req, res, url) {
  req.query = Object.fromEntries(url.searchParams);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  req.body = raw && (req.headers["content-type"] || "").includes("json") ? JSON.parse(raw) : raw || undefined;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.slice(5).replace(/[^a-z]/g, "");
      const mod = await import(`../api/${name}.js`).catch(() => null);
      if (!mod) { res.statusCode = 404; return res.end("not found"); }
      await withVercelHelpers(req, res, url);
      return mod.default(req, res);
    }
    if (url.pathname.startsWith("/_local-blob/")) {
      const f = files.get(url.pathname.slice(13));
      if (!f) { res.statusCode = 404; return res.end(); }
      res.setHeader("Content-Type", f.contentType || "application/octet-stream");
      return res.end(f.body);
    }
    const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    const file = path.join(staticDir, path.normalize(rel));
    if (!file.startsWith(staticDir)) { res.statusCode = 403; return res.end(); }
    const body = await readFile(file);
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(body);
  } catch (err) {
    if (err.code === "ENOENT") { res.statusCode = 404; return res.end("not found"); }
    console.error(err);
    res.statusCode = 500;
    res.end("error");
  }
}).listen(process.env.PORT || 3000, "127.0.0.1", () => {
  console.log(`Книга рецептів: http://localhost:${process.env.PORT || 3000}`);
});
