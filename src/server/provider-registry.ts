import "server-only";

import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import type {
  ProviderConfig,
  ProviderRegistry,
} from "@/domain/provider-config";
import { providerRegistrySchema } from "@/domain/provider-config";
import {
  requestApprovedLocalUrl,
  resolveApprovedAddresses,
} from "@/server/local-http";
import { resolveSecretReference } from "@/server/secrets";

const execFileAsync = promisify(execFile);
const providerResults = new Map<string, ProviderCheckResult>();

export interface ProviderSummary {
  id: string;
  label: string;
  kind: ProviderConfig["kind"];
  enabled: boolean;
  secretConfigured: boolean;
  lastResult: ProviderCheckResult | null;
}

export interface ProviderCheckResult {
  id: string;
  status: "healthy" | "degraded" | "offline" | "unavailable";
  message: string;
  latencyMs: number | null;
  checkedAt: string;
}

export function loadProviderRegistry(): ProviderRegistry {
  const configuredPath =
    process.env.HOMELAB_PROVIDER_CONFIG_PATH ??
    join(process.cwd(), "config", "providers.json");
  const path = isAbsolute(configuredPath)
    ? configuredPath
    : resolve(process.cwd(), configuredPath);
  if (!existsSync(path)) return { version: 1, providers: [] };
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error("The provider registry is not valid JSON.");
  }
  const parsed = providerRegistrySchema.safeParse(input);
  if (!parsed.success)
    throw new Error("The provider registry failed schema validation.");
  return parsed.data;
}

export function listProviderSummaries(): ProviderSummary[] {
  return loadProviderRegistry().providers.map((provider) => ({
    id: provider.id,
    label: provider.label,
    kind: provider.kind,
    enabled: provider.enabled,
    secretConfigured: providerHasSecretReference(provider),
    lastResult: providerResults.get(provider.id) ?? null,
  }));
}

export async function checkProviderById(
  id: string,
  approvedCidrs: string[],
): Promise<ProviderCheckResult> {
  const provider = loadProviderRegistry().providers.find(
    (candidate) => candidate.id === id,
  );
  if (!provider) throw new Error("Provider not found.");
  const result = await checkProvider(provider, approvedCidrs);
  providerResults.set(provider.id, result);
  return result;
}

export async function checkEnabledProviders(
  approvedCidrs: string[],
): Promise<ProviderCheckResult[]> {
  const providers = loadProviderRegistry()
    .providers.filter((provider) => provider.enabled)
    .slice(0, 32);
  const results: ProviderCheckResult[] = [];
  for (let offset = 0; offset < providers.length; offset += 4) {
    const batch = await Promise.all(
      providers.slice(offset, offset + 4).map(async (provider) => {
        try {
          return await checkProvider(provider, approvedCidrs);
        } catch (error) {
          return result(
            provider.id,
            "offline",
            error instanceof Error ? error.message : "Provider check failed.",
          );
        }
      }),
    );
    for (const item of batch) {
      providerResults.set(item.id, item);
      results.push(item);
    }
  }
  return results;
}

async function checkProvider(
  provider: ProviderConfig,
  approvedCidrs: string[],
): Promise<ProviderCheckResult> {
  if (provider.kind === "tailscale") return checkTailscale(provider.id);
  if (provider.kind === "smart")
    return checkSmart(provider.id, provider.devices);
  if (provider.kind === "snmp") {
    const [address] = await resolveApprovedAddresses(
      provider.host,
      approvedCidrs,
    );
    if (!address) throw new Error("SNMP target is unavailable.");
    const community = await resolveSecretReference(provider.communityRef);
    const started = performance.now();
    try {
      await execFileAsync(
        "snmpget",
        ["-v2c", "-c", community, "-t", "2", "-r", "0", address, provider.oid],
        { timeout: 3_000, maxBuffer: 64_000 },
      );
      return result(
        provider.id,
        "healthy",
        "SNMP identity query succeeded.",
        performance.now() - started,
      );
    } catch {
      return result(
        provider.id,
        "offline",
        "SNMP did not return the configured identity OID.",
      );
    }
  }
  if (provider.kind === "nut") {
    const [address] = await resolveApprovedAddresses(
      provider.host,
      approvedCidrs,
    );
    if (!address) throw new Error("NUT target is unavailable.");
    const started = performance.now();
    try {
      const { stdout } = await execFileAsync(
        "upsc",
        [`${provider.upsName}@${address}`],
        { timeout: 3_000, maxBuffer: 128_000 },
      );
      const online = /ups\.status:\s+.*OL/m.test(stdout);
      return result(
        provider.id,
        online ? "healthy" : "degraded",
        online
          ? "UPS reports utility power online."
          : "UPS requires attention.",
        performance.now() - started,
      );
    } catch {
      return result(
        provider.id,
        "unavailable",
        "NUT upsc is unavailable or the UPS did not respond.",
      );
    }
  }

  const secret = provider.secretRef
    ? await resolveSecretReference(provider.secretRef)
    : null;
  const target = providerEndpoint(provider);
  const headers: Record<string, string> = {};
  if (secret) {
    headers.authorization =
      provider.kind === "proxmox"
        ? `PVEAPIToken=${secret}`
        : `Bearer ${secret}`;
  }
  const response = await requestApprovedLocalUrl(target, {
    approvedCidrs,
    headers,
    allowSelfSigned: provider.allowSelfSigned,
  });
  const healthy = response.status >= 200 && response.status < 400;
  return result(
    provider.id,
    healthy
      ? "healthy"
      : response.status === 401 || response.status === 403
        ? "degraded"
        : "offline",
    healthy
      ? `${provider.label} responded with HTTP ${response.status}.`
      : `${provider.label} returned HTTP ${response.status}.`,
    response.latencyMs,
  );
}

function providerEndpoint(
  provider: Extract<
    ProviderConfig,
    { kind: "prometheus" | "proxmox" | "unifi" | "home-assistant" }
  >,
): URL {
  const url = new URL(provider.endpoint);
  const paths = {
    prometheus: "/-/ready",
    proxmox: "/api2/json/version",
    unifi: "/proxy/network/api/self",
    "home-assistant": "/api/",
  } as const;
  url.pathname = paths[provider.kind];
  url.search = "";
  url.hash = "";
  return url;
}

async function checkTailscale(id: string): Promise<ProviderCheckResult> {
  const started = performance.now();
  try {
    const { stdout } = await execFileAsync("tailscale", ["status", "--json"], {
      timeout: 3_000,
      maxBuffer: 512_000,
    });
    const parsed = JSON.parse(stdout) as { BackendState?: string };
    const healthy = parsed.BackendState === "Running";
    return result(
      id,
      healthy ? "healthy" : "degraded",
      healthy
        ? "Tailscale is connected."
        : "Tailscale is installed but not connected.",
      performance.now() - started,
    );
  } catch {
    return result(id, "unavailable", "The Tailscale CLI is unavailable.");
  }
}

async function checkSmart(
  id: string,
  devices: string[],
): Promise<ProviderCheckResult> {
  const started = performance.now();
  let degraded = false;
  try {
    for (const device of devices) {
      const { stdout } = await execFileAsync("smartctl", ["-H", "-j", device], {
        timeout: 5_000,
        maxBuffer: 256_000,
      });
      const parsed = JSON.parse(stdout) as {
        smart_status?: { passed?: boolean };
      };
      if (parsed.smart_status?.passed !== true) degraded = true;
    }
    return result(
      id,
      degraded ? "degraded" : "healthy",
      degraded
        ? "At least one disk failed its SMART health assessment."
        : "Configured disks passed SMART health assessment.",
      performance.now() - started,
    );
  } catch {
    return result(
      id,
      "unavailable",
      "smartctl is unavailable or a configured disk could not be read.",
    );
  }
}

function providerHasSecretReference(provider: ProviderConfig): boolean {
  return (
    ("secretRef" in provider && Boolean(provider.secretRef)) ||
    ("communityRef" in provider && Boolean(provider.communityRef))
  );
}

function result(
  id: string,
  status: ProviderCheckResult["status"],
  message: string,
  latencyMs: number | null = null,
): ProviderCheckResult {
  return {
    id,
    status,
    message,
    latencyMs,
    checkedAt: new Date().toISOString(),
  };
}
