import type { AlertRecord, AppSnapshot, EventRecord } from "@/domain/types";

export const demoScenarioIds = [
  "balanced",
  "capacity",
  "outage",
  "recovery",
] as const;
export type DemoScenarioId = (typeof demoScenarioIds)[number];

export const demoScenarioDescriptions: Record<DemoScenarioId, string> = {
  balanced: "The default mixed-health lab with two active warnings.",
  capacity: "Storage and memory pressure build before an outage occurs.",
  outage: "DNS and automation services fail during a simulated incident.",
  recovery: "Services recover and the incident timeline records the response.",
};

export function applyDemoScenario(
  snapshot: AppSnapshot,
  scenario: DemoScenarioId,
  now = new Date().toISOString(),
): AppSnapshot {
  const clean = {
    ...snapshot,
    devices: snapshot.devices.map((device) => ({ ...device })),
    services: snapshot.services.map((service) => ({ ...service })),
    containers: snapshot.containers.map((container) => ({ ...container })),
    alerts: snapshot.alerts.filter(
      (alert) => !alert.fingerprint.startsWith("demo-scenario:"),
    ),
    events: snapshot.events.filter(
      (event) => !event.eventType.startsWith("demo.scenario."),
    ),
    generatedAt: now,
  };

  if (scenario === "balanced") return clean;
  if (scenario === "capacity") {
    return {
      ...clean,
      devices: clean.devices.map((device) =>
        device.id === "nas"
          ? {
              ...device,
              status: "degraded",
              metrics: { ...device.metrics, disk: 94, memory: 82 },
            }
          : device,
      ),
      alerts: [
        scenarioAlert(
          "capacity",
          "warning",
          "Capacity forecast crossed the seven-day reserve",
          "Archive NAS growth indicates fewer than seven days of safe free space.",
          "nas",
          now,
        ),
        ...clean.alerts,
      ],
      events: [
        scenarioEvent(
          "capacity",
          "warning",
          "Capacity scenario loaded: NAS storage pressure is increasing",
          "nas",
          now,
        ),
        ...clean.events,
      ],
    };
  }

  if (scenario === "outage") {
    return {
      ...clean,
      devices: clean.devices.map((device) =>
        device.id === "pi-dns" || device.id === "atlas"
          ? { ...device, status: "offline" }
          : device,
      ),
      services: clean.services.map((service) =>
        service.id === "pihole" || service.id === "home-assistant"
          ? { ...service, status: "down", responseTimeMs: 0, lastChecked: now }
          : service,
      ),
      containers: clean.containers.map((container) =>
        container.id === "ctr-home-assistant"
          ? { ...container, state: "stopped", status: "Exited (1)" }
          : container,
      ),
      alerts: [
        scenarioAlert(
          "outage-dns",
          "critical",
          "DNS service is unavailable",
          "The simulated Pi-hole endpoint stopped responding.",
          "pi-dns",
          now,
        ),
        scenarioAlert(
          "outage-automation",
          "critical",
          "Home Assistant is unavailable",
          "The simulated automation service and container are offline.",
          "atlas",
          now,
        ),
        ...clean.alerts,
      ],
      events: [
        scenarioEvent(
          "outage",
          "critical",
          "Incident playback: DNS and Home Assistant stopped responding",
          "atlas",
          now,
        ),
        ...clean.events,
      ],
    };
  }

  return {
    ...clean,
    services: clean.services.map((service) =>
      service.id === "pihole" || service.id === "home-assistant"
        ? {
            ...service,
            status: "healthy",
            responseTimeMs: service.id === "pihole" ? 5 : 31,
            lastChecked: now,
          }
        : service,
    ),
    containers: clean.containers.map((container) =>
      container.id === "ctr-home-assistant"
        ? { ...container, state: "running", status: "Up 2 minutes" }
        : container,
    ),
    alerts: clean.alerts.map((alert) =>
      alert.status === "active"
        ? { ...alert, status: "resolved", resolvedAt: now }
        : alert,
    ),
    events: [
      scenarioEvent(
        "recovery",
        "info",
        "Incident playback: services recovered and verification completed",
        "atlas",
        now,
      ),
      ...clean.events,
    ],
  };
}

function scenarioAlert(
  suffix: string,
  severity: AlertRecord["severity"],
  title: string,
  description: string,
  deviceId: string,
  now: string,
): AlertRecord {
  return {
    id: `demo-scenario-${suffix}`,
    fingerprint: `demo-scenario:${suffix}`,
    severity,
    category: "scenario",
    deviceId,
    sourceId: deviceId,
    title,
    description,
    status: "active",
    firstTriggered: now,
    lastTriggered: now,
    acknowledgedAt: null,
    resolvedAt: null,
  };
}

function scenarioEvent(
  suffix: string,
  severity: EventRecord["severity"],
  message: string,
  deviceId: string,
  now: string,
): EventRecord {
  return {
    id: `demo-scenario-event-${suffix}`,
    deviceId,
    eventType: `demo.scenario.${suffix}`,
    severity,
    source: "hosted-demo",
    message,
    metadata: { simulated: true },
    timestamp: now,
  };
}
