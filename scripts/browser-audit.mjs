import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const baseURL = process.env.HLC_BASE_URL ?? "http://127.0.0.1:3100";
const screenshotDirectory = new URL("../docs/screenshots/", import.meta.url);
await mkdir(fileURLToPath(screenshotDirectory), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
const findings = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type()))
    findings.push(`console:${message.type()}: ${message.text()}`);
});
page.on("pageerror", (error) => findings.push(`pageerror: ${error.message}`));
page.on("response", (response) => {
  if (response.status() >= 400)
    findings.push(`response:${response.status()}: ${response.url()}`);
});

await page.goto(baseURL, { waitUntil: "networkidle" });
await page.screenshot({
  path: fileURLToPath(new URL("overview.png", screenshotDirectory)),
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
await page.screenshot({
  path: fileURLToPath(new URL("overview-mobile.png", screenshotDirectory)),
  fullPage: true,
});

await browser.close();
if (findings.length > 0) {
  process.stderr.write(`${findings.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    "Browser audit passed with no console errors, page errors, or failed responses.\n",
  );
}
