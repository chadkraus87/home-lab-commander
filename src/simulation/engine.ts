import type { AppSnapshot, EventRecord, MetricPoint } from "@/domain/types";

export function advanceSimulation(
  snapshot: AppSnapshot,
  tick: number,
  now = new Date(),
): AppSnapshot {
  if (snapshot.settings.mode !== "demo") return snapshot;
  const timestamp = now.toISOString();
  const devices = snapshot.devices.map((device, index) => {
    const wave = Math.sin((tick + index * 1.7) / 3);
    const pulse = Math.cos((tick + index) / 5);
    const cpu = clamp(device.metrics.cpu + wave * 2.4);
    const memory = clamp(device.metrics.memory + pulse * 0.6);
    const nextPoint: MetricPoint = {
      timestamp,
      cpu,
      memory,
      disk: clamp(device.metrics.disk + (index === 4 ? 0.01 : 0)),
      temperature:
        device.metrics.temperature === null
          ? null
          : device.metrics.temperature + wave * 0.35,
      networkRx: Math.max(0, device.metrics.networkRx * (1 + wave * 0.08)),
      networkTx: Math.max(0, device.metrics.networkTx * (1 - wave * 0.06)),
      latency: Math.max(0.2, device.latencyMs + pulse * 0.2),
    };
    return {
      ...device,
      lastSeen: timestamp,
      uptimeSeconds: device.uptimeSeconds + snapshot.settings.refreshSeconds,
      latencyMs: nextPoint.latency,
      metrics: {
        cpu: nextPoint.cpu,
        memory: nextPoint.memory,
        disk: nextPoint.disk,
        temperature: nextPoint.temperature,
        networkRx: nextPoint.networkRx,
        networkTx: nextPoint.networkTx,
      },
      metricHistory: [...device.metricHistory.slice(-95), nextPoint],
    };
  });
  const services = snapshot.services.map((service, index) => ({
    ...service,
    responseTimeMs: Math.max(
      2,
      Math.round(
        service.responseTimeMs * (1 + Math.sin((tick + index) / 4) * 0.035),
      ),
    ),
    lastChecked: timestamp,
  }));
  let events = snapshot.events;
  if (tick > 0 && tick % 15 === 0) {
    const event: EventRecord = {
      id: `sim-event-${tick}`,
      deviceId: "atlas",
      eventType: "simulation.telemetry",
      severity: "info",
      source: "demo-engine",
      message:
        tick % 30 === 0
          ? "PostgreSQL health check recovered"
          : "Atlas telemetry sample collected",
      metadata: { simulated: true },
      timestamp,
    };
    events = [event, ...events].slice(0, 120);
  }
  return { ...snapshot, devices, services, events, generatedAt: timestamp };
}

function clamp(value: number): number {
  return Math.min(99.9, Math.max(0, value));
}
