import { describe, expect, it } from "vitest";
import { createDemoSnapshot } from "@/simulation/demo-data";
import {
  applyHostedMutation,
  parseHostedSession,
} from "@/simulation/hosted-state";

const now = "2026-08-20T12:00:00.000Z";

describe("hosted browser-session state", () => {
  it("applies mutations without changing the server snapshot", () => {
    const original = {
      ...createDemoSnapshot(new Date(now)),
      hostedDemo: true,
    };
    const result = applyHostedMutation(
      original,
      {
        action: "add-device",
        data: {
          displayName: "Browser-only device",
          hostname: "browser-device.lab",
          primaryIp: "192.168.10.99",
          type: "server",
          location: "Demo rack",
          tags: ["example"],
        },
      },
      { now, createId: () => "fixed" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.devices).toHaveLength(original.devices.length + 1);
    expect(original.devices).not.toContainEqual(
      expect.objectContaining({ primaryIp: "192.168.10.99" }),
    );
    expect(result.snapshot.settings.mode).toBe("demo");
  });

  it("never permits hosted settings to enter Live Mode", () => {
    const original = {
      ...createDemoSnapshot(new Date(now)),
      hostedDemo: true,
    };
    const result = applyHostedMutation(original, {
      action: "update-settings",
      data: { ...original.settings, mode: "live" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.snapshot.settings.mode).toBe("demo");
  });

  it("rejects malformed or non-hosted session data", () => {
    const fallback = {
      ...createDemoSnapshot(new Date(now)),
      hostedDemo: true,
    };
    expect(parseHostedSession("not-json", fallback)).toBe(fallback);
    expect(
      parseHostedSession(JSON.stringify({ hostedDemo: false }), fallback),
    ).toBe(fallback);
  });
});
