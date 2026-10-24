import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function runtimeArchitecture() {
  if (process.platform !== "darwin") return process.arch;
  const electronRelativePath = readFileSync(
    resolve("node_modules/electron/path.txt"),
    "utf8",
  ).trim();
  const electronBinary = resolve("node_modules/electron/dist", electronRelativePath);
  const architectures = execFileSync("lipo", ["-archs", electronBinary], {
    encoding: "utf8",
  }).trim();
  return architectures.split(/\s+/).includes("arm64") ? "arm64" : "x64";
}

const cli = resolve("node_modules/@electron/rebuild/lib/cli.js");
const result = spawnSync(
  process.execPath,
  [cli, "-f", "-w", "better-sqlite3", `--arch=${runtimeArchitecture()}`],
  { stdio: "inherit" },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
