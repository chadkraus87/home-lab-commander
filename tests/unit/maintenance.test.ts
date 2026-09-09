import { describe, expect, it } from "vitest";
import {
  getActiveMaintenanceWindow,
  maintenanceWindowState,
  sortMaintenanceWindows,
} from "@/domain/maintenance";
import { settingsInputSchema } from "@/domain/schemas";
import { createDemoSnapshot } from "@/simulation/demo-data";

const now = new Date("2026-09-09T12:00:00.000Z");
const windows = [
  {
    id: "completed",
    name: "Completed work",
    startsAt: "2026-09-09T09:00:00.000Z",
    endsAt: "2026-09-09T10:00:00.000Z",
    createdAt: "2026-09-08T12:00:00.000Z",
  },
  {
    id: "upcoming",
    name: "Upcoming work",
    startsAt: "2026-09-09T13:00:00.000Z",
    endsAt: "2026-09-09T14:00:00.000Z",
    createdAt: "2026-09-08T12:00:00.000Z",
  },
  {
    id: "active",
    name: "Active work",
    startsAt: "2026-09-09T11:00:00.000Z",
    endsAt: "2026-09-09T12:30:00.000Z",
    createdAt: "2026-09-08T12:00:00.000Z",
  },
];

describe("maintenance windows", () => {
  it("classifies, sorts, and selects the active window", () => {
    expect(maintenanceWindowState(windows[0]!, now)).toBe("completed");
    expect(maintenanceWindowState(windows[1]!, now)).toBe("upcoming");
    expect(maintenanceWindowState(windows[2]!, now)).toBe("active");
    expect(
      sortMaintenanceWindows(windows, now).map((window) => window.id),
    ).toEqual(["active", "upcoming", "completed"]);
    expect(getActiveMaintenanceWindow(windows, now)?.id).toBe("active");
  });

  it("hydrates legacy settings with no maintenance windows", () => {
    const legacy = Object.fromEntries(
      Object.entries(createDemoSnapshot(now).settings).filter(
        ([key]) => key !== "maintenanceWindows",
      ),
    );
    const parsed = settingsInputSchema.parse(legacy);
    expect(parsed.maintenanceWindows).toEqual([]);
  });

  it("rejects overlapping and excessively long windows", () => {
    const settings = createDemoSnapshot(now).settings;
    expect(
      settingsInputSchema.safeParse({
        ...settings,
        maintenanceWindows: [windows[2], { ...windows[2], id: "overlap" }],
      }).success,
    ).toBe(false);
    expect(
      settingsInputSchema.safeParse({
        ...settings,
        maintenanceWindows: [
          {
            ...windows[2],
            endsAt: "2026-09-30T12:00:00.000Z",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
