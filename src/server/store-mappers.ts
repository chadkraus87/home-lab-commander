import "server-only";

import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import type {
  AlertRecord,
  AppSettings,
  AppSnapshot,
  ConnectionRecord,
  ContainerRecord,
  Device,
  DeviceMetrics,
  EventRecord,
  InventoryItem,
  LabNote,
  MetricPoint,
  MonitoredService,
  NetworkInterface,
  NetworkRecord,
} from "@/domain/types";
import { createDemoSnapshot } from "@/simulation/demo-data";

type SqlRow = Record<string, SQLOutputValue>;

export function readSnapshot(database: DatabaseSync): AppSnapshot {
  const metricRows = database
    .prepare(
      "SELECT device_id, metric_type, value, timestamp FROM metrics UNION ALL SELECT device_id, metric_type, value_avg AS value, hour AS timestamp FROM metric_rollups ORDER BY timestamp ASC",
    )
    .all() as SqlRow[];
  const metricHistory = hydrateMetricHistory(metricRows);
  const interfaces = groupByDevice(
    (
      database
        .prepare("SELECT * FROM network_interfaces ORDER BY id")
        .all() as SqlRow[]
    ).map(mapInterface),
  );
  const devices = (
    database
      .prepare(
        "SELECT * FROM devices ORDER BY is_favorite DESC, display_name ASC",
      )
      .all() as SqlRow[]
  ).map((row) =>
    mapDevice(
      row,
      interfaces.get(asString(row.id)) ?? [],
      metricHistory.get(asString(row.id)) ?? [],
    ),
  );
  return {
    devices,
    services: (
      database
        .prepare("SELECT * FROM services ORDER BY name ASC")
        .all() as SqlRow[]
    ).map(mapService),
    containers: (
      database
        .prepare("SELECT * FROM containers ORDER BY state ASC, name ASC")
        .all() as SqlRow[]
    ).map(mapContainer),
    alerts: (
      database
        .prepare(
          "SELECT * FROM alerts ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, last_triggered DESC",
        )
        .all() as SqlRow[]
    ).map(mapAlert),
    events: (
      database
        .prepare("SELECT * FROM events ORDER BY timestamp DESC LIMIT 500")
        .all() as SqlRow[]
    ).map(mapEvent),
    networks: (
      database
        .prepare("SELECT * FROM networks ORDER BY vlan ASC")
        .all() as SqlRow[]
    ).map(mapNetwork),
    connections: (
      database
        .prepare("SELECT * FROM connections ORDER BY id")
        .all() as SqlRow[]
    ).map(mapConnection),
    inventory: (
      database
        .prepare("SELECT * FROM inventory_items ORDER BY status ASC, name ASC")
        .all() as SqlRow[]
    ).map(mapInventory),
    notes: (
      database
        .prepare("SELECT * FROM lab_notes ORDER BY updated_at DESC")
        .all() as SqlRow[]
    ).map(mapNote),
    settings: readSettings(database),
    generatedAt: new Date().toISOString(),
  };
}

function readSettings(database: DatabaseSync): AppSettings {
  const row = database
    .prepare(
      "SELECT value_json FROM application_settings WHERE key = 'settings'",
    )
    .get() as SqlRow | undefined;
  return row
    ? parseJson<AppSettings>(row.value_json, createDemoSnapshot().settings)
    : createDemoSnapshot().settings;
}

function mapDevice(
  row: SqlRow,
  interfaces: NetworkInterface[],
  metricHistory: MetricPoint[],
): Device {
  return {
    id: asString(row.id),
    hostname: asString(row.hostname),
    displayName: asString(row.display_name),
    description: asString(row.description),
    type: asString(row.device_type) as Device["type"],
    vendor: asString(row.vendor),
    model: asString(row.model),
    operatingSystem: asString(row.operating_system),
    architecture: asString(row.architecture),
    primaryIp: asString(row.primary_ip),
    macAddress: asString(row.mac_address),
    status: asString(row.status) as Device["status"],
    lastSeen: asString(row.last_seen),
    firstSeen: asString(row.first_seen),
    location: asString(row.location),
    tags: parseJson<string[]>(row.tags_json, []),
    notes: asString(row.notes),
    isFavorite: Number(row.is_favorite) === 1,
    source: asString(row.source) as Device["source"],
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    uptimeSeconds: Number(row.uptime_seconds),
    latencyMs: Number(row.latency_ms),
    metrics: parseJson<DeviceMetrics>(row.metrics_json, {
      cpu: 0,
      memory: 0,
      disk: 0,
      temperature: null,
      networkRx: 0,
      networkTx: 0,
    }),
    metricHistory,
    interfaces,
  };
}

function mapInterface(row: SqlRow): NetworkInterface {
  return {
    id: asString(row.id),
    deviceId: asString(row.device_id),
    name: asString(row.name),
    mac: asString(row.mac),
    ipv4: asString(row.ipv4),
    ipv6: nullableString(row.ipv6),
    subnet: asString(row.subnet),
    gateway: nullableString(row.gateway),
    speedMbps: Number(row.speed_mbps),
    state: asString(row.state) as NetworkInterface["state"],
  };
}

function mapService(row: SqlRow): MonitoredService {
  return {
    id: asString(row.id),
    deviceId: nullableString(row.device_id),
    name: asString(row.name),
    type: asString(row.type),
    host: asString(row.host),
    port: Number(row.port),
    protocol: asString(row.protocol) as MonitoredService["protocol"],
    url: nullableString(row.url),
    status: asString(row.status) as MonitoredService["status"],
    responseTimeMs: Number(row.response_time_ms),
    uptimePercent: Number(row.uptime_percent),
    lastChecked: asString(row.last_checked),
    healthCheck: asString(row.health_check),
    source: asString(row.source) as MonitoredService["source"],
  };
}

function mapContainer(row: SqlRow): ContainerRecord {
  return {
    id: asString(row.id),
    hostDeviceId: asString(row.host_device_id),
    containerId: asString(row.container_id),
    name: asString(row.name),
    image: asString(row.image),
    state: asString(row.state) as ContainerRecord["state"],
    status: asString(row.status),
    ports: parseJson<string[]>(row.ports_json, []),
    createdAt: asString(row.created_at),
    restartCount: Number(row.restart_count),
    cpu: Number(row.cpu),
    memory: Number(row.memory),
    uptimeSeconds: Number(row.uptime_seconds),
    source: asString(row.source) as ContainerRecord["source"],
  };
}

function mapAlert(row: SqlRow): AlertRecord {
  return {
    id: asString(row.id),
    fingerprint: asString(row.fingerprint),
    severity: asString(row.severity) as AlertRecord["severity"],
    category: asString(row.category),
    deviceId: nullableString(row.device_id),
    sourceId: nullableString(row.source_id),
    title: asString(row.title),
    description: asString(row.description),
    status: asString(row.status) as AlertRecord["status"],
    firstTriggered: asString(row.first_triggered),
    lastTriggered: asString(row.last_triggered),
    acknowledgedAt: nullableString(row.acknowledged_at),
    resolvedAt: nullableString(row.resolved_at),
  };
}

function mapEvent(row: SqlRow): EventRecord {
  return {
    id: asString(row.id),
    deviceId: nullableString(row.device_id),
    eventType: asString(row.event_type),
    severity: asString(row.severity) as EventRecord["severity"],
    source: asString(row.source),
    message: asString(row.message),
    metadata: parseJson<EventRecord["metadata"]>(row.metadata_json, {}),
    timestamp: asString(row.timestamp),
  };
}

function mapNetwork(row: SqlRow): NetworkRecord {
  return {
    id: asString(row.id),
    name: asString(row.name),
    cidr: asString(row.cidr),
    vlan: row.vlan === null ? null : Number(row.vlan),
    gateway: asString(row.gateway),
    dns: parseJson<string[]>(row.dns_json, []),
    description: asString(row.description),
    approved: Number(row.approved) === 1,
  };
}

function mapConnection(row: SqlRow): ConnectionRecord {
  return {
    id: asString(row.id),
    sourceDeviceId: asString(row.source_device_id),
    targetDeviceId: asString(row.target_device_id),
    networkId: asString(row.network_id),
    interfaceName: asString(row.interface_name),
    connectionType: asString(
      row.connection_type,
    ) as ConnectionRecord["connectionType"],
    latencyMs: Number(row.latency_ms),
    status: asString(row.status) as ConnectionRecord["status"],
  };
}

function mapInventory(row: SqlRow): InventoryItem {
  return {
    id: asString(row.id),
    name: asString(row.name),
    category: asString(row.category),
    manufacturer: asString(row.manufacturer),
    model: asString(row.model),
    serialNumber: asString(row.serial_number),
    purchaseDate: nullableString(row.purchase_date),
    purchasePrice:
      row.purchase_price === null ? null : Number(row.purchase_price),
    warrantyExpiration: nullableString(row.warranty_expiration),
    status: asString(row.status) as InventoryItem["status"],
    location: asString(row.location),
    assignedDeviceId: nullableString(row.assigned_device_id),
    notes: asString(row.notes),
    tags: parseJson<string[]>(row.tags_json, []),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

function mapNote(row: SqlRow): LabNote {
  return {
    id: asString(row.id),
    title: asString(row.title),
    content: asString(row.content),
    tags: parseJson<string[]>(row.tags_json, []),
    linkedDeviceIds: parseJson<string[]>(row.linked_device_ids_json, []),
    linkedServiceIds: parseJson<string[]>(row.linked_service_ids_json, []),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

function groupByDevice<T extends { deviceId: string }>(
  items: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items)
    groups.set(item.deviceId, [...(groups.get(item.deviceId) ?? []), item]);
  return groups;
}

function hydrateMetricHistory(rows: SqlRow[]): Map<string, MetricPoint[]> {
  const groups = new Map<string, Map<string, Partial<MetricPoint>>>();
  for (const row of rows) {
    const deviceId = asString(row.device_id);
    const timestamp = asString(row.timestamp);
    const byTime =
      groups.get(deviceId) ?? new Map<string, Partial<MetricPoint>>();
    const point = byTime.get(timestamp) ?? { timestamp };
    const key = asString(row.metric_type) as keyof Omit<
      MetricPoint,
      "timestamp"
    >;
    point[key] = Number(row.value);
    byTime.set(timestamp, point);
    groups.set(deviceId, byTime);
  }
  const result = new Map<string, MetricPoint[]>();
  for (const [deviceId, byTime] of groups) {
    result.set(
      deviceId,
      [...byTime.values()].map((point) => ({
        timestamp: point.timestamp ?? new Date(0).toISOString(),
        cpu: point.cpu ?? 0,
        memory: point.memory ?? 0,
        disk: point.disk ?? 0,
        temperature: point.temperature ?? null,
        networkRx: point.networkRx ?? 0,
        networkTx: point.networkTx ?? 0,
        latency: point.latency ?? 0,
      })),
    );
  }
  return result;
}

function parseJson<T>(value: SQLOutputValue | undefined, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asString(value: SQLOutputValue | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function nullableString(value: SQLOutputValue | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}
