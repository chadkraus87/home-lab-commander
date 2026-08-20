import type { z } from "zod";
import type {
  AppSnapshot,
  Device,
  EventRecord,
  InventoryItem,
  LabNote,
  MonitoredService,
} from "@/domain/types";
import { mutationSchema } from "@/domain/schemas";
import { createDemoSnapshot } from "@/simulation/demo-data";

export const hostedSessionStorageKey = "homelab-commander:hosted-session:v1";

type Mutation = z.infer<typeof mutationSchema>;

export type HostedMutationResult =
  { ok: true; snapshot: AppSnapshot } | { ok: false; error: string };

interface HostedMutationOptions {
  now?: string;
  createId?: () => string;
}

export function applyHostedMutation(
  current: AppSnapshot,
  input: unknown,
  options: HostedMutationOptions = {},
): HostedMutationResult {
  const parsed = mutationSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Check the highlighted information and try again.",
    };

  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => globalThis.crypto.randomUUID());
  const mutation = parsed.data;

  switch (mutation.action) {
    case "add-device": {
      if (
        current.devices.some(
          (device) => device.primaryIp === mutation.data.primaryIp,
        )
      )
        return {
          ok: false,
          error: "A device with that IP address already exists.",
        };
      const id = `device-${createId()}`;
      const device: Device = {
        id,
        hostname: mutation.data.hostname,
        displayName: mutation.data.displayName,
        description: "",
        type: mutation.data.type,
        vendor: "Unknown",
        model: "Unknown",
        operatingSystem: "Unknown",
        architecture: "Unknown",
        primaryIp: mutation.data.primaryIp,
        macAddress: "Unknown",
        status: "unknown",
        lastSeen: now,
        firstSeen: now,
        location: mutation.data.location,
        tags: mutation.data.tags,
        notes: "",
        isFavorite: false,
        source: "manual",
        createdAt: now,
        updatedAt: now,
        uptimeSeconds: 0,
        latencyMs: 0,
        metrics: {
          cpu: 0,
          memory: 0,
          disk: 0,
          temperature: null,
          networkRx: 0,
          networkTx: 0,
        },
        metricHistory: [],
        interfaces: [],
      };
      return success(current, now, {
        devices: [...current.devices, device],
        events: [
          ...current.events,
          makeEvent(
            `event-${createId()}`,
            id,
            "device.added",
            `${device.displayName} was added manually`,
            now,
          ),
        ],
      });
    }
    case "update-device": {
      if (!current.devices.some((device) => device.id === mutation.id))
        return { ok: false, error: "Device not found." };
      return success(current, now, {
        devices: current.devices.map((device) =>
          device.id === mutation.id
            ? {
                ...device,
                ...mutation.data,
                updatedAt: now,
              }
            : device,
        ),
      });
    }
    case "add-service": {
      const id = `service-${createId()}`;
      const { data } = mutation;
      if (
        data.deviceId &&
        !current.devices.some((device) => device.id === data.deviceId)
      )
        return { ok: false, error: "Device not found." };
      const service: MonitoredService = {
        id,
        deviceId: data.deviceId,
        name: data.name,
        type: "custom",
        host: data.host,
        port: data.port,
        protocol: data.protocol,
        url:
          data.protocol === "http" || data.protocol === "https"
            ? `${data.protocol}://${data.host}:${data.port}`
            : null,
        status: "unknown",
        responseTimeMs: 0,
        uptimePercent: 0,
        lastChecked: now,
        healthCheck: `${data.protocol.toUpperCase()} ${data.host}:${data.port}`,
        source: "manual",
      };
      return success(current, now, {
        services: [...current.services, service],
        events: [
          ...current.events,
          makeEvent(
            `event-${createId()}`,
            data.deviceId,
            "service.added",
            `${data.name} monitoring was configured`,
            now,
          ),
        ],
      });
    }
    case "acknowledge-alert":
    case "resolve-alert": {
      if (!current.alerts.some((alert) => alert.id === mutation.id))
        return { ok: false, error: "Alert not found." };
      const acknowledged = mutation.action === "acknowledge-alert";
      return success(current, now, {
        alerts: current.alerts.map((alert) =>
          alert.id === mutation.id
            ? {
                ...alert,
                status: acknowledged ? "acknowledged" : "resolved",
                acknowledgedAt: acknowledged ? now : alert.acknowledgedAt,
                resolvedAt: acknowledged ? alert.resolvedAt : now,
              }
            : alert,
        ),
      });
    }
    case "save-inventory": {
      if (
        mutation.id &&
        !current.inventory.some((item) => item.id === mutation.id)
      )
        return { ok: false, error: "Inventory item not found." };
      const inventory = mutation.id
        ? current.inventory.map((item) =>
            item.id === mutation.id
              ? inventoryFromMutation(
                  mutation.id,
                  mutation.data,
                  item.createdAt,
                  now,
                )
              : item,
          )
        : [
            ...current.inventory,
            inventoryFromMutation(
              `inventory-${createId()}`,
              mutation.data,
              now,
              now,
            ),
          ];
      return success(current, now, { inventory });
    }
    case "archive-inventory": {
      if (!current.inventory.some((item) => item.id === mutation.id))
        return { ok: false, error: "Inventory item not found." };
      return success(current, now, {
        inventory: current.inventory.map((item) =>
          item.id === mutation.id
            ? { ...item, status: "archived", updatedAt: now }
            : item,
        ),
      });
    }
    case "save-note": {
      if (mutation.id && !current.notes.some((note) => note.id === mutation.id))
        return { ok: false, error: "Lab note not found." };
      const notes = mutation.id
        ? current.notes.map((note) =>
            note.id === mutation.id
              ? noteFromMutation(
                  mutation.id,
                  mutation.data,
                  note.createdAt,
                  now,
                )
              : note,
          )
        : [
            ...current.notes,
            noteFromMutation(`note-${createId()}`, mutation.data, now, now),
          ];
      return success(current, now, { notes });
    }
    case "delete-note": {
      if (!current.notes.some((note) => note.id === mutation.id))
        return { ok: false, error: "Lab note not found." };
      return success(current, now, {
        notes: current.notes.filter((note) => note.id !== mutation.id),
      });
    }
    case "update-settings":
      return success(current, now, {
        settings: { ...mutation.data, mode: "demo" },
      });
    case "reset-demo": {
      const reset = createDemoSnapshot(new Date(now));
      return {
        ok: true,
        snapshot: { ...reset, hostedDemo: true },
      };
    }
  }
}

export function parseHostedSession(
  value: string | null,
  fallback: AppSnapshot,
): AppSnapshot {
  if (!value) return fallback;
  try {
    const candidate: unknown = JSON.parse(value);
    if (
      !candidate ||
      typeof candidate !== "object" ||
      !("hostedDemo" in candidate) ||
      candidate.hostedDemo !== true ||
      !("settings" in candidate) ||
      !candidate.settings ||
      typeof candidate.settings !== "object" ||
      !("mode" in candidate.settings) ||
      candidate.settings.mode !== "demo" ||
      !hasSnapshotArrays(candidate)
    )
      return fallback;
    return candidate as AppSnapshot;
  } catch {
    return fallback;
  }
}

function hasSnapshotArrays(candidate: object): boolean {
  const record = candidate as Record<string, unknown>;
  const arrays = [
    "devices",
    "services",
    "containers",
    "alerts",
    "events",
    "networks",
    "connections",
    "inventory",
    "notes",
  ];
  return arrays.every((key) => key in record && Array.isArray(record[key]));
}

function success(
  current: AppSnapshot,
  now: string,
  patch: Partial<AppSnapshot>,
): HostedMutationResult {
  return {
    ok: true,
    snapshot: {
      ...current,
      ...patch,
      hostedDemo: true,
      generatedAt: now,
      settings: {
        ...(patch.settings ?? current.settings),
        mode: "demo",
      },
    },
  };
}

function makeEvent(
  id: string,
  deviceId: string | null,
  eventType: string,
  message: string,
  now: string,
): EventRecord {
  return {
    id,
    deviceId,
    eventType,
    severity: "info",
    source: "manual",
    message,
    metadata: {},
    timestamp: now,
  };
}

function inventoryFromMutation(
  id: string,
  data: Extract<Mutation, { action: "save-inventory" }>["data"],
  createdAt: string,
  updatedAt: string,
): InventoryItem {
  return {
    id,
    ...data,
    purchaseDate: null,
    purchasePrice: null,
    warrantyExpiration: null,
    createdAt,
    updatedAt,
  };
}

function noteFromMutation(
  id: string,
  data: Extract<Mutation, { action: "save-note" }>["data"],
  createdAt: string,
  updatedAt: string,
): LabNote {
  return { id, ...data, createdAt, updatedAt };
}
