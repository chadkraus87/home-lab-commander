"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CheckCheck,
  ExternalLink,
  Info,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  SegmentedControl,
  StatusBadge,
} from "@/components/ui";
import { formatRelativeTime, titleCase } from "@/lib/utils";

type AlertFilter = "active" | "acknowledged" | "resolved" | "all";
export function AlertsPage() {
  const { snapshot, mutate, busy } = useApp();
  const [filter, setFilter] = useState<AlertFilter>("active");
  const [severity, setSeverity] = useState("all");
  const [query, setQuery] = useState("");
  const alerts = useMemo(
    () =>
      snapshot.alerts.filter(
        (alert) =>
          (filter === "all" || alert.status === filter) &&
          (severity === "all" || alert.severity === severity) &&
          `${alert.title} ${alert.description} ${alert.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [snapshot.alerts, filter, severity, query],
  );
  return (
    <>
      <PageHeader
        eyebrow="Response queue"
        title="Alerts"
        description="Deduplicated infrastructure signals with acknowledgement and resolution history."
        actions={
          <Badge
            tone={
              snapshot.alerts.some(
                (alert) =>
                  alert.status === "active" && alert.severity === "critical",
              )
                ? "critical"
                : "positive"
            }
          >
            <ShieldAlert size={12} />
            {
              snapshot.alerts.filter((alert) => alert.status === "active")
                .length
            }{" "}
            active
          </Badge>
        }
      />
      <section className="alert-summary">
        <AlertSummary
          severity="critical"
          value={
            snapshot.alerts.filter(
              (item) =>
                item.status === "active" && item.severity === "critical",
            ).length
          }
          icon={<AlertCircle />}
        />
        <AlertSummary
          severity="warning"
          value={
            snapshot.alerts.filter(
              (item) => item.status === "active" && item.severity === "warning",
            ).length
          }
          icon={<AlertTriangle />}
        />
        <AlertSummary
          severity="info"
          value={
            snapshot.alerts.filter(
              (item) => item.status === "active" && item.severity === "info",
            ).length
          }
          icon={<Info />}
        />
        <AlertSummary
          severity="resolved"
          value={
            snapshot.alerts.filter((item) => item.status === "resolved").length
          }
          icon={<CheckCircle2 />}
        />
      </section>
      <Card>
        <div className="toolbar">
          <div className="toolbar-group">
            <div className="input-wrap device-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search alerts…"
                aria-label="Search alerts"
              />
            </div>
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              aria-label="Filter alert severity"
            >
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          <SegmentedControl
            label="Alert state"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "active", label: "Active" },
              { value: "acknowledged", label: "Acknowledged" },
              { value: "resolved", label: "Resolved" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        <div className="alert-list">
          {alerts.map((alert) => {
            const device = snapshot.devices.find(
              (item) => item.id === alert.deviceId,
            );
            return (
              <article
                className={`alert-row severity-${alert.severity}`}
                key={alert.id}
                data-testid="alert-row"
              >
                <div className="alert-row-icon">
                  {alert.severity === "critical" ? (
                    <AlertCircle />
                  ) : alert.severity === "warning" ? (
                    <AlertTriangle />
                  ) : (
                    <Info />
                  )}
                </div>
                <div className="alert-row-copy">
                  <header>
                    <strong>{alert.title}</strong>
                    <StatusBadge status={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </header>
                  <p>{alert.description}</p>
                  <footer>
                    <span>{titleCase(alert.category)}</span>
                    <i>•</i>
                    <span>
                      Triggered {formatRelativeTime(alert.firstTriggered)}
                    </span>
                    <i>•</i>
                    <span>
                      Last seen {formatRelativeTime(alert.lastTriggered)}
                    </span>
                    {device ? (
                      <>
                        <i>•</i>
                        <Link href={`/devices/${device.id}`}>
                          {device.displayName}
                          <ExternalLink size={10} />
                        </Link>
                      </>
                    ) : null}
                  </footer>
                </div>
                <div className="alert-row-actions">
                  {alert.status === "active" ? (
                    <Button
                      variant="secondary"
                      size="small"
                      disabled={busy}
                      onClick={() =>
                        mutate(
                          { action: "acknowledge-alert", id: alert.id },
                          "Alert acknowledged",
                        )
                      }
                    >
                      <CheckCheck size={13} />
                      Acknowledge
                    </Button>
                  ) : null}
                  {alert.status !== "resolved" ? (
                    <Button
                      variant="ghost"
                      size="small"
                      disabled={busy}
                      onClick={() =>
                        mutate(
                          { action: "resolve-alert", id: alert.id },
                          "Alert resolved",
                        )
                      }
                    >
                      <CheckCircle2 size={13} />
                      Resolve
                    </Button>
                  ) : (
                    <span>
                      Resolved{" "}
                      {alert.resolvedAt
                        ? formatRelativeTime(alert.resolvedAt)
                        : ""}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
          {alerts.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={24} />
              <h3>No alerts match this view</h3>
              <p>Change the filters or enjoy the quiet.</p>
            </div>
          ) : null}
        </div>
        <footer className="list-footer">
          <span>{alerts.length} alerts shown</span>
          <span>
            Identical active alerts share one fingerprint and update their
            last-seen time
          </span>
        </footer>
      </Card>
    </>
  );
}

function AlertSummary({
  severity,
  value,
  icon,
}: {
  severity: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className={`alert-summary-card ${severity}`}>
      {icon}
      <div>
        <small>{severity}</small>
        <strong>{value}</strong>
      </div>
    </Card>
  );
}
