"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowUpDown,
  Monitor,
  MoreHorizontal,
  Plus,
  Router,
  Search,
  Server,
  Star,
} from "lucide-react";
import type { Device, DeviceType } from "@/domain/types";
import { useApp } from "@/components/app-provider";
import {
  Button,
  Card,
  Field,
  Modal,
  PageHeader,
  ProgressBar,
  SegmentedControl,
  StatusBadge,
} from "@/components/ui";
import { formatPercent, formatRelativeTime, titleCase } from "@/lib/utils";

export function DevicesPage() {
  const { snapshot, mutate, busy } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<"name" | "status" | "cpu">("name");
  const [view, setView] = useState<"table" | "cards">("table");
  const [addOpen, setAddOpen] = useState(false);
  const devices = useMemo(
    () =>
      snapshot.devices
        .filter((device) => {
          const matchesSearch =
            `${device.displayName} ${device.hostname} ${device.primaryIp} ${device.tags.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase());
          return (
            matchesSearch &&
            (status === "all" || device.status === status) &&
            (type === "all" || device.type === type)
          );
        })
        .sort((left, right) =>
          sort === "cpu"
            ? right.metrics.cpu - left.metrics.cpu
            : sort === "status"
              ? left.status.localeCompare(right.status)
              : left.displayName.localeCompare(right.displayName),
        ),
    [snapshot.devices, query, status, type, sort],
  );

  async function addDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await mutate(
      {
        action: "add-device",
        data: {
          displayName: data.get("displayName"),
          hostname: data.get("hostname"),
          primaryIp: data.get("primaryIp"),
          type: data.get("type"),
          location: data.get("location"),
          tags: String(data.get("tags") ?? "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
      },
      "Device added",
    );
    if (ok) setAddOpen(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Asset operations"
        title="Devices"
        description={`${snapshot.devices.length} managed systems across ${snapshot.networks.length} approved networks.`}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={15} />
            Add device
          </Button>
        }
      />
      <Card>
        <div className="toolbar">
          <div className="toolbar-group">
            <div className="input-wrap device-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search devices…"
                aria-label="Search devices"
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="healthy">Healthy</option>
              <option value="degraded">Degraded</option>
              <option value="offline">Offline</option>
              <option value="unknown">Unknown</option>
            </select>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              aria-label="Filter by device type"
            >
              <option value="all">All device types</option>
              {[...new Set(snapshot.devices.map((device) => device.type))].map(
                (deviceType) => (
                  <option key={deviceType} value={deviceType}>
                    {titleCase(deviceType)}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="toolbar-group">
            <Button
              variant="ghost"
              size="small"
              onClick={() =>
                setSort(
                  sort === "name"
                    ? "status"
                    : sort === "status"
                      ? "cpu"
                      : "name",
                )
              }
            >
              <ArrowUpDown size={13} />
              Sort: {sort}
            </Button>
            <SegmentedControl
              label="Device view"
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: "Table" },
                { value: "cards", label: "Cards" },
              ]}
            />
          </div>
        </div>
        {view === "table" ? (
          <DeviceTable devices={devices} />
        ) : (
          <DeviceCards devices={devices} />
        )}
        <footer className="list-footer">
          <span>
            Showing {devices.length} of {snapshot.devices.length} devices
          </span>
          <span>
            Telemetry updates every {snapshot.settings.refreshSeconds} seconds
          </span>
        </footer>
      </Card>
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a managed device"
        description="Manual devices begin in Unknown state until a provider reports telemetry."
      >
        <form onSubmit={addDevice}>
          <div className="form-grid">
            <Field label="Display name">
              <input
                name="displayName"
                required
                maxLength={160}
                placeholder="Build Server"
              />
            </Field>
            <Field label="Hostname">
              <input
                name="hostname"
                required
                pattern="[a-zA-Z0-9.-]+"
                placeholder="build-server.lab"
              />
            </Field>
            <Field
              label="Private IPv4 address"
              hint="Public addresses are rejected."
            >
              <input name="primaryIp" required placeholder="192.168.10.25" />
            </Field>
            <Field label="Device type">
              <select name="type" defaultValue="server">
                {deviceTypes.map((item) => (
                  <option value={item} key={item}>
                    {titleCase(item)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input name="location" placeholder="Rack · Shelf B" />
            </Field>
            <Field label="Tags" hint="Comma-separated">
              <input name="tags" placeholder="compute, development" />
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
              {busy ? "Adding…" : "Add device"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

const deviceTypes: DeviceType[] = [
  "workstation",
  "laptop",
  "server",
  "raspberry-pi",
  "router",
  "switch",
  "access-point",
  "nas",
  "vm",
  "container-host",
  "iot",
  "unknown",
];

function DeviceTable({ devices }: { devices: Device[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table devices-table">
        <thead>
          <tr>
            <th>Device</th>
            <th>Status</th>
            <th>IP address</th>
            <th>Type</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Last seen</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id} data-testid="device-row">
              <td>
                <Link className="table-primary" href={`/devices/${device.id}`}>
                  <DeviceIcon device={device} />
                  <span>
                    {device.displayName}
                    <small>
                      {device.hostname}
                      {device.isFavorite ? " · Favorite" : ""}
                    </small>
                  </span>
                </Link>
              </td>
              <td>
                <StatusBadge status={device.status} />
              </td>
              <td>
                <code>{device.primaryIp}</code>
              </td>
              <td>{titleCase(device.type)}</td>
              <td>
                <MetricCell value={device.metrics.cpu} />
              </td>
              <td>
                <MetricCell value={device.metrics.memory} />
              </td>
              <td>{formatRelativeTime(device.lastSeen)}</td>
              <td>
                <div className="table-actions">
                  <Link
                    className="button button-ghost button-icon"
                    aria-label={`Open ${device.displayName}`}
                    href={`/devices/${device.id}`}
                  >
                    <MoreHorizontal size={16} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeviceCards({ devices }: { devices: Device[] }) {
  return (
    <div className="device-card-grid">
      {devices.map((device) => (
        <Link
          href={`/devices/${device.id}`}
          className="device-card"
          key={device.id}
          data-testid="device-card"
        >
          <header>
            <DeviceIcon device={device} />
            <div>
              <strong>{device.displayName}</strong>
              <small>{device.hostname}</small>
            </div>
            {device.isFavorite ? <Star size={14} fill="currentColor" /> : null}
          </header>
          <div className="device-card-meta">
            <code>{device.primaryIp}</code>
            <StatusBadge status={device.status} />
          </div>
          <div className="device-card-metrics">
            <MetricCell label="CPU" value={device.metrics.cpu} />
            <MetricCell label="Memory" value={device.metrics.memory} />
            <MetricCell label="Disk" value={device.metrics.disk} />
          </div>
          <footer>
            <span>{titleCase(device.type)}</span>
            <span>{device.location}</span>
          </footer>
        </Link>
      ))}
    </div>
  );
}

function MetricCell({ value, label }: { value: number; label?: string }) {
  return (
    <div className="metric-cell">
      {label ? <span>{label}</span> : null}
      <strong>{formatPercent(value)}</strong>
      <ProgressBar
        value={value}
        tone={value > 85 ? "red" : value > 70 ? "amber" : "blue"}
        label={`${label ?? "Resource"}: ${Math.round(value)} percent`}
      />
    </div>
  );
}

function DeviceIcon({ device }: { device: Device }) {
  const Icon =
    device.type === "router" ||
    device.type === "switch" ||
    device.type === "access-point"
      ? Router
      : device.type === "workstation" || device.type === "laptop"
        ? Monitor
        : Server;
  return (
    <div className="device-icon">
      <Icon size={15} />
    </div>
  );
}
