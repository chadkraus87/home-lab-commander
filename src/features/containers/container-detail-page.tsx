"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Box,
  Clock3,
  Cpu,
  MemoryStick,
  RotateCcw,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge, Card, ProgressBar, StatusBadge } from "@/components/ui";
import { formatDuration } from "@/lib/utils";

export function ContainerDetailPage({ containerId }: { containerId: string }) {
  const { snapshot } = useApp();
  const container = snapshot.containers.find((item) => item.id === containerId);
  if (!container)
    return (
      <Card>
        <div className="empty-state">
          <h2>Container not found</h2>
          <Link
            className="button button-primary button-default"
            href="/containers"
          >
            Back to containers
          </Link>
        </div>
      </Card>
    );
  const host = snapshot.devices.find(
    (device) => device.id === container.hostDeviceId,
  );
  const logTime = Date.parse(snapshot.generatedAt);
  const logs = [
    `${new Date(logTime).toISOString()}  INFO  health probe completed`,
    `${new Date(logTime - 8_000).toISOString()}  INFO  request served in 18ms`,
    `${new Date(logTime - 22_000).toISOString()}  INFO  background task idle`,
  ];
  return (
    <>
      <div className="detail-back">
        <Link href="/containers">
          <ArrowLeft size={14} />
          Containers
        </Link>
        <span>/</span>
        <span>{container.name}</span>
      </div>
      <header className="service-hero">
        <div className="device-hero-icon">
          <Box />
        </div>
        <div>
          <span>
            <h1>{container.name}</h1>
            <StatusBadge status={container.state} />
            <Badge tone="info">
              {container.source === "demo" ? "Simulated" : "Docker"}
            </Badge>
          </span>
          <p>{container.image}</p>
        </div>
      </header>
      <section className="device-stat-grid">
        <Card className="device-stat">
          <span>
            <Clock3 />
          </span>
          <div>
            <small>Uptime</small>
            <strong>{formatDuration(container.uptimeSeconds)}</strong>
            <em>{container.status}</em>
          </div>
        </Card>
        <Card className="device-stat">
          <span>
            <Cpu />
          </span>
          <div>
            <small>CPU</small>
            <strong>{container.cpu.toFixed(1)}%</strong>
            <em>Current sample</em>
          </div>
        </Card>
        <Card className="device-stat">
          <span>
            <MemoryStick />
          </span>
          <div>
            <small>Memory</small>
            <strong>{container.memory.toFixed(0)} MB</strong>
            <em>Working set</em>
          </div>
        </Card>
        <Card className="device-stat">
          <span>
            <RotateCcw />
          </span>
          <div>
            <small>Restarts</small>
            <strong>{container.restartCount}</strong>
            <em>Since creation</em>
          </div>
        </Card>
      </section>
      <section className="device-secondary-grid">
        <Card>
          <div className="card-header">
            <div>
              <h2>Container details</h2>
              <p>Normalized runtime metadata</p>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Container ID</dt>
              <dd className="mono">{container.containerId}</dd>
            </div>
            <div>
              <dt>Image</dt>
              <dd>{container.image}</dd>
            </div>
            <div>
              <dt>Host</dt>
              <dd>{host?.displayName ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Ports</dt>
              <dd>{container.ports.join(", ") || "None published"}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(container.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <div className="card-header">
            <div>
              <h2>Resource snapshot</h2>
              <p>Latest provider sample</p>
            </div>
          </div>
          <div className="container-resources">
            <label>
              <span>
                CPU<strong>{container.cpu.toFixed(1)}%</strong>
              </span>
              <ProgressBar value={container.cpu} label="Container CPU" />
            </label>
            <label>
              <span>
                Memory<strong>{container.memory.toFixed(0)} MB</strong>
              </span>
              <ProgressBar
                value={Math.min(100, container.memory / 80)}
                tone="green"
                label="Container memory"
              />
            </label>
            <label>
              <span>
                Restart risk<strong>{container.restartCount}/5</strong>
              </span>
              <ProgressBar
                value={Math.min(100, container.restartCount * 20)}
                tone={container.restartCount >= 5 ? "red" : "amber"}
                label="Container restart count"
              />
            </label>
          </div>
        </Card>
      </section>
      <Card>
        <div className="card-header">
          <div>
            <h2>Recent logs</h2>
            <p>
              {container.source === "demo"
                ? "Clearly labeled simulated log preview"
                : "Read-only provider output"}
            </p>
          </div>
        </div>
        <pre className="log-view">{logs.join("\n")}</pre>
      </Card>
    </>
  );
}
