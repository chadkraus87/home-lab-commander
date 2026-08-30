import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ContainerRecord } from "@/domain/types";
import type { ContainerProvider } from "@/domain/providers";
import { normalizeDockerContainer } from "@/domain/normalize";

const execFileAsync = promisify(execFile);

interface DockerRow {
  ID: string;
  Names: string;
  Image: string;
  State: string;
  Status: string;
  Ports: string;
}

interface DockerStatsRow {
  ID: string;
  CPUPerc: string;
  MemUsage: string;
}

export class DockerCliProvider implements ContainerProvider {
  readonly id = "docker-cli";

  async available(): Promise<boolean> {
    try {
      await execFileAsync(
        "docker",
        ["info", "--format", "{{json .ServerVersion}}"],
        { timeout: 3_000, maxBuffer: 32_000 },
      );
      return true;
    } catch {
      return false;
    }
  }

  async listContainers(): Promise<ContainerRecord[]> {
    if (!(await this.available())) return [];
    const { stdout } = await execFileAsync(
      "docker",
      ["ps", "-a", "--no-trunc", "--format", "{{json .}}"],
      { timeout: 5_000, maxBuffer: 1_000_000 },
    );
    const stats = await this.readStats();
    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as DockerRow)
      .map((row) =>
        normalizeDockerContainer({
          id: row.ID,
          name: row.Names,
          image: row.Image,
          state: row.State,
          status: row.Status,
          ports: row.Ports,
          hostDeviceId: "local-docker-host",
          cpu: parsePercent(stats.get(row.ID)?.CPUPerc),
          memory: parseMemoryMb(stats.get(row.ID)?.MemUsage),
        }),
      );
  }

  private async readStats(): Promise<Map<string, DockerStatsRow>> {
    try {
      const { stdout } = await execFileAsync(
        "docker",
        ["stats", "--no-stream", "--format", "{{json .}}"],
        { timeout: 6_000, maxBuffer: 1_000_000 },
      );
      return new Map(
        stdout
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line) as DockerStatsRow)
          .map((row) => [row.ID, row]),
      );
    } catch {
      return new Map();
    }
  }
}

function parsePercent(value: string | undefined): number {
  const parsed = Number(value?.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMemoryMb(value: string | undefined): number {
  const used = value?.split("/", 1)[0]?.trim();
  const match = used?.match(/^([\d.]+)([KMG]i?B)$/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (!Number.isFinite(amount)) return 0;
  if (unit?.startsWith("g")) return amount * 1024;
  if (unit?.startsWith("k")) return amount / 1024;
  return amount;
}
