import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const primaryRoutes = [
  "/",
  "/devices",
  "/devices/atlas",
  "/network",
  "/services",
  "/services/home-assistant",
  "/containers",
  "/containers/ctr-home-assistant",
  "/monitoring",
  "/alerts",
  "/activity",
  "/inventory",
  "/notes",
  "/settings",
];

const navigationRetryErrors = [
  "Execution context was destroyed",
  "net::ERR_ABORTED",
  "frame was detached",
  "is interrupted by another navigation",
];

export async function collectAccessibilityFindings(
  page: Page,
  routes: string[],
): Promise<string[]> {
  const findings: string[] = [];

  for (const route of routes) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const current =
          page.url() === "about:blank" ? null : new URL(page.url());
        const target = new URL(route, current?.origin ?? "http://playwright");
        if (
          !current ||
          current.pathname !== target.pathname ||
          current.search !== target.search
        ) {
          try {
            await page.goto(route, { waitUntil: "domcontentloaded" });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            const interrupted = navigationRetryErrors.some((candidate) =>
              message.includes(candidate),
            );
            if (!interrupted) throw error;
          }
        }
        await expect(page.locator("main")).toBeVisible();
        // Let client hydration plus hosted session/scenario restoration settle
        // before axe injects into the document.
        await page.waitForTimeout(750);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();

        for (const violation of results.violations) {
          const nodes = violation.nodes
            .map(
              (node) =>
                `${node.target.join(" ")}: ${node.failureSummary ?? "rule failed"}`,
            )
            .join(" | ");
          findings.push(
            `${route}: ${violation.id} (${violation.impact ?? "unknown"}): ${nodes}`,
          );
        }
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const canRetry = navigationRetryErrors.some((candidate) =>
          message.includes(candidate),
        );
        if (!canRetry || attempt === 2) throw error;
      }
    }
  }

  return findings;
}
