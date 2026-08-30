import type { Device, DiscoveryResult } from "@/domain/types";

export type ReconciliationReason = "mac" | "ip" | "hostname" | null;

export interface ReconciledDiscoveryResult extends DiscoveryResult {
  existingDeviceId: string | null;
  matchReason: ReconciliationReason;
}

export function reconcileDiscoveryResults(
  results: DiscoveryResult[],
  devices: Device[],
): ReconciledDiscoveryResult[] {
  return results.map((result) => {
    const match = findDeviceMatch(result, devices);
    return {
      ...result,
      existingDeviceId: match.device?.id ?? null,
      matchReason: match.reason,
    };
  });
}

export function findDeviceMatch(
  candidate: Pick<DiscoveryResult, "ip" | "hostname" | "macAddress">,
  devices: Device[],
): { device: Device | null; reason: ReconciliationReason } {
  const candidateMac = normalizeMac(candidate.macAddress);
  if (candidateMac) {
    const byMac = devices.find(
      (device) => normalizeMac(device.macAddress) === candidateMac,
    );
    if (byMac) return { device: byMac, reason: "mac" };
  }

  const byIp = devices.find((device) => device.primaryIp === candidate.ip);
  if (byIp) return { device: byIp, reason: "ip" };

  const hostname = candidate.hostname?.trim().toLowerCase();
  if (hostname) {
    const byHostname = devices.find(
      (device) => device.hostname.trim().toLowerCase() === hostname,
    );
    if (byHostname) return { device: byHostname, reason: "hostname" };
  }

  return { device: null, reason: null };
}

function normalizeMac(value: string | null): string | null {
  if (!value || value.toLowerCase() === "unknown") return null;
  const normalized = value.replaceAll(/[^a-fA-F0-9]/g, "").toLowerCase();
  return normalized.length === 12 ? normalized : null;
}
