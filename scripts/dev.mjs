import { spawn } from "node:child_process";
import { createServer } from "vite";
import config from "../vite.config.js";

const apiServer = spawn(process.execPath, ["scripts/local-server.js"], {
  env: { ...process.env, PORT: "3001" },
  stdio: "inherit",
});

let viteServer;
const stopApi = () => {
  if (!apiServer.killed) apiServer.kill();
};

const shutdown = async (code = 0) => {
  await viteServer?.close();
  stopApi();
  process.exit(code);
};

process.once("SIGINT", () => shutdown());
process.once("SIGTERM", () => shutdown());
apiServer.once("exit", (code) => {
  if (code && code !== 0) shutdown(code);
});

try {
  viteServer = await createServer(config);
  await viteServer.listen();
  viteServer.printUrls();
} catch (error) {
  stopApi();
  throw error;
}
