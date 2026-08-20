import type { AlertRecord, AppSnapshot, HealthScore } from "@/domain/types";

export function calculateHealthScore(
  snapshot: Pick<AppSnapshot, "devices" | "services" | "containers" | "alerts">,
): HealthScore {
  const factors: HealthScore["factors"] = [];
  const offlineDevices = snapshot.devices.filter(
    (device) => device.status === "offline",
  ).length;
  const degradedDevices = snapshot.devices.filter(
    (device) => device.status === "degraded",
  ).length;
  const downServices = snapshot.services.filter(
    (service) => service.status === "down",
  ).length;
  const degradedServices = snapshot.services.filter(
    (service) => service.status === "degraded",
  ).length;
  const unhealthyContainers = snapshot.containers.filter(
    (container) => container.state === "unhealthy",
  ).length;
  const activeAlerts = snapshot.alerts.filter(
    (alert) => alert.status === "active",
  );
  const criticalAlerts = activeAlerts.filter(
    (alert) => alert.severity === "critical",
  ).length;

  const deviceImpact = Math.min(32, offlineDevices * 12 + degradedDevices * 5);
  const serviceImpact = Math.min(24, downServices * 10 + degradedServices * 4);
  const containerImpact = Math.min(12, unhealthyContainers * 6);
  const alertImpact = Math.min(28, alertPenalty(activeAlerts));

  factors.push({
    label: "Devices",
    impact: -deviceImpact,
    detail:
      offlineDevices || degradedDevices
        ? `${offlineDevices} offline · ${degradedDevices} degraded`
        : "All managed devices are responding",
  });
  factors.push({
    label: "Services",
    impact: -serviceImpact,
    detail:
      downServices || degradedServices
        ? `${downServices} down · ${degradedServices} degraded`
        : "All monitored services are healthy",
  });
  factors.push({
    label: "Containers",
    impact: -containerImpact,
    detail: unhealthyContainers
      ? `${unhealthyContainers} container${unhealthyContainers === 1 ? "" : "s"} unhealthy`
      : "Container workloads are stable",
  });
  factors.push({
    label: "Active alerts",
    impact: -alertImpact,
    detail: `${criticalAlerts} critical · ${activeAlerts.length} total active`,
  });

  const score = Math.max(
    0,
    Math.round(
      100 - deviceImpact - serviceImpact - containerImpact - alertImpact,
    ),
  );
  return {
    score,
    label:
      score >= 90
        ? "Excellent"
        : score >= 75
          ? "Good"
          : score >= 50
            ? "Attention needed"
            : "Critical",
    factors,
  };
}

function alertPenalty(alerts: AlertRecord[]): number {
  return alerts.reduce(
    (total, alert) =>
      total +
      (alert.severity === "critical"
        ? 8
        : alert.severity === "warning"
          ? 3
          : 1),
    0,
  );
}
