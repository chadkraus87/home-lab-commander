import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(".next/static/chunks");
const maximum = Number(process.env.HOMELAB_JS_BUDGET_BYTES ?? 4_000_000);
let bytes = 0;

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith(".js")) bytes += (await stat(path)).size;
  }
}

await walk(root);
process.stdout.write(
  `${JSON.stringify({ level: bytes <= maximum ? "info" : "error", event: "performance.javascript_budget", bytes, maximum })}\n`,
);
if (bytes > maximum) process.exitCode = 1;
