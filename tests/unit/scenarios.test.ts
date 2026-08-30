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
});
