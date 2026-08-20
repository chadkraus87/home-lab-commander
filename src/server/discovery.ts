import "server-only";

import { execFile } from "node:child_process";
import { reverse } from "node:dns/promises";
import { promisify } from "node:util";
import { isIpInCidr, isPrivateCidr, enumerateHosts } from "@/domain/network";
import type { DiscoveryResult } from "@/domain/types";
import type { NetworkDiscoveryProvider } from "@/domain/providers";
import { log } from "@/server/logger";

const execFileAsync = promisify(execFile);

export class LocalDiscoveryProvider implements NetworkDiscoveryProvider {
  readonly id = "local-safe-discovery";

  async discover(
    cidr: string,
    method: "passive" | "ping",
  ): Promise<DiscoveryResult[]> {
    if (!isPrivateCidr(cidr))
      throw new Error("Discovery is restricted to approved private ranges.");
    const hosts = enumerateHosts(cidr, 256);
    if (hosts.length === 0)
      throw new Error("Discovery is limited to one /24 network at a time.");
    log("info", "discovery.started", { cidr, method, hostCount: hosts.length });
    const passive = await this.passiveNeighbors(cidr);
    if (method === "passive") return passive;
    const known = new Map(passive.map((result) => [result.ip, result]));
    for (let offset = 0; offset < hosts.length; offset += 8) {
      const batch = hosts.slice(offset, offset + 8);
      const results = await Promise.all(batch.map((host) => pingHost(host)));
      for (const result of results) if (result) known.set(result.ip, result);
    }
    const results = [...known.values()].sort((left, right) =>
      left.ip.localeCompare(right.ip, undefined, { numeric: true }),
    );
    log("info", "discovery.completed", {
      cidr,
      method,
      resultCount: results.length,
    });
    return results;
  }

  private async passiveNeighbors(cidr: string): Promise<DiscoveryResult[]> {
    let output = "";
    try {
      output = (
        await execFileAsync("arp", ["-an"], {
          timeout: 4_000,
          maxBuffer: 512_000,
        })
      ).stdout;
    } catch {
      try {
        output = (
          await execFileAsync("ip", ["neigh", "show"], {
            timeout: 4_000,
            maxBuffer: 512_000,
          })
        ).stdout;
      } catch {
        return [];
      }
    }
    const matches = [
      ...output.matchAll(
        /(?:\(|^)(\d{1,3}(?:\.\d{1,3}){3})\)?\s+(?:at|dev)?\s*([0-9a-f:]{11,17})?/gim,
      ),
    ];
    return Promise.all(
      matches
        .filter(
          (match) => Boolean(match[1]) && isIpInCidr(match[1] ?? "", cidr),
        )
        .map(async (match) => {
          const ip = match[1] ?? "";
          return {
            ip,
            hostname: await reverseName(ip),
            macAddress: match[2]?.toUpperCase() ?? null,
            latencyMs: null,
            status: "observed" as const,
            confidence: match[2] ? ("high" as const) : ("medium" as const),
          };
        }),
    );
  }
}

async function pingHost(ip: string): Promise<DiscoveryResult | null> {
  const args =
    process.platform === "darwin"
      ? ["-c", "1", "-W", "1000", ip]
      : ["-c", "1", "-W", "1", ip];
  const started = performance.now();
  try {
    const { stdout } = await execFileAsync("ping", args, {
      timeout: 1_500,
      maxBuffer: 32_000,
    });
    const match = stdout.match(/time[=<]([\d.]+)\s*ms/i);
    return {
      ip,
      hostname: await reverseName(ip),
      macAddress: null,
      latencyMs: match?.[1] ? Number(match[1]) : performance.now() - started,
      status: "reachable",
      confidence: "medium",
    };
  } catch {
    return null;
  }
}

async function reverseName(ip: string): Promise<string | null> {
  try {
    const names = await reverse(ip);
    return names[0] ?? null;
  } catch {
    return null;
  }
}
