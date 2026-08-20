"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  Plus,
  Search,
  Server,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import {
  Button,
  Card,
  Field,
  Modal,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils";

export function ServicesPage() {
  const { snapshot, mutate, busy } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [checkMessage, setCheckMessage] = useState<Record<string, string>>({});
  const services = useMemo(
    () =>
      snapshot.services.filter(
        (service) =>
          `${service.name} ${service.host} ${service.type}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (status === "all" || service.status === status),
      ),
    [snapshot.services, query, status],
  );
  const healthy = snapshot.services.filter(
    (service) => service.status === "healthy",
  ).length;

  async function addService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await mutate(
      {
        action: "add-service",
        data: {
          name: data.get("name"),
          deviceId: data.get("deviceId") || null,
          host: data.get("host"),
          port: data.get("port"),
          protocol: data.get("protocol"),
        },
      },
      "Service monitor created",
    );
    if (ok) setAddOpen(false);
  }

  async function check(id: string) {
    const service = snapshot.services.find((item) => item.id === id);
    if (!service) return;
    setChecking(id);
    try {
      const kind =
        service.protocol === "dns"
          ? "dns"
          : service.protocol === "tcp"
            ? "tcp"
            : "http";
      const response = await fetch("/api/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          host: service.host,
          port: service.port,
          protocol: service.protocol === "https" ? "https" : "http",
        }),
      });
      const body = (await response.json()) as {
        message?: string;
        error?: string;
      };
      setCheckMessage((current) => ({
        ...current,
        [id]: body.message ?? body.error ?? "Check complete",
      }));
    } catch {
      setCheckMessage((current) => ({
        ...current,
        [id]: "Local check unavailable",
      }));
    } finally {
      setChecking(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Availability"
        title="Services"
        description="Safe HTTP, TCP, and DNS checks across configured lab workloads."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={15} />
            Add service
          </Button>
        }
      />
      <section className="operations-summary">
        <Card>
          <CheckCircle2 />
          <span>
            <small>Healthy</small>
            <strong>{healthy}</strong>
          </span>
        </Card>
        <Card>
          <Activity />
          <span>
            <small>Degraded</small>
            <strong>
              {
                snapshot.services.filter((item) => item.status === "degraded")
                  .length
              }
            </strong>
          </span>
        </Card>
        <Card>
          <ShieldCheck />
          <span>
            <small>Down</small>
            <strong>
              {
                snapshot.services.filter((item) => item.status === "down")
                  .length
              }
            </strong>
          </span>
        </Card>
        <Card>
          <Clock3 />
          <span>
            <small>Average response</small>
            <strong>
              {Math.round(
                snapshot.services.reduce(
                  (sum, item) => sum + item.responseTimeMs,
                  0,
                ) / snapshot.services.length,
              )}{" "}
              ms
            </strong>
          </span>
        </Card>
      </section>
      <Card>
        <div className="toolbar">
          <div className="toolbar-group">
            <div className="input-wrap device-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search services…"
                aria-label="Search services"
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter services"
            >
              <option value="all">All statuses</option>
              <option value="healthy">Healthy</option>
              <option value="degraded">Degraded</option>
              <option value="down">Down</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <span className="toolbar-note">
            Checks are read-only and local-network restricted
          </span>
        </div>
        <div className="table-wrap">
          <table className="data-table services-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Endpoint</th>
                <th>Response</th>
                <th>Availability</th>
                <th>Last checked</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>
                    <Link
                      className="table-primary"
                      href={`/services/${service.id}`}
                    >
                      <div className="service-icon">
                        {service.type === "database" ? (
                          <Database size={15} />
                        ) : service.protocol === "http" ||
                          service.protocol === "https" ? (
                          <Globe2 size={15} />
                        ) : (
                          <Server size={15} />
                        )}
                      </div>
                      <span>
                        {service.name}
                        <small>{service.type}</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={service.status} />
                  </td>
                  <td>
                    <code>
                      {service.host}:{service.port}
                    </code>
                    <small className="protocol-label">{service.protocol}</small>
                  </td>
                  <td>{service.responseTimeMs} ms</td>
                  <td>{service.uptimePercent.toFixed(2)}%</td>
                  <td>{formatRelativeTime(service.lastChecked)}</td>
                  <td>
                    <div className="table-actions">
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => check(service.id)}
                        disabled={checking === service.id}
                      >
                        {checking === service.id ? "Checking…" : "Check now"}
                      </Button>
                      <Link
                        className="button button-ghost button-icon"
                        href={`/services/${service.id}`}
                        aria-label={`Open ${service.name}`}
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                    {checkMessage[service.id] ? (
                      <span className="inline-check-message">
                        {checkMessage[service.id]}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="list-footer">
          <span>{services.length} services shown</span>
          <span>
            Availability history retained for {snapshot.settings.retentionDays}{" "}
            days
          </span>
        </footer>
      </Card>
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create a service monitor"
        description="The first check runs only after the service is saved."
      >
        <form onSubmit={addService}>
          <div className="form-grid">
            <Field label="Service name">
              <input name="name" required placeholder="Home Assistant" />
            </Field>
            <Field label="Associated device">
              <select name="deviceId" defaultValue="">
                <option value="">Unassigned</option>
                {snapshot.devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.displayName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Private host or hostname">
              <input name="host" required placeholder="192.168.10.25" />
            </Field>
            <Field label="Port">
              <input
                name="port"
                required
                type="number"
                min={1}
                max={65535}
                defaultValue={80}
              />
            </Field>
            <Field label="Protocol">
              <select name="protocol" defaultValue="http">
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="tcp">TCP</option>
                <option value="dns">DNS</option>
              </select>
            </Field>
          </div>
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Create monitor"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
