"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  CircleOff,
  Database,
  HardDrive,
  RefreshCw,
  Search,
} from "lucide-react";
import type { ContainerRecord } from "@/domain/types";
import { useApp } from "@/components/app-provider";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from "@/components/ui";
import { formatDuration } from "@/lib/utils";

export function ContainersPage() {
  const { snapshot } = useApp();
  const [query, setQuery] = useState("");
  const [dockerState, setDockerState] = useState<{
    available: boolean;
    message: string;
    containers: ContainerRecord[];
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const containers = (
    snapshot.settings.mode === "live" && dockerState?.available
      ? dockerState.containers
      : snapshot.containers
  ).filter((item) =>
    `${item.name} ${item.image}`.toLowerCase().includes(query.toLowerCase()),
  );

  async function checkDocker() {
    setChecking(true);
    try {
      const response = await fetch("/api/docker");
      setDockerState(
        (await response.json()) as {
          available: boolean;
          message: string;
          containers: ContainerRecord[];
        },
      );
    } catch {
      setDockerState({
        available: false,
        message:
          "Docker could not be reached. Demo container data remains available.",
        containers: [],
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Container runtime"
        title="Containers"
        description="Read-only workload visibility with deliberate boundaries for future administrative actions."
        actions={
          <Button variant="secondary" onClick={checkDocker} disabled={checking}>
            <RefreshCw size={14} className={checking ? "spin" : ""} />
            {checking ? "Checking…" : "Check local Docker"}
          </Button>
        }
      />
      <div className="provider-banner">
        <span className={dockerState?.available ? "available" : "demo"}>
          <Box size={15} />
        </span>
        <div>
          <strong>
            {dockerState?.available
              ? "Local Docker connected"
              : "Demo provider active"}
          </strong>
          <small>
            {dockerState?.message ??
              "No Docker connection is required to explore this workflow."}
          </small>
        </div>
        <Badge tone={dockerState?.available ? "positive" : "info"}>
          {dockerState?.available ? "Read only" : "Simulated"}
        </Badge>
      </div>
      <section className="operations-summary">
        <Card>
          <CheckCircle2 />
          <span>
            <small>Running</small>
            <strong>
              {containers.filter((item) => item.state === "running").length}
            </strong>
          </span>
        </Card>
        <Card>
          <CircleOff />
          <span>
            <small>Stopped</small>
            <strong>
              {containers.filter((item) => item.state === "stopped").length}
            </strong>
          </span>
        </Card>
        <Card>
          <HardDrive />
          <span>
            <small>Unhealthy</small>
            <strong>
              {containers.filter((item) => item.state === "unhealthy").length}
            </strong>
          </span>
        </Card>
        <Card>
          <Database />
          <span>
            <small>Memory allocated</small>
            <strong>
              {(
                containers.reduce((sum, item) => sum + item.memory, 0) / 1024
              ).toFixed(1)}{" "}
              GB
            </strong>
          </span>
        </Card>
      </section>
      <Card>
        <div className="toolbar">
          <div className="input-wrap device-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search containers…"
              aria-label="Search containers"
            />
          </div>
          <span className="toolbar-note">
            Start, stop, and restart are intentionally unavailable in read-only
            mode
          </span>
        </div>
        <div className="table-wrap">
          <table className="data-table containers-table">
            <thead>
              <tr>
                <th>Container</th>
                <th>State</th>
                <th>Image</th>
                <th>Ports</th>
                <th>CPU</th>
                <th>Memory</th>
                <th>Uptime</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {containers.map((container) => (
                <tr key={container.id}>
                  <td>
                    <Link
                      className="table-primary"
                      href={`/containers/${container.id}`}
                    >
                      <div className="service-icon">
                        <Box size={15} />
                      </div>
                      <span>
                        {container.name}
                        <small>{container.containerId.slice(0, 12)}</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={container.state} />
                  </td>
                  <td className="image-cell">{container.image}</td>
                  <td>
                    {container.ports.length ? container.ports.join(", ") : "—"}
                  </td>
                  <td>
                    <div className="metric-cell">
                      <strong>{container.cpu.toFixed(1)}%</strong>
                      <ProgressBar
                        value={container.cpu}
                        label={`CPU ${container.cpu}%`}
                      />
                    </div>
                  </td>
                  <td>{container.memory.toFixed(0)} MB</td>
                  <td>{formatDuration(container.uptimeSeconds)}</td>
                  <td>
                    <Link
                      className="button button-ghost button-icon"
                      href={`/containers/${container.id}`}
                      aria-label={`Open ${container.name}`}
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="list-footer">
          <span>{containers.length} containers</span>
          <span>
            Provider:{" "}
            {dockerState?.available ? "Docker CLI" : "Deterministic demo"}
          </span>
        </footer>
      </Card>
    </>
  );
}
