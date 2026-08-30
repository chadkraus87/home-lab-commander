import "server-only";

import { SafeHealthCheckProvider } from "@/server/health-checks";
import { resolveApprovedAddresses } from "@/server/local-http";
import { log } from "@/server/logger";
import { sendConfiguredNotifications } from "@/server/notifications";
import { checkEnabledProviders } from "@/server/provider-registry";
import { recordServiceCheck } from "@/server/collector-repository";
import { getStore } from "@/server/store";

export interface CollectorStatus {
  enabled: boolean;
  running: boolean;
  intervalSeconds: number;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastError: string | null;
  serviceChecks: number;
  providerChecks: number;
}

const intervalSeconds = Math.max(
  30,
  Math.min(3600, Number(process.env.HOMELAB_COLLECTOR_INTERVAL_SECONDS ?? 60)),
);
const collectorStatus: CollectorStatus = {
  enabled: process.env.HOMELAB_COLLECTOR_ENABLED === "1",
  running: false,
  intervalSeconds,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastError: null,
  serviceChecks: 0,
  providerChecks: 0,
};

declare global {
  var homeLabCollectorTimer: NodeJS.Timeout | undefined;
}

export function getCollectorStatus(): CollectorStatus {
  return { ...collectorStatus };
}

export function startCollector(): void {
  if (!collectorStatus.enabled || globalThis.homeLabCollectorTimer) return;
  globalThis.homeLabCollectorTimer = setInterval(
    () => void runCollector(),
    intervalSeconds * 1000,
  );
  globalThis.homeLabCollectorTimer.unref();
  log("info", "collector.started", { intervalSeconds });
  void runCollector();
}

export async function runCollector(): Promise<CollectorStatus> {
  if (!collectorStatus.enabled) return getCollectorStatus();
  if (collectorStatus.running) return getCollectorStatus();
  const snapshot = getStore().snapshot();
  if (snapshot.hostedDemo || snapshot.settings.mode !== "live")
    return getCollectorStatus();
  collectorStatus.running = true;
  collectorStatus.lastStartedAt = new Date().toISOString();
  collectorStatus.lastError = null;
  try {
    const services = snapshot.services
      .filter((service) => service.source !== "demo")
      .slice(0, 128);
    let serviceChecks = 0;
    for (let offset = 0; offset < services.length; offset += 4) {
      await Promise.all(
        services.slice(offset, offset + 4).map(async (service) => {
          try {
            await resolveApprovedAddresses(
              service.host,
              snapshot.settings.approvedCidrs,
            );
            const check = await new SafeHealthCheckProvider().run({
              kind:
                service.protocol === "dns"
                  ? "dns"
                  : service.protocol === "tcp"
                    ? "tcp"
                    : "http",
              host: service.host,
              port: service.port,
              protocol: service.protocol === "https" ? "https" : "http",
            });
            const transition = recordServiceCheck(service, check);
            if (transition.newlyActive)
              await sendConfiguredNotifications(
                {
                  title: `${service.name} is unavailable`,
                  body: check.message,
                  severity: "critical",
                },
                snapshot.settings.approvedCidrs,
              );
            serviceChecks += 1;
          } catch (error) {
            log("warn", "collector.service.failed", {
              serviceId: service.id,
              errorType: error instanceof Error ? error.name : "unknown",
            });
          }
        }),
      );
    }
    const providers = await checkEnabledProviders(
      snapshot.settings.approvedCidrs,
    );
    collectorStatus.serviceChecks = serviceChecks;
    collectorStatus.providerChecks = providers.length;
    collectorStatus.lastCompletedAt = new Date().toISOString();
  } catch (error) {
    collectorStatus.lastError =
      error instanceof Error ? error.message : "Collector run failed.";
    log("error", "collector.failed", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
  } finally {
    collectorStatus.running = false;
  }
  return getCollectorStatus();
}
