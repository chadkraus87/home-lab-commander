import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("hosted showcase supports deep-linked scenarios and guided tour", async ({
  page,
}) => {
  await page.goto("/?scenario=outage&tour=1");
  await expect(page.getByText("Browser-session demo:")).toBeVisible();
  await expect(page.getByLabel("Scenario")).toHaveValue("outage");
  await expect(
    page.getByRole("dialog", { name: "Command center" }),
  ).toBeVisible();
  await expect(page.getByText("DNS service is unavailable")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/devices\/atlas/);
  await expect(
    page.getByRole("dialog", { name: "Device intelligence" }),
  ).toBeVisible();
});

test("hosted showcase blocks every local operator boundary", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const calls = await Promise.all([
    request.post("/api/discovery", {
      data: { cidr: "192.168.10.0/24", method: "passive" },
    }),
    request.post("/api/diagnostics", {
      data: { kind: "ping", host: "127.0.0.1" },
    }),
    request.post("/api/collector"),
    request.post("/api/providers", { data: { id: "anything" } }),
    request.post("/api/wake", {
      data: {
        deviceId: "atlas",
        cidr: "192.168.10.0/24",
        confirmation: "WAKE atlas.lab",
      },
    }),
  ]);
  for (const response of calls) expect(response.status()).toBe(403);
});

test("hosted overview has no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/?scenario=balanced");
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});
