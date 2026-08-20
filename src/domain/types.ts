export type EnvironmentMode = "demo" | "live";
export type HealthStatus = "healthy" | "degraded" | "offline" | "unknown";
export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown";
export type ContainerState = "running" | "stopped" | "unhealthy" | "paused";
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export type DeviceType =
  | "workstation"
  | "laptop"
  | "server"
  | "raspberry-pi"
  | "router"
  | "switch"
  | "access-point"
  | "nas"
  | "vm"
  | "container-host"
  | "iot"
  | "unknown";

export interface DeviceMetrics {
  cpu: number;
  memory: number;
  disk: number;
  temperature: number | null;
  networkRx: number;
  networkTx: number;
}

export interface MetricPoint extends DeviceMetrics {
  timestamp: string;
  latency: number;
}

export interface NetworkInterface {
  id: string;
  deviceId: string;
  name: string;
  mac: string;
  ipv4: string;
  ipv6: string | null;
  subnet: string;
  gateway: string | null;
  speedMbps: number;
  state: "up" | "down";
}

export interface Device {
  id: string;
  hostname: string;
  displayName: string;
  description: string;
  type: DeviceType;
  vendor: string;
  model: string;
  operatingSystem: string;
  architecture: string;
  primaryIp: string;
  macAddress: string;
  status: HealthStatus;
  lastSeen: string;
  firstSeen: string;
  location: string;
  tags: string[];
  notes: string;
  isFavorite: boolean;
  source: "demo" | "manual" | "discovery" | "docker";
  createdAt: string;
  updatedAt: string;
  uptimeSeconds: number;
  latencyMs: number;
  metrics: DeviceMetrics;
  metricHistory: MetricPoint[];
  interfaces: NetworkInterface[];
}

export interface MonitoredService {
  id: string;
  deviceId: string | null;
  name: string;
  type: string;
  host: string;
  port: number;
  protocol: "http" | "https" | "tcp" | "dns";
  url: string | null;
  status: ServiceStatus;
  responseTimeMs: number;
  uptimePercent: number;
  lastChecked: string;
  healthCheck: string;
  source: "demo" | "manual" | "docker";
}

export interface ContainerRecord {
  id: string;
  hostDeviceId: string;
  containerId: string;
  name: string;
  image: string;
  state: ContainerState;
  status: string;
  ports: string[];
  createdAt: string;
  restartCount: number;
  cpu: number;
  memory: number;
  uptimeSeconds: number;
  source: "demo" | "docker";
}

export interface AlertRecord {
  id: string;
  fingerprint: string;
  severity: AlertSeverity;
  category: string;
  deviceId: string | null;
  sourceId: string | null;
  title: string;
  description: string;
  status: AlertStatus;
  firstTriggered: string;
  lastTriggered: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface EventRecord {
  id: string;
  deviceId: string | null;
  eventType: string;
  severity: AlertSeverity;
  source: string;
  message: string;
  metadata: Record<string, string | number | boolean>;
  timestamp: string;
}

export interface NetworkRecord {
  id: string;
  name: string;
  cidr: string;
  vlan: number | null;
  gateway: string;
  dns: string[];
  description: string;
  approved: boolean;
}

export interface ConnectionRecord {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  networkId: string;
  interfaceName: string;
  connectionType: "ethernet" | "wifi" | "virtual" | "wan";
  latencyMs: number;
  status: HealthStatus;
}

export type InventoryStatus = "in-use" | "spare" | "maintenance" | "archived";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  purchaseDate: string | null;
  purchasePrice: number | null;
  warrantyExpiration: string | null;
  status: InventoryStatus;
  location: string;
  assignedDeviceId: string | null;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LabNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  linkedDeviceIds: string[];
  linkedServiceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  applicationName: string;
  mode: EnvironmentMode;
  theme: "system" | "dark" | "light";
  refreshSeconds: number;
  timezone: string;
  units: "metric" | "imperial";
  retentionDays: number;
  approvedCidrs: string[];
  discoveryMethod: "passive" | "ping";
  density: "comfortable" | "compact";
}

export interface AppSnapshot {
  hostedDemo: boolean;
  devices: Device[];
  services: MonitoredService[];
  containers: ContainerRecord[];
  alerts: AlertRecord[];
  events: EventRecord[];
  networks: NetworkRecord[];
  connections: ConnectionRecord[];
  inventory: InventoryItem[];
  notes: LabNote[];
  settings: AppSettings;
  generatedAt: string;
}

export interface DiscoveryResult {
  ip: string;
  hostname: string | null;
  macAddress: string | null;
  latencyMs: number | null;
  status: "reachable" | "observed";
  confidence: "high" | "medium" | "low";
}

export interface HealthScore {
  score: number;
  label: "Excellent" | "Good" | "Attention needed" | "Critical";
  factors: Array<{ label: string; impact: number; detail: string }>;
}
