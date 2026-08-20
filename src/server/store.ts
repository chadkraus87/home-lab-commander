import "server-only";

import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { z } from "zod";
import type { AppSnapshot, DeviceMetrics, EventRecord } from "@/domain/types";
import type {
  deviceInputSchema,
  inventoryInputSchema,
  noteInputSchema,
  serviceInputSchema,
  settingsInputSchema,
} from "@/domain/schemas";
import { createDemoSnapshot } from "@/simulation/demo-data";
import { openDatabase } from "@/server/database";
import { readSnapshot } from "@/server/store-mappers";
import { seedDatabase } from "@/server/seed-store";

type DeviceInput = z.infer<typeof deviceInputSchema>;
type ServiceInput = z.infer<typeof serviceInputSchema>;
type InventoryInput = z.infer<typeof inventoryInputSchema>;
type NoteInput = z.infer<typeof noteInputSchema>;
type SettingsInput = z.infer<typeof settingsInputSchema>;

export class AppStore {
  private readonly database: DatabaseSync;

  constructor(databasePath: string, seedWhenEmpty = true) {
    this.database = openDatabase(databasePath);
    const row = this.database
      .prepare("SELECT COUNT(*) AS count FROM devices")
      .get() as { count: number };
    if (seedWhenEmpty && Number(row.count) === 0)
      seedDatabase(this.database, createDemoSnapshot());
    this.compactMetrics(30);
  }

  close(): void {
    this.database.close();
  }

  snapshot(): AppSnapshot {
    return readSnapshot(this.database);
  }

  addDevice(input: DeviceInput): AppSnapshot {
    const now = new Date().toISOString();
    const id = `device-${randomUUID()}`;
    const metrics: DeviceMetrics = {
      cpu: 0,
      memory: 0,
      disk: 0,
      temperature: null,
      networkRx: 0,
      networkTx: 0,
    };
    try {
      this.database
        .prepare(
          `INSERT INTO devices (id, hostname, display_name, description, device_type, vendor, model, operating_system, architecture, primary_ip, mac_address, status, last_seen, first_seen, location, tags_json, notes, is_favorite, source, created_at, updated_at, uptime_seconds, latency_ms, metrics_json) VALUES (?, ?, ?, '', ?, 'Unknown', 'Unknown', 'Unknown', 'Unknown', ?, 'Unknown', 'unknown', ?, ?, ?, ?, '', 0, 'manual', ?, ?, 0, 0, ?)`,
        )
        .run(
          id,
          input.hostname,
          input.displayName,
          input.type,
          input.primaryIp,
          now,
          now,
          input.location,
          JSON.stringify(input.tags),
          now,
          now,
          JSON.stringify(metrics),
        );
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE"))
        throw new StoreError(
          "A device with that IP address already exists.",
          409,
        );
      throw error;
    }
    this.addEvent({
      deviceId: id,
      eventType: "device.added",
      severity: "info",
      source: "manual",
      message: `${input.displayName} was added manually`,
      metadata: { ip: input.primaryIp },
    });
    return this.snapshot();
  }

  addService(input: ServiceInput): AppSnapshot {
    const now = new Date().toISOString();
    const id = `service-${randomUUID()}`;
    const url =
      input.protocol === "http" || input.protocol === "https"
        ? `${input.protocol}://${input.host}:${input.port}`
        : null;
    this.database
      .prepare(
        "INSERT INTO services (id, device_id, name, type, host, port, protocol, url, status, response_time_ms, uptime_percent, last_checked, health_check, source) VALUES (?, ?, ?, 'custom', ?, ?, ?, ?, 'unknown', 0, 0, ?, ?, 'manual')",
      )
      .run(
        id,
        input.deviceId,
        input.name,
        input.host,
        input.port,
        input.protocol,
        url,
        now,
        `${input.protocol.toUpperCase()} ${input.host}:${input.port}`,
      );
    this.addEvent({
      deviceId: input.deviceId,
      eventType: "service.added",
      severity: "info",
      source: "manual",
      message: `${input.name} monitoring was configured`,
      metadata: { host: input.host, port: input.port },
    });
    return this.snapshot();
  }

  updateDevice(
    id: string,
    input: { notes: string; tags: string[]; isFavorite: boolean },
  ): AppSnapshot {
    const result = this.database
      .prepare(
        "UPDATE devices SET notes = ?, tags_json = ?, is_favorite = ?, updated_at = ? WHERE id = ?",
      )
      .run(
        input.notes,
        JSON.stringify(input.tags),
        input.isFavorite ? 1 : 0,
        new Date().toISOString(),
        id,
      );
    if (result.changes === 0) throw new StoreError("Device not found.", 404);
    return this.snapshot();
  }

  setAlertStatus(id: string, status: "acknowledged" | "resolved"): AppSnapshot {
    const now = new Date().toISOString();
    const column =
      status === "acknowledged" ? "acknowledged_at" : "resolved_at";
    const result = this.database
      .prepare(`UPDATE alerts SET status = ?, ${column} = ? WHERE id = ?`)
      .run(status, now, id);
    if (result.changes === 0) throw new StoreError("Alert not found.", 404);
    return this.snapshot();
  }

  saveInventory(input: InventoryInput, id?: string): AppSnapshot {
    const now = new Date().toISOString();
    if (id) {
      const result = this.database
        .prepare(
          "UPDATE inventory_items SET name = ?, category = ?, manufacturer = ?, model = ?, serial_number = ?, status = ?, location = ?, assigned_device_id = ?, notes = ?, tags_json = ?, updated_at = ? WHERE id = ?",
        )
        .run(
          input.name,
          input.category,
          input.manufacturer,
          input.model,
          input.serialNumber,
          input.status,
          input.location,
          input.assignedDeviceId,
          input.notes,
          JSON.stringify(input.tags),
          now,
          id,
        );
      if (result.changes === 0)
        throw new StoreError("Inventory item not found.", 404);
    } else {
      this.database
        .prepare(
          "INSERT INTO inventory_items (id, name, category, manufacturer, model, serial_number, purchase_date, purchase_price, warranty_expiration, status, location, assigned_device_id, notes, tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          `inventory-${randomUUID()}`,
          input.name,
          input.category,
          input.manufacturer,
          input.model,
          input.serialNumber,
          input.status,
          input.location,
          input.assignedDeviceId,
          input.notes,
          JSON.stringify(input.tags),
          now,
          now,
        );
    }
    return this.snapshot();
  }

  archiveInventory(id: string): AppSnapshot {
    const result = this.database
      .prepare(
        "UPDATE inventory_items SET status = 'archived', updated_at = ? WHERE id = ?",
      )
      .run(new Date().toISOString(), id);
    if (result.changes === 0)
      throw new StoreError("Inventory item not found.", 404);
    return this.snapshot();
  }

  saveNote(input: NoteInput, id?: string): AppSnapshot {
    const now = new Date().toISOString();
    if (id) {
      const result = this.database
        .prepare(
          "UPDATE lab_notes SET title = ?, content = ?, tags_json = ?, linked_device_ids_json = ?, linked_service_ids_json = ?, updated_at = ? WHERE id = ?",
        )
        .run(
          input.title,
          input.content,
          JSON.stringify(input.tags),
          JSON.stringify(input.linkedDeviceIds),
          JSON.stringify(input.linkedServiceIds),
          now,
          id,
        );
      if (result.changes === 0)
        throw new StoreError("Lab note not found.", 404);
    } else {
      this.database
        .prepare(
          "INSERT INTO lab_notes (id, title, content, tags_json, linked_device_ids_json, linked_service_ids_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          `note-${randomUUID()}`,
          input.title,
          input.content,
          JSON.stringify(input.tags),
          JSON.stringify(input.linkedDeviceIds),
          JSON.stringify(input.linkedServiceIds),
          now,
          now,
        );
    }
    return this.snapshot();
  }

  deleteNote(id: string): AppSnapshot {
    const result = this.database
      .prepare("DELETE FROM lab_notes WHERE id = ?")
      .run(id);
    if (result.changes === 0) throw new StoreError("Lab note not found.", 404);
    return this.snapshot();
  }

  updateSettings(settings: SettingsInput): AppSnapshot {
    this.database
      .prepare(
        "INSERT INTO application_settings (key, value_json, updated_at) VALUES ('settings', ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
      )
      .run(JSON.stringify(settings), new Date().toISOString());
    this.compactMetrics(settings.retentionDays);
    return this.snapshot();
  }

  resetDemo(): AppSnapshot {
    seedDatabase(this.database, createDemoSnapshot(), true);
    return this.snapshot();
  }

  replacePortableData(
    snapshot: Pick<
      AppSnapshot,
      "devices" | "services" | "inventory" | "notes" | "settings"
    >,
  ): AppSnapshot {
    const current = this.snapshot();
    seedDatabase(
      this.database,
      { ...current, ...snapshot, generatedAt: new Date().toISOString() },
      true,
    );
    return this.snapshot();
  }

  private addEvent(input: Omit<EventRecord, "id" | "timestamp">): void {
    this.database
      .prepare(
        "INSERT INTO events (id, device_id, event_type, severity, source, message, metadata_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        `event-${randomUUID()}`,
        input.deviceId,
        input.eventType,
        input.severity,
        input.source,
        input.message,
        JSON.stringify(input.metadata),
        new Date().toISOString(),
      );
  }

  private compactMetrics(retentionDays: number): void {
    const cutoff = new Date(
      Date.now() - retentionDays * 86_400_000,
    ).toISOString();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(
          "INSERT OR REPLACE INTO metric_rollups (device_id, metric_type, hour, value_min, value_max, value_avg, samples) SELECT device_id, metric_type, substr(timestamp, 1, 13) || ':00:00.000Z', MIN(value), MAX(value), AVG(value), COUNT(*) FROM metrics WHERE timestamp < ? GROUP BY device_id, metric_type, substr(timestamp, 1, 13)",
        )
        .run(cutoff);
      this.database
        .prepare("DELETE FROM metrics WHERE timestamp < ?")
        .run(cutoff);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

declare global {
  var homeLabStore: AppStore | undefined;
}

export function getStore(): AppStore {
  if (!globalThis.homeLabStore) {
    globalThis.homeLabStore = new AppStore(
      process.env.HOMELAB_DATABASE_PATH ??
        join(process.cwd(), "data", "homelab.db"),
    );
  }
  return globalThis.homeLabStore;
}
