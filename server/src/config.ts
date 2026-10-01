import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

export const config = {
  port: Number(process.env.PORT) || 3001,
  dataDir: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(repoRoot, "data"),
  webDist: path.join(repoRoot, "web", "dist"),
  get hasWebBuild() {
    return existsSync(path.join(this.webDist, "index.html"));
  },
};
