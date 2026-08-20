import type {
  AlertRecord,
  ContainerRecord,
  Device,
  MonitoredService,
} from "@/domain/types";

export interface AlertCandidate {
  fingerprint: string;
  severity: "critical" | "warning" | "info";
  category: string;
  deviceId: string | null;
  sourceId: string | null;
  title: string;
  description: string;
}

export function evaluateAlertRules(
  devices: Device[],
  services: MonitoredService[],
  containers: ContainerRecord[],
): AlertCandidate[] {
  const candidates: AlertCandidate[] = [];
  for (const device of devices) {
    if (device.status === "offline")
      candidates.push(
        candidate(
          "device-offline",
          device.id,
          "critical",
          `${device.displayName} is offline`,
          "The device has stopped responding. Confirm power and network connectivity.",
        ),
      );
    if (device.metrics.cpu > 90)
      candidates.push(
        candidate(
          "high-cpu",
          device.id,
          "warning",
          `High CPU on ${device.displayName}`,
          `CPU is ${Math.round(device.metrics.cpu)}%, above the 90% threshold.`,
        ),
      );
    if (device.metrics.memory > 90)
      candidates.push(
        candidate(
          "high-memory",
          device.id,
          "warning",
          `High memory on ${device.displayName}`,
          `Memory use is ${Math.round(device.metrics.memory)}%, above the 90% threshold.`,
        ),
      );
    if (device.metrics.disk > 85)
      candidates.push(
        candidate(
          "high-disk",
          device.id,
          "warning",
          `Storage pressure on ${device.displayName}`,
          `Disk use is ${Math.round(device.metrics.disk)}%, above the 85% threshold.`,
        ),
      );
  }
  for (const service of services) {
    if (service.status === "down")
      candidates.push({
        fingerprint: `service-down:${service.id}`,
        severity: "critical",
        category: "service",
        deviceId: service.deviceId,
        sourceId: service.id,
        title: `${service.name} is unavailable`,
        description: `The ${service.protocol.toUpperCase()} check to ${service.host}:${service.port} did not succeed.`,
      });
  }
  for (const container of containers) {
    if (container.state === "unhealthy")
      candidates.push({
        fingerprint: `container-unhealthy:${container.id}`,
        severity: "warning",
        category: "container",
        deviceId: container.hostDeviceId,
        sourceId: container.id,
        title: `${container.name} is unhealthy`,
        description: "The container runtime reports a failing health check.",
      });
    if (container.restartCount >= 5)
      candidates.push({
        fingerprint: `container-restarts:${container.id}`,
        severity: "warning",
        category: "container",
        deviceId: container.hostDeviceId,
        sourceId: container.id,
        title: `${container.name} is repeatedly restarting`,
        description: `${container.restartCount} restarts have been observed.`,
      });
  }
  return candidates;
}

function candidate(
  category: string,
  deviceId: string,
  severity: AlertCandidate["severity"],
  title: string,
  description: string,
): AlertCandidate {
  return {
    fingerprint: `${category}:${deviceId}`,
    severity,
    category,
    deviceId,
    sourceId: deviceId,
    title,
    description,
  };
}

export function deduplicateAlerts(
  existing: AlertRecord[],
  candidates: AlertCandidate[],
  now = new Date().toISOString(),
): AlertRecord[] {
  const next = existing.map((alert) => ({ ...alert }));
  for (const candidateAlert of candidates) {
    const match = next.find(
      (alert) =>
        alert.fingerprint === candidateAlert.fingerprint &&
        alert.status !== "resolved",
    );
    if (match) {
      match.lastTriggered = now;
      continue;
    }
    next.push({
      id: `alert-${candidateAlert.fingerprint.replaceAll(":", "-")}-${Date.parse(now)}`,
      ...candidateAlert,
      status: "active",
      firstTriggered: now,
      lastTriggered: now,
      acknowledgedAt: null,
      resolvedAt: null,
    });
  }
  return next;
}
