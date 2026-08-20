"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Box,
  CheckCircle2,
  Clock3,
  Cpu,
  Edit3,
  Globe2,
  HardDrive,
  HeartPulse,
  MemoryStick,
  Network,
  Save,
  Server,
  Star,
  Tag,
  TerminalSquare,
  Thermometer,
  Wifi,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HealthCheckResult } from "@/domain/providers";
import { useApp } from "@/components/app-provider";
import {
  Badge,
  Button,
  Card,
  Field,
  Modal,
  ProgressBar,
  StatusBadge,
} from "@/components/ui";
import {
  formatDuration,
  formatPercent,
  formatRelativeTime,
  titleCase,
} from "@/lib/utils";

export function DeviceDetailPage({ deviceId }: { deviceId: string }) {
  const { snapshot, mutate, busy } = useApp();
  const device = snapshot.devices.find((item) => item.id === deviceId);
  const [editOpen, setEditOpen] = useState(false);
  const [notes, setNotes] = useState(device?.notes ?? "");
  const [tags, setTags] = useState(device?.tags.join(", ") ?? "");
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [diagnosticBusy, setDiagnosticBusy] = useState(false);
  const [diagnostic, setDiagnostic] = useState<HealthCheckResult | null>(null);
  const services = snapshot.services.filter(
    (service) => service.deviceId === deviceId,
  );
  const containers = snapshot.containers.filter(
    (container) => container.hostDeviceId === deviceId,
  );
  const events = snapshot.events.filter((event) => event.deviceId === deviceId);
  const chartData = useMemo(
    () =>
      device?.metricHistory.slice(-40).map((point) => ({
        ...point,
        time: new Date(point.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })) ?? [],
    [device?.metricHistory],
  );

  if (!device)
    return (
      <Card>
        <div className="empty-state">
          <h2>Device not found</h2>
          <p>This device may have been removed or the link may be outdated.</p>
          <Link
            className="button button-primary button-default"
            href="/devices"
          >
            Back to devices
          </Link>
        </div>
      </Card>
    );

  async function saveDevice() {
    const ok = await mutate(
      {
        action: "update-device",
        id: deviceId,
        data: {
          notes,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          isFavorite: device?.isFavorite ?? false,
        },
      },
      "Device details updated",
    );
    if (ok) setEditOpen(false);
  }

  async function toggleFavorite() {
    await mutate(
      {
        action: "update-device",
        id: deviceId,
        data: {
          notes: device?.notes ?? "",
          tags: device?.tags ?? [],
          isFavorite: !device?.isFavorite,
        },
      },
      device?.isFavorite ? "Removed from favorites" : "Added to favorites",
    );
  }

  async function runDiagnostic(kind: "ping" | "dns" | "tcp" | "http") {
    setDiagnosticBusy(true);
    setDiagnostic(null);
    const linkedService = services[0];
    try {
      const response = await fetch("/api/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          host: device?.primaryIp,
          port:
            kind === "tcp" || kind === "http"
              ? (linkedService?.port ?? 80)
              : undefined,
          protocol:
            kind === "http"
              ? linkedService?.protocol === "https"
                ? "https"
                : "http"
              : undefined,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          body && typeof body === "object" && "error" in body
            ? String(body.error)
            : "Diagnostic failed",
        );
      setDiagnostic(body as HealthCheckResult);
    } catch (error) {
      setDiagnostic({
        ok: false,
        kind,
        latencyMs: null,
        message: error instanceof Error ? error.message : "Diagnostic failed",
        observed: [],
        likelyExplanation: "The check could not run on this platform.",
        recommendation: "Confirm local permissions and try again.",
      });
    } finally {
      setDiagnosticBusy(false);
    }
  }

  return (
    <>
      <div className="detail-back">
        <Link href="/devices">
          <ArrowLeft size={14} />
          Devices
        </Link>
        <span>/</span>
        <span>{device.displayName}</span>
      </div>
      <header className="device-hero">
        <div className="device-hero-icon">
          <Server />
        </div>
        <div className="device-hero-copy">
          <div>
            <h1>{device.displayName}</h1>
            <StatusBadge status={device.status} />
            {device.source === "demo" ? (
              <Badge tone="info">Simulated</Badge>
            ) : null}
          </div>
          <p>{device.description}</p>
          <span>
            <code>{device.hostname}</code>
            <i>•</i>
            <code>{device.primaryIp}</code>
            <i>•</i>
            {device.operatingSystem}
          </span>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={toggleFavorite}>
            <Star
              size={14}
              fill={device.isFavorite ? "currentColor" : "none"}
            />
            {device.isFavorite ? "Favorite" : "Add favorite"}
          </Button>
          <Button variant="secondary" onClick={() => setDiagnosticOpen(true)}>
            <TerminalSquare size={14} />
            Diagnostics
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Edit3 size={14} />
            Edit notes
          </Button>
        </div>
      </header>
      <section className="device-stat-grid">
        <DeviceStat
          icon={<Clock3 />}
          label="Uptime"
          value={formatDuration(device.uptimeSeconds)}
          detail={`Last seen ${formatRelativeTime(device.lastSeen)}`}
        />
        <DeviceStat
          icon={<Wifi />}
          label="Latency"
          value={`${device.latencyMs.toFixed(1)} ms`}
          detail="Gateway round trip"
        />
        <DeviceStat
          icon={<Network />}
          label="Link"
          value={`${device.interfaces[0]?.speedMbps ?? 0} Mbps`}
          detail={device.interfaces[0]?.name ?? "No interface"}
        />
        <DeviceStat
          icon={<Activity />}
          label="Source"
          value={titleCase(device.source)}
          detail={`First seen ${formatRelativeTime(device.firstSeen)}`}
        />
      </section>
      <section className="device-resource-grid">
        <ResourceCard icon={<Cpu />} label="CPU" value={device.metrics.cpu} />
        <ResourceCard
          icon={<MemoryStick />}
          label="Memory"
          value={device.metrics.memory}
        />
        <ResourceCard
          icon={<HardDrive />}
          label="Disk"
          value={device.metrics.disk}
          warning={device.metrics.disk > 85}
        />
        <ResourceCard
          icon={<Thermometer />}
          label="Temperature"
          value={device.metrics.temperature ?? 0}
          unit="°C"
        />
      </section>
      <section className="device-detail-grid">
        <Card className="device-chart">
          <div className="card-header">
            <div>
              <h2>Resource history</h2>
              <p>CPU and memory · rolling sample</p>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--border-soft)" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9 }}
                  stroke="var(--subtle)"
                  axisLine={false}
                  tickLine={false}
                  interval={9}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9 }}
                  stroke="var(--subtle)"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  dataKey="memory"
                  type="monotone"
                  stroke="var(--purple)"
                  fill="transparent"
                />
                <Area
                  dataKey="cpu"
                  type="monotone"
                  stroke="var(--blue)"
                  fill="color-mix(in srgb, var(--blue) 12%, transparent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="card-header">
            <div>
              <h2>Identity</h2>
              <p>Provider-normalized metadata</p>
            </div>
          </div>
          <dl className="detail-list">
            <Detail label="Vendor" value={device.vendor} />
            <Detail label="Model" value={device.model} />
            <Detail label="Operating system" value={device.operatingSystem} />
            <Detail label="Architecture" value={device.architecture} />
            <Detail label="MAC address" value={device.macAddress} mono />
            <Detail label="Location" value={device.location} />
          </dl>
        </Card>
      </section>
      <section className="device-secondary-grid">
        <Card>
          <div className="card-header">
            <div>
              <h2>Network interfaces</h2>
              <p>Addresses and negotiated links</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Interface</th>
                  <th>Address</th>
                  <th>Subnet</th>
                  <th>Speed</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {device.interfaces.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code>{item.name}</code>
                    </td>
                    <td>
                      <code>{item.ipv4}</code>
                    </td>
                    <td>
                      <code>{item.subnet}</code>
                    </td>
                    <td>{item.speedMbps} Mbps</td>
                    <td>
                      <StatusBadge
                        status={item.state === "up" ? "healthy" : "offline"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <div className="card-header">
            <div>
              <h2>Services & containers</h2>
              <p>Workloads associated with this host</p>
            </div>
          </div>
          <div className="linked-workloads">
            {services.map((service) => (
              <div key={service.id}>
                <div className="service-icon">
                  <Globe2 size={14} />
                </div>
                <span>
                  <strong>{service.name}</strong>
                  <small>
                    {service.protocol.toUpperCase()} · {service.port}
                  </small>
                </span>
                <StatusBadge status={service.status} />
              </div>
            ))}
            {containers.map((container) => (
              <div key={container.id}>
                <div className="service-icon">
                  <Box size={14} />
                </div>
                <span>
                  <strong>{container.name}</strong>
                  <small>{container.image}</small>
                </span>
                <StatusBadge status={container.state} />
              </div>
            ))}
            {services.length + containers.length === 0 ? (
              <p className="inline-empty">
                No workloads are linked to this device.
              </p>
            ) : null}
          </div>
        </Card>
      </section>
      <section className="device-secondary-grid">
        <Card>
          <div className="card-header">
            <div>
              <h2>Device activity</h2>
              <p>Observed events for this system</p>
            </div>
          </div>
          <div className="timeline">
            {events.slice(0, 8).map((event) => (
              <div className="timeline-item" key={event.id}>
                <span className={`timeline-dot ${event.severity}`} />
                <div>
                  <strong>{event.message}</strong>
                  <small>
                    {event.source} · {formatRelativeTime(event.timestamp)}
                  </small>
                </div>
              </div>
            ))}
            {events.length === 0 ? (
              <p className="inline-empty">No device-specific events yet.</p>
            ) : null}
          </div>
        </Card>
        <Card>
          <div className="card-header">
            <div>
              <h2>Notes & tags</h2>
              <p>Local operating context</p>
            </div>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setEditOpen(true)}
            >
              <Edit3 size={13} />
              Edit
            </Button>
          </div>
          <div className="notes-card-body">
            <div className="tag-list">
              {device.tags.map((tag) => (
                <Badge key={tag}>
                  <Tag size={10} />
                  {tag}
                </Badge>
              ))}
            </div>
            <p>
              {device.notes ||
                "No device notes yet. Add recovery context, ownership, or maintenance reminders."}
            </p>
          </div>
        </Card>
      </section>
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Device notes and tags"
        description="Store useful operating context. Do not record passwords or secrets."
      >
        <div className="form-grid">
          <Field label="Tags" hint="Comma-separated">
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={8}
            />
          </Field>
        </div>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={saveDevice}>
            <Save size={14} />
            Save
          </Button>
        </div>
      </Modal>
      <Modal
        open={diagnosticOpen}
        onClose={() => {
          setDiagnosticOpen(false);
          setDiagnostic(null);
        }}
        title={`Safe diagnostics · ${device.displayName}`}
        description="Only predefined checks run against this device's private address. No arbitrary commands are accepted."
      >
        <div className="diagnostic-buttons">
          <Button
            variant="secondary"
            disabled={diagnosticBusy}
            onClick={() => runDiagnostic("ping")}
          >
            Ping
          </Button>
          <Button
            variant="secondary"
            disabled={diagnosticBusy}
            onClick={() => runDiagnostic("dns")}
          >
            DNS lookup
          </Button>
          <Button
            variant="secondary"
            disabled={diagnosticBusy}
            onClick={() => runDiagnostic("tcp")}
          >
            TCP port
          </Button>
          <Button
            variant="secondary"
            disabled={diagnosticBusy}
            onClick={() => runDiagnostic("http")}
          >
            HTTP check
          </Button>
        </div>
        {diagnosticBusy ? (
          <div className="diagnostic-loading">
            <HeartPulse className="spin" />
            Running bounded local check…
          </div>
        ) : null}
        {diagnostic ? (
          <div
            className={`diagnostic-result ${diagnostic.ok ? "ok" : "failed"}`}
          >
            <header>
              {diagnostic.ok ? <CheckCircle2 /> : <HeartPulse />}
              <div>
                <strong>{diagnostic.message}</strong>
                {diagnostic.latencyMs ? (
                  <small>{diagnostic.latencyMs.toFixed(1)} ms measured</small>
                ) : null}
              </div>
            </header>
            <section>
              <h3>Observed</h3>
              {diagnostic.observed.map((item) => (
                <p key={item}>• {item}</p>
              ))}
              <h3>Likely explanation</h3>
              <p>{diagnostic.likelyExplanation ?? "No fault observed."}</p>
              <h3>Recommendation</h3>
              <p>{diagnostic.recommendation}</p>
            </section>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function DeviceStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="device-stat">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </Card>
  );
}
function ResourceCard({
  icon,
  label,
  value,
  unit = "%",
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit?: string;
  warning?: boolean;
}) {
  return (
    <Card className="device-resource">
      <div>
        <span>{icon}</span>
        <small>{label}</small>
      </div>
      <strong>
        {unit === "%" ? formatPercent(value) : `${Math.round(value)}${unit}`}
      </strong>
      <ProgressBar
        value={unit === "%" ? value : Math.min(100, value)}
        tone={warning || value > 85 ? "amber" : "blue"}
        label={`${label}: ${value}${unit}`}
      />
    </Card>
  );
}
function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? "mono" : ""}>{value}</dd>
    </div>
  );
}
