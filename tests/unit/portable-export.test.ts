import { describe, expect, it } from "vitest";
import { portableExportSchema } from "@/domain/schemas";
import { createDemoSnapshot } from "@/simulation/demo-data";

describe("portable exports", () => {
  it("accepts the supported export subset", () => {
    const snapshot = createDemoSnapshot(new Date("2026-08-20T12:00:00Z"));
    const result = portableExportSchema.safeParse({
      version: 1,
      data: {
        devices: snapshot.devices,
        services: snapshot.services,
        inventory: snapshot.inventory,
        notes: snapshot.notes,
        settings: snapshot.settings,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects partial records before they reach SQLite", () => {
    const result = portableExportSchema.safeParse({
      version: 1,
      data: {
        devices: [{ id: "incomplete" }],
        services: [],
        inventory: [],
        notes: [],
        settings: {},
      },
    });
    expect(result.success).toBe(false);
  });
});
