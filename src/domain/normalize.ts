import type { ContainerRecord, Device } from "@/domain/types";

export function normalizeDockerContainer(input: {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports?: string;
  hostDeviceId: string;
}): ContainerRecord {
  const normalizedState =
    input.state === "running"
      ? input.status.toLowerCase().includes("unhealthy")
        ? "unhealthy"
        : "running"
      : input.state === "paused"
        ? "paused"
        : "stopped";
  return {
    id: `docker-${input.id}`,
    containerId: input.id,
    hostDeviceId: input.hostDeviceId,
    name: input.name.replace(/^\//, ""),
    image: input.image,
    state: normalizedState,
    status: input.status,
    ports: input.ports
      ? input.ports
          .split(",")
          .map((port) => port.trim())
          .filter(Boolean)
      : [],
    createdAt: new Date(0).toISOString(),
    restartCount: 0,
    cpu: 0,
    memory: 0,
    uptimeSeconds: 0,
    source: "docker",
  };
}

export function normalizeDiscoveredDevice(
  input: { ip: string; hostname?: string | null; macAddress?: string | null },
  now = new Date().toISOString(),
): Device {
  const suffix = input.ip.replaceAll(".", "-");
  return {
    id: `discovered-${suffix}`,
    hostname: input.hostname ?? `host-${suffix}`,
    displayName: input.hostname ?? `Discovered ${input.ip}`,
    description: "Device promoted from local network discovery.",
    type: "unknown",
    vendor: "Unknown",
    model: "Unknown",
    operatingSystem: "Unknown",
    architecture: "Unknown",
    primaryIp: input.ip,
    macAddress: input.macAddress ?? "Unknown",
    status: "healthy",
    lastSeen: now,
    firstSeen: now,
    location: "Unassigned",
    tags: ["discovered"],
    notes: "",
    isFavorite: false,
    source: "discovery",
    createdAt: now,
    updatedAt: now,
    uptimeSeconds: 0,
    latencyMs: 0,
    metrics: {
      cpu: 0,
      memory: 0,
      disk: 0,
      temperature: null,
      networkRx: 0,
      networkTx: 0,
    },
    metricHistory: [],
    interfaces: [],
  };
}
