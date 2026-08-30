import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/hosted-demo.spec.ts",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-hosted", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "HOMELAB_HOSTED_DEMO=1 npm run dev -- --port 3200",
    url: "http://127.0.0.1:3200/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "hosted-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
