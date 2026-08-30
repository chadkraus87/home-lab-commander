import type {
  ContainerRecord,
  Device,
  DeviceMetrics,
  DiscoveryResult,
  MonitoredService,
} from "@/domain/types";

export interface DeviceProvider {
  readonly id: string;
  listDevices(): Promise<Device[]>;
}

export interface MetricsProvider {
  readonly id: string;
  collect(device: Device): Promise<DeviceMetrics>;
}

export interface ServiceProvider {
  readonly id: string;
  listServices(): Promise<MonitoredService[]>;
}

export interface ContainerProvider {
  readonly id: string;
  available(): Promise<boolean>;
  listContainers(): Promise<ContainerRecord[]>;
}

export interface NetworkDiscoveryProvider {
  readonly id: string;
  discover(
    cidr: string,
    method: "passive" | "ping",
  ): Promise<DiscoveryResult[]>;
}

export interface HealthCheckResult {
  ok: boolean;
  kind: "ping" | "dns" | "tcp" | "http" | "tls";
  latencyMs: number | null;
  message: string;
  observed: string[];
  likelyExplanation: string | null;
  recommendation: string;
}

export interface HealthCheckProvider {
  run(input: {
    kind: HealthCheckResult["kind"];
    host: string;
    port?: number | undefined;
    protocol?: "http" | "https" | undefined;
  }): Promise<HealthCheckResult>;
}
