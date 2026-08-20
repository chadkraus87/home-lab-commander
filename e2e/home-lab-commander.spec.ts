import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.request.post("/api/state", { data: { action: "reset-demo" } });
  await page.reload();
});

test("fresh application opens a populated Demo dashboard", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "Infrastructure overview" }),
  ).toBeVisible();
  await expect(page.getByText("Demo Environment Active")).toBeVisible();
  await expect(page.getByText("Managed devices")).toBeVisible();
});

test("opens a device with metrics and services", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Devices", exact: true })
    .click();
  await page
    .getByRole("link", { name: /Atlas Server/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Atlas Server" }),
  ).toBeVisible();
  await expect(page.getByText("Resource history")).toBeVisible();
  await expect(page.getByText("Home Assistant", { exact: true })).toBeVisible();
});

test("selects a topology node and opens its detail panel", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Network", exact: true })
    .click();
  await page.locator('.react-flow__node[data-id="atlas"]').click();
  await expect(page.getByTestId("topology-detail-panel")).toContainText(
    "192.168.10.10",
  );
});

test("adds a manual device and confirms persistence", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Devices", exact: true })
    .click();
  await page.getByRole("button", { name: "Add device" }).click();
  await page.getByLabel("Display name").fill("E2E Server");
  await page.getByLabel("Hostname").fill("e2e-server.lab");
  await page.getByLabel("Private IPv4 address").fill("192.168.10.88");
  await page
    .getByRole("button", { name: "Add device", exact: true })
    .last()
    .click();
  await expect(page.getByText("E2E Server")).toBeVisible();
  await page.reload();
  await expect(page.getByText("E2E Server")).toBeVisible();
});

test("creates a monitored service", async ({ page }) => {
  await page.getByRole("link", { name: "Services" }).click();
  await page.getByRole("button", { name: "Add service" }).click();
  await page.getByLabel("Service name").fill("E2E Monitor");
  await page.getByLabel("Private host or hostname").fill("192.168.10.10");
  await page.getByLabel("Port").fill("8088");
  await page.getByRole("button", { name: "Create monitor" }).click();
  await expect(page.getByText("E2E Monitor")).toBeVisible();
});

test("acknowledges an alert", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: /Alerts/, exact: false })
    .click();
  const row = page.getByTestId("alert-row").first();
  await row.getByRole("button", { name: "Acknowledge" }).click();
  await expect(page.getByText("Alert acknowledged")).toBeVisible();
});

test("creates a Markdown lab note", async ({ page }) => {
  await page.getByRole("link", { name: "Lab Notes" }).click();
  await page.getByRole("button", { name: "New note" }).click();
  await page.getByLabel("Note title").fill("E2E runbook");
  await page
    .getByLabel("Markdown note content")
    .fill("# Verified\n\nCreated by Playwright.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Lab note created")).toBeVisible();
});

test("uses unified global search", async ({ page }) => {
  await page.getByRole("button", { name: /Search infrastructure/ }).click();
  await page
    .getByPlaceholder("Search infrastructure or run a command…")
    .fill("Raspberry Pi DNS");
  await expect(
    page.getByText("Raspberry Pi DNS", { exact: true }),
  ).toBeVisible();
});

test("toggles color themes", async ({ page }) => {
  const before = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect
    .poll(() => page.locator("html").getAttribute("data-theme"))
    .not.toBe(before);
});

test("visibly opens the guarded Live Mode activation flow", async ({
  page,
}) => {
  await page.goto("/settings?section=live");
  await expect(
    page.getByText("Demo Mode is active. Select Live Mode"),
  ).toBeVisible();
  await page.getByRole("button", { name: /Live Mode/ }).click();
  await expect(page.getByText("Activation setup selected")).toBeVisible();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await expect(page.getByLabel("Approved private network")).toBeVisible();
  await expect(page.getByRole("button", { name: /Live Mode/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("mobile navigation remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "Devices", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Devices" })).toBeVisible();
});
