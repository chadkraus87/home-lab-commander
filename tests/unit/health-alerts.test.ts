import { describe, expect, it } from "vitest";
import { deduplicateAlerts, evaluateAlertRules } from "@/domain/alerts";
import { calculateHealthScore } from "@/domain/health";
import { createDemoSnapshot } from "@/simulation/demo-data";

describe("health and alert rules", () => {
  it("calculates an explainable bounded health score", () => {
    const snapshot = createDemoSnapshot(new Date("2026-08-20T12:00:00Z"));
    const result = calculateHealthScore(snapshot);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.factors).toHaveLength(4);
    expect(result.factors.some((factor) => factor.label === "Services")).toBe(
      true,
    );
  });

  it("generates threshold alerts from normalized data", () => {
    const snapshot = createDemoSnapshot(new Date("2026-08-20T12:00:00Z"));
    const candidates = evaluateAlertRules(
      snapshot.devices,
      snapshot.services,
      snapshot.containers,
    );
    expect(
      candidates.some((alert) => alert.fingerprint === "high-disk:nas"),
    ).toBe(true);
    expect(
      candidates.some(
        (alert) => alert.fingerprint === "container-unhealthy:ctr-grafana",
      ),
    ).toBe(true);
  });

  it("updates an existing active fingerprint instead of flooding", () => {
    const snapshot = createDemoSnapshot(new Date("2026-08-20T12:00:00Z"));
    const candidate = {
      fingerprint: "disk:nas",
      severity: "warning" as const,
      category: "capacity",
      deviceId: "nas",
      sourceId: "nas",
      title: "NAS storage is 87% full",
      description: "Still full",
    };
    const updated = deduplicateAlerts(
      snapshot.alerts,
      [candidate],
      "2026-08-20T13:00:00Z",
    );
    expect(
      updated.filter(
        (alert) =>
          alert.fingerprint === "disk:nas" && alert.status !== "resolved",
      ),
    ).toHaveLength(1);
    expect(
      updated.find((alert) => alert.fingerprint === "disk:nas")?.lastTriggered,
    ).toBe("2026-08-20T13:00:00Z");
  });
});
