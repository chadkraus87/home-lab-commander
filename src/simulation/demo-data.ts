import type {
  AlertRecord,
  AppSnapshot,
  ConnectionRecord,
  ContainerRecord,
  Device,
  DeviceMetrics,
  DeviceType,
  EventRecord,
  InventoryItem,
  LabNote,
  MetricPoint,
  MonitoredService,
  NetworkInterface,
} from "@/domain/types";
import { mulberry32, seededBetween } from "@/simulation/random";

interface DemoDeviceInput {
  id: string;
  name: string;
  hostname: string;
  type: DeviceType;
  ip: string;
  mac: string;
  vendor: string;
  model: string;
  os: string;
  architecture: string;
  location: string;
  description: string;
  status?: Device["status"];
  favorite?: boolean;
  tags?: string[];
  metrics: DeviceMetrics;
  uptimeSeconds: number;
  latencyMs: number;
  seed: number;
  speedMbps?: number;
}

export function createDemoSnapshot(now = new Date()): AppSnapshot {
  const isoNow = now.toISOString();
  const devices = demoDevices(now);
  return {
    devices,
    services: demoServices(isoNow),
    containers: demoContainers(isoNow),
    alerts: demoAlerts(now),
    events: demoEvents(now),
    networks: [
      {
        id: "network-lab",
        name: "Lab LAN",
        cidr: "192.168.10.0/24",
        vlan: 10,
        gateway: "192.168.10.1",
        dns: ["192.168.10.53", "1.1.1.1"],
        description: "Primary trusted homelab network",
        approved: true,
      },
      {
        id: "network-iot",
        name: "IoT VLAN",
        cidr: "192.168.20.0/24",
        vlan: 20,
        gateway: "192.168.20.1",
        dns: ["192.168.10.53"],
        description: "Isolated smart-device network",
        approved: true,
      },
    ],
    connections: demoConnections(),
    inventory: demoInventory(now),
    notes: demoNotes(now),
    settings: {
      applicationName: "HomeLab Commander",
      mode: "demo",
      theme: "dark",
      refreshSeconds: 4,
      timezone: "America/Chicago",
      units: "metric",
      retentionDays: 30,
      approvedCidrs: ["192.168.10.0/24", "192.168.20.0/24"],
      discoveryMethod: "passive",
      density: "comfortable",
    },
    generatedAt: isoNow,
  };
}

function demoDevices(now: Date): Device[] {
  return [
    makeDevice(
      {
        id: "gateway",
        name: "Gateway Router",
        hostname: "gateway.lab",
        type: "router",
        ip: "192.168.10.1",
        mac: "B8:27:EB:10:00:01",
        vendor: "Protectli",
        model: "VP2410",
        os: "OPNsense 26.1",
        architecture: "x86_64",
        location: "Rack · U1",
        description: "Firewall, inter-VLAN routing, and WAN gateway",
        favorite: true,
        tags: ["core", "network"],
        metrics: {
          cpu: 18,
          memory: 42,
          disk: 31,
          temperature: 48,
          networkRx: 84,
          networkTx: 31,
        },
        uptimeSeconds: 3_729_812,
        latencyMs: 0.8,
        seed: 11,
        speedMbps: 2500,
      },
      now,
    ),
    makeDevice(
      {
        id: "switch",
        name: "Managed Switch",
        hostname: "switch-core.lab",
        type: "switch",
        ip: "192.168.10.2",
        mac: "FC:EC:DA:10:00:02",
        vendor: "MikroTik",
        model: "CSS610-8G-2S+",
        os: "SwOS 2.18",
        architecture: "ARM",
        location: "Rack · U2",
        description: "Core 10-port managed switch",
        tags: ["core", "network"],
        metrics: {
          cpu: 9,
          memory: 29,
          disk: 12,
          temperature: 44,
          networkRx: 196,
          networkTx: 142,
        },
        uptimeSeconds: 5_102_011,
        latencyMs: 0.5,
        seed: 22,
        speedMbps: 10_000,
      },
      now,
    ),
    makeDevice(
      {
        id: "atlas",
        name: "Atlas Server",
        hostname: "atlas.lab",
        type: "container-host",
        ip: "192.168.10.10",
        mac: "3C:52:82:10:00:10",
        vendor: "Lenovo",
        model: "ThinkCentre M920q",
        os: "Ubuntu Server 26.04 LTS",
        architecture: "x86_64",
        location: "Rack · Shelf A",
        description: "Primary Docker and local AI host",
        favorite: true,
        tags: ["compute", "docker", "ai"],
        metrics: {
          cpu: 61,
          memory: 73,
          disk: 64,
          temperature: 66,
          networkRx: 52,
          networkTx: 19,
        },
        uptimeSeconds: 1_482_804,
        latencyMs: 1.2,
        seed: 33,
        speedMbps: 2500,
      },
      now,
    ),
    makeDevice(
      {
        id: "pi-dns",
        name: "Raspberry Pi DNS",
        hostname: "pi-dns.lab",
        type: "raspberry-pi",
        ip: "192.168.10.53",
        mac: "DC:A6:32:10:00:53",
        vendor: "Raspberry Pi",
        model: "Raspberry Pi 5 8GB",
        os: "Raspberry Pi OS 13",
        architecture: "aarch64",
        location: "Rack · Shelf B",
        description: "Pi-hole and recursive DNS resolver",
        favorite: true,
        tags: ["dns", "raspberry-pi"],
        metrics: {
          cpu: 24,
          memory: 36,
          disk: 48,
          temperature: 55,
          networkRx: 7,
          networkTx: 5,
        },
        uptimeSeconds: 2_820_332,
        latencyMs: 1.4,
        seed: 44,
        speedMbps: 1000,
      },
      now,
    ),
    makeDevice(
      {
        id: "nas",
        name: "Archive NAS",
        hostname: "archive.lab",
        type: "nas",
        ip: "192.168.10.20",
        mac: "00:11:32:10:00:20",
        vendor: "Synology",
        model: "DS923+",
        os: "DSM 8.0",
        architecture: "x86_64",
        location: "Rack · Shelf C",
        description: "Backups, media, and project archives",
        status: "degraded",
        tags: ["storage", "backup"],
        metrics: {
          cpu: 31,
          memory: 58,
          disk: 87,
          temperature: 51,
          networkRx: 128,
          networkTx: 207,
        },
        uptimeSeconds: 4_982_113,
        latencyMs: 2.1,
        seed: 55,
        speedMbps: 2500,
      },
      now,
    ),
    makeDevice(
      {
        id: "mac-studio",
        name: "Mac Studio",
        hostname: "mac-studio.lab",
        type: "workstation",
        ip: "192.168.10.31",
        mac: "A4:83:E7:10:00:31",
        vendor: "Apple",
        model: "Mac Studio",
        os: "macOS 27",
        architecture: "arm64",
        location: "Office",
        description: "Primary development workstation",
        favorite: true,
        tags: ["workstation", "development"],
        metrics: {
          cpu: 37,
          memory: 62,
          disk: 53,
          temperature: 46,
          networkRx: 18,
          networkTx: 11,
        },
        uptimeSeconds: 388_203,
        latencyMs: 1.8,
        seed: 66,
        speedMbps: 10_000,
      },
      now,
    ),
    makeDevice(
      {
        id: "ap",
        name: "Wi-Fi Access Point",
        hostname: "ap-office.lab",
        type: "access-point",
        ip: "192.168.10.3",
        mac: "78:8A:20:10:00:03",
        vendor: "Ubiquiti",
        model: "U7 Pro",
        os: "UniFi OS 5.2",
        architecture: "ARM64",
        location: "Office ceiling",
        description: "Primary Wi-Fi 7 access point",
        tags: ["network", "wireless"],
        metrics: {
          cpu: 21,
          memory: 39,
          disk: 8,
          temperature: 49,
          networkRx: 93,
          networkTx: 154,
        },
        uptimeSeconds: 2_071_042,
        latencyMs: 1.1,
        seed: 77,
        speedMbps: 2500,
      },
      now,
    ),
    makeDevice(
      {
        id: "laptop",
        name: "Lab Laptop",
        hostname: "labbook.lab",
        type: "laptop",
        ip: "192.168.10.42",
        mac: "9C:B6:D0:10:00:42",
        vendor: "Framework",
        model: "Laptop 13",
        os: "Fedora 44",
        architecture: "x86_64",
        location: "Mobile",
        description: "Portable Linux administration workstation",
        tags: ["wireless", "admin"],
        metrics: {
          cpu: 14,
          memory: 47,
          disk: 41,
          temperature: 43,
          networkRx: 4,
          networkTx: 2,
        },
        uptimeSeconds: 68_112,
        latencyMs: 4.2,
        seed: 88,
        speedMbps: 1200,
      },
      now,
    ),
    makeDevice(
      {
        id: "sensor",
        name: "Rack Sensor",
        hostname: "rack-sensor.iot",
        type: "iot",
        ip: "192.168.20.15",
        mac: "24:6F:28:20:00:15",
        vendor: "Espressif",
        model: "ESP32-S3",
        os: "ESPHome 2026.7",
        architecture: "Xtensa",
        location: "Rack · Rear",
        description: "Rack temperature and humidity sensor",
        tags: ["iot", "sensor"],
        metrics: {
          cpu: 6,
          memory: 18,
          disk: 4,
          temperature: 29,
          networkRx: 0.2,
          networkTx: 0.1,
        },
        uptimeSeconds: 732_412,
        latencyMs: 8.4,
        seed: 99,
        speedMbps: 72,
      },
      now,
    ),
  ];
}

function makeDevice(input: DemoDeviceInput, now: Date): Device {
  const status = input.status ?? "healthy";
  const lastSeen = new Date(
    now.getTime() - (status === "offline" ? 420_000 : 2_000),
  ).toISOString();
  const interfaceRecord: NetworkInterface = {
    id: `interface-${input.id}`,
    deviceId: input.id,
    name: input.type === "laptop" || input.type === "iot" ? "wlan0" : "eth0",
    mac: input.mac,
    ipv4: input.ip,
    ipv6: input.type === "router" ? "fd10::1" : null,
    subnet: input.ip.startsWith("192.168.20")
      ? "192.168.20.0/24"
      : "192.168.10.0/24",
    gateway:
      input.type === "router"
        ? null
        : input.ip.startsWith("192.168.20")
          ? "192.168.20.1"
          : "192.168.10.1",
    speedMbps: input.speedMbps ?? 1000,
    state: status === "offline" ? "down" : "up",
  };
  return {
    id: input.id,
    hostname: input.hostname,
    displayName: input.name,
    description: input.description,
    type: input.type,
    vendor: input.vendor,
    model: input.model,
    operatingSystem: input.os,
    architecture: input.architecture,
    primaryIp: input.ip,
    macAddress: input.mac,
    status,
    lastSeen,
    firstSeen: new Date(now.getTime() - 120 * 86_400_000).toISOString(),
    location: input.location,
    tags: input.tags ?? [],
    notes: "",
    isFavorite: input.favorite ?? false,
    source: "demo",
    createdAt: new Date(now.getTime() - 120 * 86_400_000).toISOString(),
    updatedAt: lastSeen,
    uptimeSeconds: input.uptimeSeconds,
    latencyMs: input.latencyMs,
    metrics: input.metrics,
    metricHistory: createMetricHistory(
      now,
      input.metrics,
      input.latencyMs,
      input.seed,
    ),
    interfaces: [interfaceRecord],
  };
}

function createMetricHistory(
  now: Date,
  baseline: DeviceMetrics,
  latency: number,
  seed: number,
): MetricPoint[] {
  const random = mulberry32(seed);
  return Array.from({ length: 96 }, (_, index) => {
    const wave = Math.sin((index + seed) / 7);
    const timestamp = new Date(
      now.getTime() - (95 - index) * 15 * 60_000,
    ).toISOString();
    return {
      timestamp,
      cpu: clamp(baseline.cpu + wave * 9 + seededBetween(random, -4, 4)),
      memory: clamp(baseline.memory + wave * 3 + seededBetween(random, -2, 2)),
      disk: clamp(baseline.disk + seededBetween(random, -0.4, 0.4)),
      temperature:
        baseline.temperature === null
          ? null
          : baseline.temperature + wave * 2 + seededBetween(random, -1.2, 1.2),
      networkRx: Math.max(
        0,
        baseline.networkRx +
          wave * baseline.networkRx * 0.35 +
          seededBetween(random, -4, 4),
      ),
      networkTx: Math.max(
        0,
        baseline.networkTx -
          wave * baseline.networkTx * 0.3 +
          seededBetween(random, -3, 3),
      ),
      latency: Math.max(0.2, latency + seededBetween(random, -0.6, 0.8)),
    };
  });
}

function demoServices(now: string): MonitoredService[] {
  return [
    service(
      "home-assistant",
      "atlas",
      "Home Assistant",
      "automation",
      "192.168.10.10",
      8123,
      "http",
      "healthy",
      34,
      99.98,
      now,
    ),
    service(
      "ollama",
      "atlas",
      "Ollama",
      "local-ai",
      "192.168.10.10",
      11434,
      "http",
      "degraded",
      684,
      99.72,
      now,
    ),
    service(
      "postgres",
      "atlas",
      "PostgreSQL",
      "database",
      "192.168.10.10",
      5432,
      "tcp",
      "healthy",
      8,
      99.99,
      now,
    ),
    service(
      "nginx",
      "atlas",
      "nginx Proxy",
      "reverse-proxy",
      "192.168.10.10",
      443,
      "https",
      "healthy",
      19,
      99.97,
      now,
    ),
    service(
      "pihole",
      "pi-dns",
      "Pi-hole",
      "dns",
      "192.168.10.53",
      53,
      "dns",
      "healthy",
      5,
      100,
      now,
    ),
    service(
      "nas-smb",
      "nas",
      "NAS File Service",
      "storage",
      "192.168.10.20",
      445,
      "tcp",
      "healthy",
      13,
      99.96,
      now,
    ),
    service(
      "grafana",
      "atlas",
      "Grafana",
      "monitoring",
      "192.168.10.10",
      3001,
      "http",
      "healthy",
      42,
      99.93,
      now,
    ),
  ];
}

function service(
  id: string,
  deviceId: string,
  name: string,
  type: string,
  host: string,
  port: number,
  protocol: MonitoredService["protocol"],
  status: MonitoredService["status"],
  responseTimeMs: number,
  uptimePercent: number,
  now: string,
): MonitoredService {
  return {
    id,
    deviceId,
    name,
    type,
    host,
    port,
    protocol,
    url:
      protocol === "http" || protocol === "https"
        ? `${protocol}://${host}:${port}`
        : null,
    status,
    responseTimeMs,
    uptimePercent,
    lastChecked: now,
    healthCheck: `${protocol.toUpperCase()} ${host}:${port}`,
    source: "demo",
  };
}

function demoContainers(now: string): ContainerRecord[] {
  return [
    container(
      "ctr-home-assistant",
      "home-assistant",
      "ghcr.io/home-assistant/home-assistant:2026.8",
      "running",
      ["8123:8123"],
      1,
      7.8,
      512,
      now,
    ),
    container(
      "ctr-ollama",
      "ollama",
      "ollama/ollama:0.12",
      "running",
      ["11434:11434"],
      2,
      38.2,
      6190,
      now,
    ),
    container(
      "ctr-postgres",
      "postgres",
      "postgres:18-alpine",
      "running",
      ["5432:5432"],
      0,
      4.1,
      834,
      now,
    ),
    container(
      "ctr-nginx",
      "nginx",
      "nginx:1.29-alpine",
      "running",
      ["80:80", "443:443"],
      0,
      1.4,
      96,
      now,
    ),
    container(
      "ctr-grafana",
      "grafana",
      "grafana/grafana:12.2",
      "unhealthy",
      ["3001:3000"],
      6,
      2.9,
      372,
      now,
    ),
  ];
}

function container(
  id: string,
  name: string,
  image: string,
  state: ContainerRecord["state"],
  ports: string[],
  restarts: number,
  cpu: number,
  memory: number,
  now: string,
): ContainerRecord {
  return {
    id,
    hostDeviceId: "atlas",
    containerId: id.replace("ctr-", "d3m0-"),
    name,
    image,
    state,
    status: state === "running" ? "Up 17 days" : "Up 12 minutes (unhealthy)",
    ports,
    createdAt: new Date(Date.parse(now) - 90 * 86_400_000).toISOString(),
    restartCount: restarts,
    cpu,
    memory,
    uptimeSeconds: state === "running" ? 1_482_804 : 720,
    source: "demo",
  };
}

function demoAlerts(now: Date): AlertRecord[] {
  return [
    alert(
      "alert-storage",
      "disk:nas",
      "warning",
      "capacity",
      "nas",
      "NAS storage is 87% full",
      "Available capacity has fallen below the configured 15% reserve.",
      "active",
      minutesAgo(now, 26),
    ),
    alert(
      "alert-ollama",
      "service-latency:ollama",
      "warning",
      "service",
      "atlas",
      "Ollama response time elevated",
      "Median response time has exceeded 500 ms for five minutes.",
      "active",
      minutesAgo(now, 8),
    ),
    alert(
      "alert-grafana",
      "container-unhealthy:ctr-grafana",
      "warning",
      "container",
      "atlas",
      "Grafana container is unhealthy",
      "The container health check has failed three consecutive times.",
      "acknowledged",
      minutesAgo(now, 18),
    ),
    alert(
      "alert-backup",
      "backup-complete:nas",
      "info",
      "backup",
      "nas",
      "Nightly backup completed",
      "2.1 TB verified with no integrity errors.",
      "resolved",
      minutesAgo(now, 310),
    ),
  ];
}

function alert(
  id: string,
  fingerprint: string,
  severity: AlertRecord["severity"],
  category: string,
  deviceId: string,
  title: string,
  description: string,
  status: AlertRecord["status"],
  timestamp: string,
): AlertRecord {
  return {
    id,
    fingerprint,
    severity,
    category,
    deviceId,
    sourceId: deviceId,
    title,
    description,
    status,
    firstTriggered: timestamp,
    lastTriggered: timestamp,
    acknowledgedAt: status === "acknowledged" ? timestamp : null,
    resolvedAt: status === "resolved" ? timestamp : null,
  };
}

function demoEvents(now: Date): EventRecord[] {
  const events: Array<
    [
      string,
      string | null,
      string,
      EventRecord["severity"],
      string,
      string,
      number,
    ]
  > = [
    [
      "event-1",
      "pi-dns",
      "service.recovered",
      "info",
      "health-check",
      "Pi-hole DNS check recovered",
      3,
    ],
    [
      "event-2",
      "atlas",
      "service.latency",
      "warning",
      "monitor",
      "Ollama response time exceeded 500 ms",
      8,
    ],
    [
      "event-3",
      "atlas",
      "container.health",
      "warning",
      "docker",
      "Grafana container health check failed",
      18,
    ],
    [
      "event-4",
      "nas",
      "metric.threshold",
      "warning",
      "collector",
      "Archive NAS crossed the 85% storage threshold",
      26,
    ],
    [
      "event-5",
      "laptop",
      "device.online",
      "info",
      "discovery",
      "Lab Laptop came online",
      42,
    ],
    [
      "event-6",
      "atlas",
      "container.restart",
      "info",
      "docker",
      "Home Assistant container restarted after upgrade",
      74,
    ],
    [
      "event-7",
      "sensor",
      "device.discovered",
      "info",
      "discovery",
      "New device discovered at 192.168.20.15",
      103,
    ],
    [
      "event-8",
      "gateway",
      "network.wan",
      "warning",
      "monitor",
      "WAN latency briefly exceeded 80 ms",
      147,
    ],
    [
      "event-9",
      "gateway",
      "network.wan",
      "info",
      "monitor",
      "WAN latency returned to normal",
      151,
    ],
    [
      "event-10",
      "nas",
      "backup.complete",
      "info",
      "backup",
      "Nightly backup completed and verified",
      310,
    ],
  ];
  return events.map(
    ([id, deviceId, eventType, severity, source, message, minutes]) => ({
      id,
      deviceId,
      eventType,
      severity,
      source,
      message,
      metadata: {},
      timestamp: minutesAgo(now, minutes),
    }),
  );
}

function demoConnections(): ConnectionRecord[] {
  return [
    connection("link-gateway-switch", "gateway", "switch", "ethernet", 0.4),
    connection("link-switch-atlas", "switch", "atlas", "ethernet", 0.7),
    connection("link-switch-pi", "switch", "pi-dns", "ethernet", 0.9),
    connection("link-switch-nas", "switch", "nas", "ethernet", 1.3, "degraded"),
    connection("link-switch-mac", "switch", "mac-studio", "ethernet", 0.8),
    connection("link-switch-ap", "switch", "ap", "ethernet", 0.6),
    connection("link-ap-laptop", "ap", "laptop", "wifi", 3.1),
    connection("link-ap-sensor", "ap", "sensor", "wifi", 7.2),
  ];
}

function connection(
  id: string,
  sourceDeviceId: string,
  targetDeviceId: string,
  connectionType: ConnectionRecord["connectionType"],
  latencyMs: number,
  status: ConnectionRecord["status"] = "healthy",
): ConnectionRecord {
  return {
    id,
    sourceDeviceId,
    targetDeviceId,
    networkId: targetDeviceId === "sensor" ? "network-iot" : "network-lab",
    interfaceName: connectionType === "wifi" ? "wlan0" : "eth0",
    connectionType,
    latencyMs,
    status,
  };
}

function demoInventory(now: Date): InventoryItem[] {
  return [
    inventory(
      "inventory-1",
      "Atlas mini PC",
      "Computer",
      "Lenovo",
      "ThinkCentre M920q",
      "PC2-ATLAS-014",
      "in-use",
      "Rack · Shelf A",
      "atlas",
      ["compute", "docker"],
      now,
    ),
    inventory(
      "inventory-2",
      "NAS drive 1",
      "Drive",
      "Seagate",
      "IronWolf Pro 12TB",
      "ZTN0A12B",
      "in-use",
      "Archive NAS",
      "nas",
      ["storage"],
      now,
    ),
    inventory(
      "inventory-3",
      "Raspberry Pi 5",
      "Single-board computer",
      "Raspberry Pi",
      "Pi 5 8GB",
      "10000000ABC053",
      "in-use",
      "Rack · Shelf B",
      "pi-dns",
      ["arm", "dns"],
      now,
    ),
    inventory(
      "inventory-4",
      "2.5 GbE adapter",
      "Network adapter",
      "Sabrent",
      "NT-SS5G",
      "SA25-8821",
      "spare",
      "Parts drawer A",
      null,
      ["network", "usb-c"],
      now,
    ),
    inventory(
      "inventory-5",
      "UPS battery backup",
      "UPS",
      "APC",
      "BR1500MS2",
      "3B2618X00011",
      "in-use",
      "Rack floor",
      null,
      ["power"],
      now,
    ),
    inventory(
      "inventory-6",
      "Cat6 patch cable · 1m",
      "Cable",
      "Monoprice",
      "SlimRun Cat6",
      "",
      "spare",
      "Cable bin",
      null,
      ["network", "cable"],
      now,
    ),
  ];
}

function inventory(
  id: string,
  name: string,
  category: string,
  manufacturer: string,
  model: string,
  serialNumber: string,
  status: InventoryItem["status"],
  location: string,
  assignedDeviceId: string | null,
  tags: string[],
  now: Date,
): InventoryItem {
  const createdAt = new Date(now.getTime() - 100 * 86_400_000).toISOString();
  return {
    id,
    name,
    category,
    manufacturer,
    model,
    serialNumber,
    purchaseDate: new Date(now.getTime() - 180 * 86_400_000)
      .toISOString()
      .slice(0, 10),
    purchasePrice: null,
    warrantyExpiration: null,
    status,
    location,
    assignedDeviceId,
    notes: "",
    tags,
    createdAt,
    updatedAt: createdAt,
  };
}

function demoNotes(now: Date): LabNote[] {
  return [
    note(
      "note-1",
      "Atlas recovery checklist",
      "# Atlas recovery checklist\n\n1. Confirm the host answers on `192.168.10.10`.\n2. Check Docker daemon health.\n3. Verify the reverse proxy before dependent services.\n4. Record the observed symptom before restarting anything.\n\n> Prefer evidence-driven recovery. A restart can erase useful diagnostic state.",
      ["runbook", "atlas"],
      ["atlas"],
      ["nginx"],
      now,
      12,
    ),
    note(
      "note-2",
      "Network addressing plan",
      "# Lab addressing\n\n| Range | Purpose |\n| --- | --- |\n| `192.168.10.1–9` | Network infrastructure |\n| `192.168.10.10–29` | Servers and storage |\n| `192.168.10.30–79` | Workstations and clients |\n| `192.168.20.0/24` | Isolated IoT devices |\n\nStatic assignments are recorded in the router and mirrored here.",
      ["network", "reference"],
      ["gateway", "switch"],
      [],
      now,
      42,
    ),
    note(
      "note-3",
      "Quarterly maintenance",
      "# Quarterly maintenance\n\n- Export HomeLab Commander data\n- Test restore of one NAS backup\n- Review disk SMART reports\n- Apply staged firmware updates\n- Remove unused container images\n- Verify UPS self-test\n",
      ["maintenance", "checklist"],
      ["nas"],
      [],
      now,
      115,
    ),
  ];
}

function note(
  id: string,
  title: string,
  content: string,
  tags: string[],
  linkedDeviceIds: string[],
  linkedServiceIds: string[],
  now: Date,
  daysAgo: number,
): LabNote {
  const updatedAt = new Date(
    now.getTime() - daysAgo * 86_400_000,
  ).toISOString();
  return {
    id,
    title,
    content,
    tags,
    linkedDeviceIds,
    linkedServiceIds,
    createdAt: updatedAt,
    updatedAt,
  };
}

function minutesAgo(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

function clamp(value: number): number {
  return Math.min(99.9, Math.max(0, value));
}
