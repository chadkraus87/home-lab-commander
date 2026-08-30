import { describe, expect, it } from "vitest";
import {
  findDeviceMatch,
  reconcileDiscoveryResults,
} from "@/domain/reconciliation";
import { createDemoSnapshot } from "@/simulation/demo-data";

describe("discovery reconciliation", () => {
  const devices = createDemoSnapshot().devices;

  it("matches normalized MAC addresses before changing IP addresses", () => {
    const target = devices.find((device) => device.macAddress !== "Unknown")!;
    const match = findDeviceMatch(
      {
        ip: "192.168.10.250",
        hostname: null,
        macAddress: target.macAddress.replaceAll(":", "-"),
      },
      devices,
    );
    expect(match.device?.id).toBe(target.id);
    expect(match.reason).toBe("mac");
  });

  it("labels existing and new discoveries without mutating inputs", () => {
    const input = [
      {
        ip: devices[0]!.primaryIp,
        hostname: null,
        macAddress: null,
        latencyMs: 2,
        status: "reachable" as const,
        confidence: "high" as const,
      },
      {
        ip: "192.168.10.250",
        hostname: "new.lab",
        macAddress: null,
        latencyMs: 4,
        status: "reachable" as const,
        confidence: "medium" as const,
      },
    ];
    const output = reconcileDiscoveryResults(input, devices);
    expect(output[0]?.existingDeviceId).toBe(devices[0]?.id);
    expect(output[1]?.existingDeviceId).toBeNull();
    expect(input[0]).not.toHaveProperty("existingDeviceId");
  });
});
