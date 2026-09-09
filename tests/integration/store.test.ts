// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { recordServiceCheck } from "@/server/collector-repository";
import { AppStore } from "@/server/store";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("SQLite integration workflows", () => {
  it("seeds a fresh database and persists manual devices", () => {
    const directory = mkdtempSync(join(tmpdir(), "homelab-commander-"));
    directories.push(directory);
    const path = join(directory, "test.db");
    const store = new AppStore(path, true);
    expect(store.snapshot().settings.mode).toBe("demo");
    const updated = store.addDevice({
      displayName: "Test Server",
      hostname: "test-server.lab",
      primaryIp: "192.168.10.99",
      type: "server",
      location: "Test bench",
      tags: ["test"],
    });
    expect(
      updated.devices.some((device) => device.primaryIp === "192.168.10.99"),
    ).toBe(true);
    store.close();
    const reopened = new AppStore(path, true);
    expect(
      reopened
        .snapshot()
        .devices.some((device) => device.displayName === "Test Server"),
    ).toBe(true);
    reopened.close();
  });

  it("supports service, alert, note, inventory, and reset workflows", () => {
    const directory = mkdtempSync(join(tmpdir(), "homelab-commander-"));
    directories.push(directory);
    const store = new AppStore(join(directory, "test.db"), true);
    expect(
      store
        .addService({
          name: "Test HTTP",
          deviceId: "atlas",
          host: "192.168.10.10",
          port: 8080,
          protocol: "http",
        })
        .services.some((service) => service.name === "Test HTTP"),
    ).toBe(true);
    const alertId = store
      .snapshot()
      .alerts.find((alert) => alert.status === "active")?.id;
    expect(alertId).toBeTruthy();
    expect(
      store
        .setAlertStatus(alertId!, "acknowledged")
        .alerts.find((alert) => alert.id === alertId)?.status,
    ).toBe("acknowledged");
    expect(
      store
        .saveNote({
          title: "Test note",
          content: "# Verified",
          tags: [],
          linkedDeviceIds: [],
          linkedServiceIds: [],
        })
        .notes.some((note) => note.title === "Test note"),
    ).toBe(true);
    expect(
      store
        .saveInventory({
          name: "Test cable",
          category: "Cable",
          manufacturer: "",
          model: "",
          serialNumber: "",
          status: "spare",
          location: "Bin",
          notes: "",
          tags: [],
          assignedDeviceId: null,
        })
        .inventory.some((item) => item.name === "Test cable"),
    ).toBe(true);
    expect(
      store.resetDemo().notes.some((note) => note.title === "Test note"),
    ).toBe(false);
    store.close();
  });

  it("records maintenance notification suppression in the activity history", () => {
    const directory = mkdtempSync(join(tmpdir(), "homelab-commander-"));
    directories.push(directory);
    const path = join(directory, "test.db");
    const store = new AppStore(path, true);
    const service = store.snapshot().services.find(({ id }) => id === "pihole");
    expect(service).toBeTruthy();
    const transition = recordServiceCheck(
      service!,
      {
        ok: false,
        kind: "http",
        latencyMs: null,
        message: "Planned service restart",
        observed: ["No response"],
        likelyExplanation: "Maintenance",
        recommendation: "Wait for the maintenance window to end.",
      },
      {
        id: "maintenance-test",
        name: "DNS upgrade",
        startsAt: "2026-09-09T11:00:00.000Z",
        endsAt: "2026-09-09T13:00:00.000Z",
        createdAt: "2026-09-08T12:00:00.000Z",
      },
      path,
    );
    expect(transition.notificationSuppressed).toBe(true);
    expect(
      store
        .snapshot()
        .events.find((event) =>
          event.message.includes("outbound notification suppressed"),
        )?.metadata,
    ).toMatchObject({
      maintenanceWindowId: "maintenance-test",
      notificationSuppressed: true,
    });
    store.close();
  });
});
