import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const roots = ["api", "lib", "scripts", "public/js"];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.(?:js|mjs)$/.test(entry.name) ? [file] : [];
  }));
  return nested.flat();
}

for (const root of roots) {
  for (const file of await sourceFiles(root)) {
    const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

console.log("OK");
