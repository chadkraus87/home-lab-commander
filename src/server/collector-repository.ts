import "server-only";

import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { HealthCheckResult } from "@/domain/providers";
import type { MonitoredService } from "@/domain/types";
import { openDatabase } from "@/server/database";

export interface ServiceTransition {
  previous: MonitoredService["status"];
  current: MonitoredService["status"];
  newlyActive: boolean;
}

export function recordServiceCheck(
  service: MonitoredService,
  check: HealthCheckResult,
): ServiceTransition {
  const database = openDatabase(
    process.env.HOMELAB_DATABASE_PATH ??
      join(process.cwd(), "data", "homelab.db"),
  );
  const now = new Date().toISOString();
  const current: MonitoredService["status"] = check.ok ? "healthy" : "down";
  const previous = service.status;
  const fingerprint = `collector:service:${service.id}`;
  let newlyActive = false;
  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        "UPDATE services SET status = ?, response_time_ms = ?, last_checked = ? WHERE id = ?",
      )
      .run(current, check.latencyMs ?? 0, now, service.id);
    if (!check.ok) {
      const active = database
        .prepare(
          "SELECT id FROM alerts WHERE fingerprint = ? AND status != 'resolved'",
        )
        .get(fingerprint) as { id: string } | undefined;
      if (active) {
        database
          .prepare(
            "UPDATE alerts SET last_triggered = ?, description = ? WHERE id = ?",
          )
          .run(now, check.message, active.id);
      } else {
        newlyActive = true;
        database
          .prepare(
            "INSERT INTO alerts (id, fingerprint, severity, category, device_id, source_id, title, description, status, first_triggered, last_triggered, acknowledged_at, resolved_at) VALUES (?, ?, 'critical', 'service', ?, ?, ?, ?, 'active', ?, ?, NULL, NULL)",
          )
          .run(
            `alert-${randomUUID()}`,
            fingerprint,
            service.deviceId,
            service.id,
            `${service.name} is unavailable`,
            check.message,
            now,
            now,
          );
      }
    } else {
      database
        .prepare(
          "UPDATE alerts SET status = 'resolved', resolved_at = ?, last_triggered = ? WHERE fingerprint = ? AND status != 'resolved'",
        )
        .run(now, now, fingerprint);
    }
    if (previous !== current) {
      database
        .prepare(
          "INSERT INTO events (id, device_id, event_type, severity, source, message, metadata_json, timestamp) VALUES (?, ?, ?, ?, 'collector', ?, ?, ?)",
        )
        .run(
          `event-${randomUUID()}`,
          service.deviceId,
          check.ok ? "service.recovered" : "service.unavailable",
          check.ok ? "info" : "critical",
          check.ok
            ? `${service.name} recovered`
            : `${service.name} became unavailable`,
          JSON.stringify({ serviceId: service.id, automated: true }),
          now,
        );
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    database.close();
  }
  return { previous, current, newlyActive };
}
