import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const checks = {
  appReady: false,
  tailscaleRunning: false,
  httpsAvailable: false,
};

try {
  const response = await fetch("http://127.0.0.1:3000/api/health", {
    signal: AbortSignal.timeout(3_000),
  });
  checks.appReady = response.ok;
} catch {}

try {
  const { stdout } = await execFileAsync("tailscale", ["status", "--json"], {
    timeout: 3_000,
    maxBuffer: 512_000,
  });
  const status = JSON.parse(stdout);
  checks.tailscaleRunning = status.BackendState === "Running";
  checks.httpsAvailable = Boolean(status.Self?.DNSName);
} catch {}

process.stdout.write(
  `${JSON.stringify({ level: checks.appReady && checks.tailscaleRunning ? "info" : "warn", event: "remote_access.preflight", ...checks })}\n`,
);
if (checks.appReady && checks.tailscaleRunning) {
  process.stdout.write(
    "Ready for private Tailnet access. Run this yourself after review:\n  tailscale serve --bg http://127.0.0.1:3000\n\nDo not use `tailscale funnel`; Funnel is public. Inspect with `tailscale serve status` and remove with `tailscale serve reset`.\n",
  );
} else {
  process.stdout.write(
    "Start HomeLab Commander on loopback and connect the host to Tailscale, then run this check again. No configuration was changed.\n",
  );
}
