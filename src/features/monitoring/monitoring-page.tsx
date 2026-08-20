"use client";

import { useMemo, useState } from "react";
import { Activity, Database, Gauge, HardDrive, Network } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { average, downsampleMetrics } from "@/domain/metrics";
import { useApp } from "@/components/app-provider";
import { Badge, Card, PageHeader, SegmentedControl } from "@/components/ui";

type Range = "15m" | "1h" | "6h" | "24h" | "7d";
export function MonitoringPage() {
  const { snapshot } = useApp();
  const [range, setRange] = useState<Range>("24h");
  const [deviceId, setDeviceId] = useState("all");
  const selectedDevices =
    deviceId === "all"
      ? snapshot.devices
      : snapshot.devices.filter((device) => device.id === deviceId);
  const data = useMemo(() => {
    const points =
      selectedDevices[0]?.metricHistory.map((point, index) => ({
        timestamp: point.timestamp,
        cpu: average(
          selectedDevices.map(
            (device) => device.metricHistory[index]?.cpu ?? device.metrics.cpu,
          ),
        ),
        memory: average(
          selectedDevices.map(
            (device) =>
              device.metricHistory[index]?.memory ?? device.metrics.memory,
          ),
        ),
        disk: average(
          selectedDevices.map(
            (device) =>
              device.metricHistory[index]?.disk ?? device.metrics.disk,
          ),
        ),
        latency: average(
          selectedDevices.map(
            (device) =>
              device.metricHistory[index]?.latency ?? device.latencyMs,
          ),
        ),
        networkRx: selectedDevices.reduce(
          (sum, device) =>
            sum +
            (device.metricHistory[index]?.networkRx ??
              device.metrics.networkRx),
          0,
        ),
        networkTx: selectedDevices.reduce(
          (sum, device) =>
            sum +
            (device.metricHistory[index]?.networkTx ??
              device.metrics.networkTx),
          0,
        ),
        temperature: average(
          selectedDevices.flatMap((device) =>
            device.metricHistory[index]?.temperature == null
              ? []
              : [device.metricHistory[index]!.temperature!],
          ),
        ),
      })) ?? [];
    const count =
      range === "15m" ? 2 : range === "1h" ? 5 : range === "6h" ? 25 : 96;
    return downsampleMetrics(
      points.slice(-count) as Parameters<typeof downsampleMetrics>[0],
      64,
    ).map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }, [selectedDevices, range]);
  return (
    <>
      <PageHeader
        eyebrow="Telemetry"
        title="Monitoring"
        description="Historical metrics with bounded local retention and automatic downsampling."
        actions={
          <>
            <select
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              aria-label="Select monitored device"
            >
              <option value="all">Environment average</option>
              {snapshot.devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.displayName}
                </option>
              ))}
            </select>
            <SegmentedControl
              label="Metric time range"
              value={range}
              onChange={setRange}
              options={[
                { value: "15m", label: "15m" },
                { value: "1h", label: "1h" },
                { value: "6h", label: "6h" },
                { value: "24h", label: "24h" },
                { value: "7d", label: "7d" },
              ]}
            />
          </>
        }
      />
      <div className="monitoring-grid">
        <MetricChart
          title="Compute utilization"
          description="CPU and memory percentage"
          icon={<Gauge />}
          data={data}
          keys={[
            { key: "cpu", color: "var(--blue)", label: "CPU" },
            { key: "memory", color: "var(--purple)", label: "Memory" },
          ]}
        />
        <MetricChart
          title="Network throughput"
          description="Combined RX and TX in Mbps"
          icon={<Network />}
          data={data}
          keys={[
            { key: "networkRx", color: "var(--cyan)", label: "Receive" },
            { key: "networkTx", color: "var(--blue)", label: "Transmit" },
          ]}
        />
        <MetricChart
          title="Storage & temperature"
          description="Capacity percentage and °C"
          icon={<HardDrive />}
          data={data}
          keys={[
            { key: "disk", color: "var(--amber)", label: "Disk" },
            { key: "temperature", color: "var(--red)", label: "Temperature" },
          ]}
        />
        <MetricChart
          title="Network latency"
          description="Round trip milliseconds"
          icon={<Activity />}
          data={data}
          keys={[{ key: "latency", color: "var(--green)", label: "Latency" }]}
        />
      </div>
      <Card className="retention-card">
        <Database size={18} />
        <div>
          <strong>Local retention policy</strong>
          <p>
            Raw 15-minute samples are retained for{" "}
            {snapshot.settings.retentionDays} days. Older data is aggregated
            into hourly summaries before raw samples are removed, keeping the
            SQLite database bounded.
          </p>
        </div>
        <Badge tone="info">{snapshot.settings.retentionDays} days</Badge>
      </Card>
    </>
  );
}

function MetricChart({
  title,
  description,
  icon,
  data,
  keys,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  data: Array<Record<string, string | number | null>>;
  keys: Array<{ key: string; color: string; label: string }>;
}) {
  return (
    <Card className="monitor-card">
      <div className="card-header">
        <div className="monitor-title">
          <span>{icon}</span>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: -22, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--border-soft)" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9 }}
              stroke="var(--subtle)"
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 9 }} stroke="var(--subtle)" />
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 10,
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 9 }} />
            {keys.map((item) => (
              <Line
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                dot={false}
                strokeWidth={1.7}
                type="monotone"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
