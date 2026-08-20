"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  CheckCircle2,
  CircleOff,
  Cpu,
  Gauge,
  MemoryStick,
  Network,
  Radio,
  Server,
  ShieldCheck,
  TriangleAlert,
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
import { calculateHealthScore } from "@/domain/health";
import { average } from "@/domain/metrics";
import { useApp } from "@/components/app-provider";
import {
  Badge,
  Card,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from "@/components/ui";
import { formatPercent, formatRelativeTime } from "@/lib/utils";

export function OverviewPage() {
  const { snapshot } = useApp();
  const health = calculateHealthScore(snapshot);
  const online = snapshot.devices.filter(
    (device) => device.status === "healthy",
  ).length;
  const offline = snapshot.devices.filter(
    (device) => device.status === "offline",
  ).length;
  const degraded = snapshot.devices.filter(
    (device) => device.status === "degraded",
  ).length;
  const healthyServices = snapshot.services.filter(
    (service) => service.status === "healthy",
  ).length;
  const running = snapshot.containers.filter(
    (container) => container.state === "running",
  ).length;
  const activeAlerts = snapshot.alerts.filter(
    (alert) => alert.status === "active",
  );
  const avgCpu = average(snapshot.devices.map((device) => device.metrics.cpu));
  const avgMemory = average(
    snapshot.devices.map((device) => device.metrics.memory),
  );
  const avgDisk = average(
    snapshot.devices.map((device) => device.metrics.disk),
  );
  const totalNetwork = snapshot.devices.reduce(
    (sum, device) => sum + device.metrics.networkRx + device.metrics.networkTx,
    0,
  );
  const history =
    snapshot.devices[0]?.metricHistory.map((point, index) => ({
      timestamp: new Date(point.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      cpu: average(
        snapshot.devices.map(
          (device) => device.metricHistory[index]?.cpu ?? device.metrics.cpu,
        ),
      ),
      memory: average(
        snapshot.devices.map(
          (device) =>
            device.metricHistory[index]?.memory ?? device.metrics.memory,
        ),
      ),
    })) ?? [];
  return (
    <>
      <PageHeader
        eyebrow={
          snapshot.hostedDemo ? "Hosted product showcase" : "Live command view"
        }
        title="Infrastructure overview"
        description={
          snapshot.hostedDemo
            ? "Explore a fully interactive simulated homelab. Showcase changes are temporary and reset automatically."
            : "Current health, capacity, and activity across your simulated homelab."
        }
        actions={
          <>
            <Badge tone="info">
              <Radio size={12} />
              {snapshot.hostedDemo
                ? "Hosted Demo · Auto-reset"
                : "Demo Environment Active"}
            </Badge>
            {snapshot.hostedDemo ? (
              <Link
                className="button button-secondary button-default"
                href="/settings?section=live"
              >
                How this demo works
                <ArrowRight size={14} />
              </Link>
            ) : (
              <Link
                className="button button-secondary button-default"
                href="/settings?section=live"
              >
                Configure live mode
                <ArrowRight size={14} />
              </Link>
            )}
          </>
        }
      />
      <section className="summary-grid" aria-label="Environment summary">
        <SummaryCard
          label="Managed devices"
          value={snapshot.devices.length}
          detail={`${online} online · ${degraded} degraded`}
          icon={<Server />}
          tone="blue"
          trend="All collectors reporting"
        />
        <SummaryCard
          label="Healthy services"
          value={`${healthyServices}/${snapshot.services.length}`}
          detail={`${snapshot.services.filter((item) => item.status === "degraded").length} degraded`}
          icon={<Wifi />}
          tone="green"
          trend="99.94% availability"
        />
        <SummaryCard
          label="Running containers"
          value={`${running}/${snapshot.containers.length}`}
          detail={`${snapshot.containers.filter((item) => item.state === "unhealthy").length} unhealthy`}
          icon={<Box />}
          tone="purple"
          trend="2 restarts today"
        />
        <SummaryCard
          label="Active alerts"
          value={activeAlerts.length}
          detail={`${activeAlerts.filter((item) => item.severity === "critical").length} critical · ${activeAlerts.filter((item) => item.severity === "warning").length} warning`}
          icon={<AlertTriangle />}
          tone="amber"
          trend={
            activeAlerts.length ? "Review recommended" : "No action needed"
          }
        />
      </section>
      <section className="overview-main-grid">
        <Card className="health-score-card">
          <div className="card-header">
            <div>
              <h2>Infrastructure health score</h2>
              <p>Weighted by availability, alerts, and workload state</p>
            </div>
            <Badge tone={health.score >= 85 ? "positive" : "warning"}>
              {health.label}
            </Badge>
          </div>
          <div className="health-score-body">
            <div
              className="score-ring"
              style={
                { "--score": `${health.score * 3.6}deg` } as React.CSSProperties
              }
            >
              <div>
                <strong>{health.score}</strong>
                <span>/ 100</span>
              </div>
            </div>
            <div className="factor-list">
              {health.factors.map((factor) => (
                <div className="factor-row" key={factor.label}>
                  <span>
                    {factor.impact === 0 ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <TriangleAlert size={14} />
                    )}
                  </span>
                  <div>
                    <strong>{factor.label}</strong>
                    <small>{factor.detail}</small>
                  </div>
                  <em>{factor.impact}</em>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="resource-chart-card">
          <div className="card-header">
            <div>
              <h2>Resource utilization</h2>
              <p>Environment average · last 24 hours</p>
            </div>
            <div className="chart-legend">
              <span className="cpu">CPU</span>
              <span className="memory">Memory</span>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={history.slice(-32)}
                margin={{ top: 10, right: 8, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cpu-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0"
                      stopColor="var(--blue)"
                      stopOpacity={0.35}
                    />
                    <stop offset="1" stopColor="var(--blue)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="memory-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0"
                      stopColor="var(--purple)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="1"
                      stopColor="var(--purple)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-soft)" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  stroke="var(--subtle)"
                  tick={{ fontSize: 9 }}
                  interval={7}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="var(--subtle)"
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="var(--purple)"
                  fill="url(#memory-fill)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="var(--blue)"
                  fill="url(#cpu-fill)"
                  strokeWidth={1.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
      <section className="resource-grid">
        <ResourceMeter
          icon={<Cpu />}
          label="Average CPU"
          value={avgCpu}
          detail="Across 9 devices"
        />
        <ResourceMeter
          icon={<MemoryStick />}
          label="Average memory"
          value={avgMemory}
          detail="25.8 GB allocated"
        />
        <ResourceMeter
          icon={<Gauge />}
          label="Storage used"
          value={avgDisk}
          detail="NAS requires attention"
          warning={avgDisk > 70}
        />
        <ResourceMeter
          icon={<Network />}
          label="Network throughput"
          value={Math.min(100, totalNetwork / 10)}
          display={`${totalNetwork.toFixed(0)} Mbps`}
          detail="Combined RX + TX"
        />
      </section>
      <section className="overview-lower-grid">
        <Card>
          <div className="card-header">
            <div>
              <h2>Network health</h2>
              <p>Core path and supporting services</p>
            </div>
            <Link href="/network">
              View topology <ArrowRight size={12} />
            </Link>
          </div>
          <div className="network-checks">
            <NetworkCheck
              icon={<Network />}
              label="Gateway"
              detail="192.168.10.1"
              value="0.8 ms"
              status="healthy"
            />
            <NetworkCheck
              icon={<Wifi />}
              label="Internet"
              detail="WAN uplink"
              value="Online"
              status="healthy"
            />
            <NetworkCheck
              icon={<ShieldCheck />}
              label="DNS"
              detail="Pi-hole + Unbound"
              value="5 ms"
              status="healthy"
            />
            <NetworkCheck
              icon={<Activity />}
              label="Packet loss"
              detail="Last 15 minutes"
              value="0.0%"
              status="healthy"
            />
          </div>
        </Card>
        <Card>
          <div className="card-header">
            <div>
              <h2>Active alerts</h2>
              <p>Prioritized issues needing attention</p>
            </div>
            <Link href="/alerts">
              Open alerts <ArrowRight size={12} />
            </Link>
          </div>
          <div className="compact-list">
            {activeAlerts.slice(0, 4).map((alert) => (
              <Link className="compact-alert" href="/alerts" key={alert.id}>
                <span className={`severity-bar ${alert.severity}`} />
                <div>
                  <strong>{alert.title}</strong>
                  <small>
                    {alert.category} · {formatRelativeTime(alert.lastTriggered)}
                  </small>
                </div>
                <StatusBadge status={alert.severity} />
              </Link>
            ))}
            {activeAlerts.length === 0 ? (
              <div className="list-success">
                <CheckCircle2 />
                No active alerts
              </div>
            ) : null}
          </div>
        </Card>
        <Card>
          <div className="card-header">
            <div>
              <h2>Recent activity</h2>
              <p>Latest infrastructure events</p>
            </div>
            <Link href="/activity">
              Full timeline <ArrowRight size={12} />
            </Link>
          </div>
          <div className="timeline compact">
            {snapshot.events.slice(0, 6).map((event) => (
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
          </div>
        </Card>
        <Card>
          <div className="card-header">
            <div>
              <h2>Favorite devices</h2>
              <p>Quick access to core infrastructure</p>
            </div>
            <Link href="/devices">
              All devices <ArrowRight size={12} />
            </Link>
          </div>
          <div className="favorite-list">
            {snapshot.devices
              .filter((device) => device.isFavorite)
              .map((device) => (
                <Link
                  href={`/devices/${device.id}`}
                  className="favorite-device"
                  key={device.id}
                >
                  <div className="device-icon">
                    <Server size={15} />
                  </div>
                  <div>
                    <strong>{device.displayName}</strong>
                    <small>{device.primaryIp}</small>
                  </div>
                  <div className="favorite-metric">
                    <span>{formatPercent(device.metrics.cpu)} CPU</span>
                    <StatusBadge status={device.status} />
                  </div>
                </Link>
              ))}
          </div>
        </Card>
      </section>
      {offline > 0 ? (
        <div className="overview-notice">
          <CircleOff size={16} />
          <span>
            {offline} device{offline === 1 ? " is" : "s are"} currently offline.
          </span>
        </div>
      ) : null}
    </>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  tone,
  trend,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  tone: string;
  trend: string;
}) {
  return (
    <Card className="summary-card">
      <div className={`summary-icon ${tone}`}>{icon}</div>
      <div className="summary-value">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <div className="summary-trend">{trend}</div>
    </Card>
  );
}

function ResourceMeter({
  icon,
  label,
  value,
  display,
  detail,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  display?: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <Card className="resource-meter">
      <div className="resource-label">
        <span>{icon}</span>
        <div>
          <strong>{label}</strong>
          <small>{detail}</small>
        </div>
      </div>
      <div className="resource-value">
        <strong>{display ?? formatPercent(value)}</strong>
        <ProgressBar
          value={value}
          tone={warning ? "amber" : value > 80 ? "red" : "blue"}
          label={`${label}: ${Math.round(value)} percent`}
        />
      </div>
    </Card>
  );
}

function NetworkCheck({
  icon,
  label,
  detail,
  value,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  value: string;
  status: string;
}) {
  return (
    <div className="network-check">
      <div className="network-check-icon">{icon}</div>
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
      <span>{value}</span>
      <StatusBadge status={status} />
    </div>
  );
}
