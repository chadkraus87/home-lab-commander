import { describe, expect, it } from "vitest";
import { createDemoSnapshot } from "@/simulation/demo-data";
import { applyDemoScenario } from "@/simulation/scenarios";

describe("hosted demo scenarios", () => {
  it("plays a clearly simulated outage and deterministic recovery", () => {
    const base = createDemoSnapshot();
    const outage = applyDemoScenario(
      base,
      "outage",
      "2026-08-20T12:00:00.000Z",
    );
    expect(
      outage.alerts.some((alert) =>
        alert.fingerprint.startsWith("demo-scenario:"),
      ),
    ).toBe(true);
    expect(outage.events[0]?.metadata.simulated).toBe(true);
    const recovery = applyDemoScenario(
      base,
      "recovery",
      "2026-08-20T12:05:00.000Z",
    );
    expect(
      recovery.services.find((service) => service.id === "pihole")?.status,
    ).toBe("healthy");
  });

  it("shows an active notification-suppression window", () => {
    const base = createDemoSnapshot();
    const maintenance = applyDemoScenario(
      base,
      "maintenance",
      "2026-09-09T12:00:00.000Z",
    );
    expect(maintenance.settings.maintenanceWindows).toHaveLength(1);
    expect(maintenance.settings.maintenanceWindows[0]?.startsAt).toBe(
      "2026-09-09T11:45:00.000Z",
    );
    expect(maintenance.events[0]?.eventType).toBe("demo.scenario.maintenance");
  });
});
