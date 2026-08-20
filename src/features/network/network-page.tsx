"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cable,
  Cloud,
  Cpu,
  Laptop,
  LocateFixed,
  Network,
  RadioTower,
  Router,
  ScanLine,
  Server,
  Wifi,
  X,
} from "lucide-react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { Device, DeviceType, HealthStatus } from "@/domain/types";
import { useApp } from "@/components/app-provider";
import {
  Button,
  Card,
  PageHeader,
  SegmentedControl,
  StatusBadge,
} from "@/components/ui";

interface TopologyData extends Record<string, unknown> {
  label: string;
  type: DeviceType | "internet";
  status: HealthStatus;
  ip: string;
  deviceId: string | null;
}
type TopologyNode = Node<TopologyData, "device">;
const nodeTypes = { device: DeviceNode };

export function NetworkPage() {
  const { snapshot } = useApp();
  const [filter, setFilter] = useState<
    "all" | "network" | "compute" | "wireless"
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const initialNodes = useMemo(
    () => createNodes(snapshot.devices),
    [snapshot.devices],
  );
  const initialEdges = useMemo(() => createEdges(snapshot), [snapshot]);
  const [nodes, setNodes, onNodesChange] =
    useNodesState<TopologyNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  useEffect(() => {
    setNodes((current) => mergeNodeData(current, initialNodes));
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);
  useEffect(() => {
    const saved = window.localStorage.getItem("homelab-topology-positions");
    if (!saved) return;
    try {
      const positions = JSON.parse(saved) as Record<
        string,
        { x: number; y: number }
      >;
      setNodes((current) =>
        current.map((node) => {
          const savedPosition = positions[node.id];
          return savedPosition ? { ...node, position: savedPosition } : node;
        }),
      );
    } catch {
      window.localStorage.removeItem("homelab-topology-positions");
    }
  }, [setNodes]);
  const visibleNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        hidden: !matchesFilter(node.data.type, filter),
      })),
    [nodes, filter],
  );
  const visibleIds = new Set(
    visibleNodes.filter((node) => !node.hidden).map((node) => node.id),
  );
  const visibleEdges = edges.map((edge) => ({
    ...edge,
    hidden: !visibleIds.has(edge.source) || !visibleIds.has(edge.target),
  }));
  const selected =
    snapshot.devices.find((device) => device.id === selectedId) ?? null;
  const autoLayout = useCallback(() => {
    const laidOut = createNodes(snapshot.devices);
    setNodes(laidOut);
    window.localStorage.setItem(
      "homelab-topology-positions",
      JSON.stringify(
        Object.fromEntries(laidOut.map((node) => [node.id, node.position])),
      ),
    );
  }, [setNodes, snapshot.devices]);
  const savePositions = useCallback(
    () =>
      window.localStorage.setItem(
        "homelab-topology-positions",
        JSON.stringify(
          Object.fromEntries(nodes.map((node) => [node.id, node.position])),
        ),
      ),
    [nodes],
  );

  return (
    <>
      <PageHeader
        eyebrow="Visual operations"
        title="Network topology"
        description="Interactive view of meaningful links across the simulated lab."
        actions={
          <>
            <Button variant="secondary" onClick={autoLayout}>
              <LocateFixed size={14} />
              Auto layout
            </Button>
            <Link
              className="button button-primary button-default"
              href="/settings?section=live"
            >
              <ScanLine size={14} />
              Discover network
            </Link>
          </>
        }
      />
      <Card className="topology-card">
        <div className="topology-toolbar">
          <div>
            <span className="topology-live">
              <i />
              Topology current
            </span>
            <small>
              {snapshot.devices.length} devices · {snapshot.connections.length}{" "}
              links
            </small>
          </div>
          <SegmentedControl
            label="Topology filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "network", label: "Network" },
              { value: "compute", label: "Compute" },
              { value: "wireless", label: "Wireless" },
            ]}
          />
        </div>
        <div className="topology-canvas" data-testid="topology-canvas">
          <ReactFlow<TopologyNode, Edge>
            nodes={visibleNodes}
            edges={visibleEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.data.deviceId)}
            onNodeDragStop={savePositions}
            fitView
            minZoom={0.35}
            maxZoom={1.8}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="var(--border)" gap={24} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) =>
                node.data.status === "healthy"
                  ? "var(--green)"
                  : node.data.status === "degraded"
                    ? "var(--amber)"
                    : "var(--subtle)"
              }
              maskColor="color-mix(in srgb, var(--bg) 78%, transparent)"
            />
          </ReactFlow>
          {selected ? (
            <TopologyPanel
              device={selected}
              services={
                snapshot.services.filter(
                  (service) => service.deviceId === selected.id,
                ).length
              }
              connections={
                snapshot.connections.filter(
                  (connection) =>
                    connection.sourceDeviceId === selected.id ||
                    connection.targetDeviceId === selected.id,
                ).length
              }
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="topology-hint">
              <Network size={14} />
              Select a node to inspect its links and health
            </div>
          )}
        </div>
        <footer className="topology-legend">
          <span>
            <i className="healthy" />
            Healthy
          </span>
          <span>
            <i className="degraded" />
            Degraded
          </span>
          <span>
            <i className="offline" />
            Offline
          </span>
          <em>Positions are saved on this device</em>
        </footer>
      </Card>
    </>
  );
}

function DeviceNode({ data, selected }: NodeProps<TopologyNode>) {
  return (
    <div
      className={`topology-node ${data.status} ${selected ? "selected" : ""}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="topology-node-icon">{iconForType(data.type)}</div>
      <div>
        <strong>{data.label}</strong>
        <small>{data.ip}</small>
      </div>
      <span className="node-status" aria-label={data.status} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function TopologyPanel({
  device,
  services,
  connections,
  onClose,
}: {
  device: Device;
  services: number;
  connections: number;
  onClose: () => void;
}) {
  return (
    <aside className="topology-panel" data-testid="topology-detail-panel">
      <header>
        <div className="device-icon">
          <Server size={16} />
        </div>
        <div>
          <strong>{device.displayName}</strong>
          <small>{device.hostname}</small>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close device details"
        >
          <X size={16} />
        </Button>
      </header>
      <div className="topology-panel-body">
        <StatusBadge status={device.status} />
        <p>{device.description}</p>
        <dl>
          <div>
            <dt>IP address</dt>
            <dd>{device.primaryIp}</dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>{device.interfaces[0]?.subnet ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Interface</dt>
            <dd>{device.interfaces[0]?.name ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Latency</dt>
            <dd>{device.latencyMs.toFixed(1)} ms</dd>
          </div>
          <div>
            <dt>Link state</dt>
            <dd>
              {connections} connection{connections === 1 ? "" : "s"}
            </dd>
          </div>
          <div>
            <dt>Services</dt>
            <dd>{services}</dd>
          </div>
        </dl>
        <Link
          className="button button-primary button-default"
          href={`/devices/${device.id}`}
        >
          Open device
        </Link>
      </div>
    </aside>
  );
}

function createNodes(devices: Device[]): TopologyNode[] {
  const positions: Record<string, { x: number; y: number }> = {
    gateway: { x: 380, y: 100 },
    switch: { x: 380, y: 245 },
    atlas: { x: 100, y: 420 },
    "pi-dns": { x: 290, y: 420 },
    nas: { x: 480, y: 420 },
    "mac-studio": { x: 670, y: 420 },
    ap: { x: 860, y: 420 },
    laptop: { x: 760, y: 570 },
    sensor: { x: 960, y: 570 },
  };
  return [
    {
      id: "internet",
      type: "device",
      position: { x: 380, y: -45 },
      data: {
        label: "Internet",
        type: "internet",
        status: "healthy",
        ip: "WAN uplink",
        deviceId: null,
      },
      draggable: false,
    },
    ...devices.map((device, index) => ({
      id: device.id,
      type: "device" as const,
      position: positions[device.id] ?? {
        x: 100 + (index % 5) * 190,
        y: 420 + Math.floor(index / 5) * 150,
      },
      data: {
        label: device.displayName,
        type: device.type,
        status: device.status,
        ip: device.primaryIp,
        deviceId: device.id,
      },
    })),
  ];
}

function createEdges(snapshot: ReturnType<typeof useApp>["snapshot"]): Edge[] {
  return [
    {
      id: "internet-gateway",
      source: "internet",
      target: "gateway",
      animated: true,
      style: { stroke: "var(--blue)", strokeWidth: 1.5 },
    },
    ...snapshot.connections.map((connection) => ({
      id: connection.id,
      source: connection.sourceDeviceId,
      target: connection.targetDeviceId,
      animated: connection.status === "degraded",
      label: connection.connectionType === "wifi" ? "Wi-Fi" : undefined,
      labelStyle: { fill: "var(--subtle)", fontSize: 9 },
      style: {
        stroke:
          connection.status === "degraded" ? "var(--amber)" : "var(--border)",
        strokeWidth: 1.5,
      },
    })),
  ];
}

function mergeNodeData(
  current: TopologyNode[],
  fresh: TopologyNode[],
): TopologyNode[] {
  return fresh.map((node) => ({
    ...node,
    position:
      current.find((item) => item.id === node.id)?.position ?? node.position,
  }));
}

function matchesFilter(type: TopologyData["type"], filter: string): boolean {
  if (filter === "all" || type === "internet") return true;
  if (filter === "network")
    return ["router", "switch", "access-point"].includes(type);
  if (filter === "wireless")
    return ["access-point", "laptop", "iot"].includes(type);
  return [
    "server",
    "container-host",
    "nas",
    "raspberry-pi",
    "workstation",
  ].includes(type);
}

function iconForType(type: TopologyData["type"]) {
  if (type === "internet") return <Cloud size={17} />;
  if (type === "router") return <Router size={17} />;
  if (type === "switch") return <Cable size={17} />;
  if (type === "access-point") return <RadioTower size={17} />;
  if (type === "laptop" || type === "workstation") return <Laptop size={17} />;
  if (type === "iot") return <Wifi size={17} />;
  if (type === "raspberry-pi") return <Cpu size={17} />;
  return <Server size={17} />;
}
