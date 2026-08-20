import { describe, expect, it } from "vitest";
import { average, downsampleMetrics } from "@/domain/metrics";
import {
  normalizeDiscoveredDevice,
  normalizeDockerContainer,
} from "@/domain/normalize";
import { createDemoSnapshot } from "@/simulation/demo-data";
import { advanceSimulation } from "@/simulation/engine";

describe("demo mode and provider normalization", () => {
  it("is deterministic for the same clock", () => {
    const now = new Date("2026-08-20T12:00:00Z");
    expect(createDemoSnapshot(now)).toEqual(createDemoSnapshot(now));
  });

  it("evolves telemetry without mutating the previous snapshot", () => {
    const snapshot = createDemoSnapshot(new Date("2026-08-20T12:00:00Z"));
    const previousCpu = snapshot.devices[0]?.metrics.cpu;
    const next = advanceSimulation(
      snapshot,
      2,
      new Date("2026-08-20T12:00:04Z"),
    );
    expect(next.devices[0]?.metrics.cpu).not.toBe(previousCpu);
    expect(snapshot.devices[0]?.metrics.cpu).toBe(previousCpu);
    expect(next.devices[0]?.metricHistory).toHaveLength(96);
  });

  it("downsamples metric series", () => {
    const points = createDemoSnapshot().devices[0]?.metricHistory ?? [];
    expect(downsampleMetrics(points, 12).length).toBeLessThanOrEqual(12);
    expect(average([2, 4, 6])).toBe(4);
    expect(average([])).toBe(0);
  });

  it("normalizes Docker and discovery provider records", () => {
    expect(
      normalizeDockerContainer({
        id: "abc",
        name: "/web",
        image: "nginx",
        state: "running",
        status: "Up (unhealthy)",
        ports: "80:80",
        hostDeviceId: "host",
      }).state,
    ).toBe("unhealthy");
    const device = normalizeDiscoveredDevice(
      { ip: "192.168.1.25", hostname: "new-host" },
      "2026-08-20T12:00:00Z",
    );
    expect(device.source).toBe("discovery");
    expect(device.primaryIp).toBe("192.168.1.25");
  });
});
