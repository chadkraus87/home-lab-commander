import "server-only";

import type { DatabaseSync } from "node:sqlite";
import type { AppSnapshot, MetricPoint } from "@/domain/types";

const metricTypes: Array<{
  key: keyof Omit<MetricPoint, "timestamp">;
  unit: string;
}> = [
  { key: "cpu", unit: "%" },
  { key: "memory", unit: "%" },
  { key: "disk", unit: "%" },
  { key: "temperature", unit: "°C" },
  { key: "networkRx", unit: "Mbps" },
  { key: "networkTx", unit: "Mbps" },
  { key: "latency", unit: "ms" },
];

export function seedDatabase(
  database: DatabaseSync,
  snapshot: AppSnapshot,
  clear = false,
): void {
  database.exec("BEGIN IMMEDIATE");
  try {
    if (clear) {
      for (const table of [
        "metrics",
        "metric_rollups",
        "network_interfaces",
        "containers",
        "services",
        "alerts",
        "events",
        "connections",
        "inventory_items",
        "lab_notes",
        "networks",
        "devices",
        "application_settings",
      ]) {
        database.exec(`DELETE FROM ${table}`);
      }
    }
    insertDevices(database, snapshot);
    insertCollections(database, snapshot);
    database
      .prepare(
        "INSERT OR REPLACE INTO application_settings (key, value_json, updated_at) VALUES ('settings', ?, ?)",
      )
      .run(JSON.stringify(snapshot.settings), new Date().toISOString());
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function insertDevices(database: DatabaseSync, snapshot: AppSnapshot): void {
  const insertDevice = database.prepare(
    "INSERT OR REPLACE INTO devices (id, hostname, display_name, description, device_type, vendor, model, operating_system, architecture, primary_ip, mac_address, status, last_seen, first_seen, location, tags_json, notes, is_favorite, source, created_at, updated_at, uptime_seconds, latency_ms, metrics_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertInterface = database.prepare(
    "INSERT OR REPLACE INTO network_interfaces (id, device_id, name, mac, ipv4, ipv6, subnet, gateway, speed_mbps, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertMetric = database.prepare(
    "INSERT INTO metrics (device_id, metric_type, value, unit, timestamp) VALUES (?, ?, ?, ?, ?)",
  );
  for (const device of snapshot.devices) {
    insertDevice.run(
      device.id,
      device.hostname,
      device.displayName,
      device.description,
      device.type,
      device.vendor,
      device.model,
      device.operatingSystem,
      device.architecture,
      device.primaryIp,
      device.macAddress,
      device.status,
      device.lastSeen,
      device.firstSeen,
      device.location,
      JSON.stringify(device.tags),
      device.notes,
      device.isFavorite ? 1 : 0,
      device.source,
      device.createdAt,
      device.updatedAt,
      device.uptimeSeconds,
      device.latencyMs,
      JSON.stringify(device.metrics),
    );
    for (const item of device.interfaces)
      insertInterface.run(
        item.id,
        item.deviceId,
        item.name,
        item.mac,
        item.ipv4,
        item.ipv6,
        item.subnet,
        item.gateway,
        item.speedMbps,
        item.state,
      );
    for (const point of device.metricHistory) {
      for (const metric of metricTypes) {
        const value = point[metric.key];
        if (value !== null)
          insertMetric.run(
            device.id,
            metric.key,
            value,
            metric.unit,
            point.timestamp,
          );
      }
    }
  }
}

function insertCollections(
  database: DatabaseSync,
  snapshot: AppSnapshot,
): void {
  const insertService = database.prepare(
    "INSERT OR REPLACE INTO services (id, device_id, name, type, host, port, protocol, url, status, response_time_ms, uptime_percent, last_checked, health_check, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const item of snapshot.services)
    insertService.run(
      item.id,
      item.deviceId,
      item.name,
      item.type,
      item.host,
      item.port,
      item.protocol,
      item.url,
      item.status,
      item.responseTimeMs,
      item.uptimePercent,
      item.lastChecked,
      item.healthCheck,
      item.source,
    );

  const insertContainer = database.prepare(
    "INSERT OR REPLACE INTO containers (id, host_device_id, container_id, name, image, state, status, ports_json, created_at, restart_count, cpu, memory, uptime_seconds, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const item of snapshot.containers)
    insertContainer.run(
      item.id,
      item.hostDeviceId,
      item.containerId,
      item.name,
      item.image,
      item.state,
      item.status,
      JSON.stringify(item.ports),
      item.createdAt,
      item.restartCount,
      item.cpu,
      item.memory,
      item.uptimeSeconds,
      item.source,
    );

  const insertAlert = database.prepare(
    "INSERT OR REPLACE INTO alerts (id, fingerprint, severity, category, device_id, source_id, title, description, status, first_triggered, last_triggered, acknowledged_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const item of snapshot.alerts)
    insertAlert.run(
      item.id,
      item.fingerprint,
      item.severity,
      item.category,
      item.deviceId,
      item.sourceId,
      item.title,
      item.description,
      item.status,
      item.firstTriggered,
      item.lastTriggered,
      item.acknowledgedAt,
      item.resolvedAt,
    );

  const insertEvent = database.prepare(
    "INSERT OR REPLACE INTO events (id, device_id, event_type, severity, source, message, metadata_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const item of snapshot.events)
    insertEvent.run(
      item.id,
      item.deviceId,
      item.eventType,
      item.severity,
      item.source,
      item.message,
      JSON.stringify(item.metadata),
      item.timestamp,
    );

  const insertNetwork = database.prepare(
    "INSERT OR REPLACE INTO networks (id, name, cidr, vlan, gateway, dns_json, description, approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const item of snapshot.networks)
    insertNetwork.run(
      item.id,
      item.name,
      item.cidr,
      item.vlan,
      item.gateway,
      JSON.stringify(item.dns),
      item.description,
      item.approved ? 1 : 0,
    );

  const insertConnection = database.prepare(
    "INSERT OR REPLACE INTO connections (id, source_device_id, target_device_id, network_id, interface_name, connection_type, latency_ms, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const item of snapshot.connections)
    insertConnection.run(
      item.id,
      item.sourceDeviceId,
      item.targetDeviceId,
      item.networkId,
      item.interfaceName,
      item.connectionType,
      item.latencyMs,
      item.status,
    );

  const insertInventory = database.prepare(
    "INSERT OR REPLACE INTO inventory_items (id, name, category, manufacturer, model, serial_number, purchase_date, purchase_price, warranty_expiration, status, location, assigned_device_id, notes, tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const item of snapshot.inventory)
    insertInventory.run(
      item.id,
      item.name,
      item.category,
      item.manufacturer,
      item.model,
      item.serialNumber,
      item.purchaseDate,
      item.purchasePrice,
      item.warrantyExpiration,
      item.status,
      item.location,
      item.assignedDeviceId,
      item.notes,
      JSON.stringify(item.tags),
      item.createdAt,
      item.updatedAt,
    );

  const insertNote = database.prepare(
    "INSERT OR REPLACE INTO lab_notes (id, title, content, tags_json, linked_device_ids_json, linked_service_ids_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const item of snapshot.notes)
    insertNote.run(
      item.id,
      item.title,
      item.content,
      JSON.stringify(item.tags),
      JSON.stringify(item.linkedDeviceIds),
      JSON.stringify(item.linkedServiceIds),
      item.createdAt,
      item.updatedAt,
    );
}
