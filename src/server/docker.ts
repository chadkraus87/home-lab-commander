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
        }),
      );
  }
}
