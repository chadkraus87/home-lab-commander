import { expect, test, type Page } from "@playwright/test";

const findingsByPage = new WeakMap<Page, string[]>();

export function enableBrowserGuards(): void {
  test.beforeEach(({ page }) => {
    const findings: string[] = [];
    findingsByPage.set(page, findings);
    page.on("pageerror", (error) =>
      findings.push(`pageerror: ${error.message}`),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        findings.push(`console:error: ${message.text()}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        findings.push(`response:${response.status()}: ${response.url()}`);
    });
  });

  test.afterEach(({ page }) => {
    expect(findingsByPage.get(page) ?? []).toEqual([]);
  });
}
