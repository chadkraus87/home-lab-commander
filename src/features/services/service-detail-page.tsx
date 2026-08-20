"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Globe2,
  Server,
  Timer,
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
import { useApp } from "@/components/app-provider";
import { Badge, Card, StatusBadge } from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils";

export function ServiceDetailPage({ serviceId }: { serviceId: string }) {
  const { snapshot } = useApp();
  const service = snapshot.services.find((item) => item.id === serviceId);
  if (!service)
    return (
      <Card>
        <div className="empty-state">
          <h2>Service not found</h2>
          <Link
            className="button button-primary button-default"
            href="/services"
          >
            Back to services
          </Link>
        </div>
      </Card>
    );
  const host = snapshot.devices.find(
    (device) => device.id === service.deviceId,
  );
  const history = Array.from({ length: 48 }, (_, index) => ({
    time: `${index - 47}h`,
    response: Math.max(
      2,
      service.responseTimeMs * (1 + Math.sin(index / 5) * 0.15),
    ),
    uptime: index % 31 === 0 ? 0 : 1,
  }));
  return (
    <>
      <div className="detail-back">
        <Link href="/services">
          <ArrowLeft size={14} />
          Services
        </Link>
        <span>/</span>
        <span>{service.name}</span>
      </div>
      <header className="service-hero">
        <div className="device-hero-icon">
          <Globe2 />
        </div>
        <div>
          <span>
            <h1>{service.name}</h1>
            <StatusBadge status={service.status} />
            {service.source === "demo" ? (
              <Badge tone="info">Simulated</Badge>
            ) : null}
          </span>
          <p>
            {service.protocol.toUpperCase()} monitor for{" "}
            <code>
              {service.host}:{service.port}
            </code>
          </p>
        </div>
      </header>
      <section className="device-stat-grid">
        <Card className="device-stat">
          <span>
            <Timer />
          </span>
          <div>
            <small>Response time</small>
            <strong>{service.responseTimeMs} ms</strong>
            <em>Latest completed check</em>
          </div>
        </Card>
        <Card className="device-stat">
          <span>
            <CheckCircle2 />
          </span>
          <div>
            <small>Availability</small>
            <strong>{service.uptimePercent.toFixed(2)}%</strong>
            <em>Rolling 30 days</em>
          </div>
        </Card>
        <Card className="device-stat">
          <span>
            <Clock3 />
          </span>
          <div>
            <small>Last checked</small>
            <strong>{formatRelativeTime(service.lastChecked)}</strong>
            <em>{service.healthCheck}</em>
          </div>
        </Card>
        <Card className="device-stat">
          <span>
            <Server />
          </span>
          <div>
            <small>Host</small>
            <strong>{host?.displayName ?? "Unassigned"}</strong>
            <em>{service.type}</em>
          </div>
        </Card>
      </section>
      <section className="device-detail-grid">
        <Card className="device-chart">
          <div className="card-header">
            <div>
              <h2>Response history</h2>
              <p>Simulated 48-hour availability series</p>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <CartesianGrid stroke="var(--border-soft)" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9 }}
                  stroke="var(--subtle)"
                  interval={7}
                />
                <YAxis tick={{ fontSize: 9 }} stroke="var(--subtle)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                  }}
                />
                <Area
                  dataKey="response"
                  type="monotone"
                  stroke="var(--blue)"
                  fill="color-mix(in srgb, var(--blue) 15%, transparent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="card-header">
            <div>
              <h2>Monitor configuration</h2>
              <p>Normalized health-check definition</p>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Protocol</dt>
              <dd>{service.protocol.toUpperCase()}</dd>
            </div>
            <div>
              <dt>Host</dt>
              <dd className="mono">{service.host}</dd>
            </div>
            <div>
              <dt>Port</dt>
              <dd>{service.port}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{service.source}</dd>
            </div>
            <div>
              <dt>Linked device</dt>
              <dd>{host?.displayName ?? "None"}</dd>
            </div>
          </dl>
        </Card>
      </section>
    </>
  );
}
