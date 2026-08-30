import { z } from "zod";
import { isPrivateCidr, isPrivateIpv4 } from "@/domain/network";

const nonEmpty = z.string().trim().min(1).max(160);
const port = z.coerce.number().int().min(1).max(65535);
const privateIp = z
  .string()
  .trim()
  .refine(isPrivateIpv4, "Use a private or loopback IPv4 address.");

export const deviceInputSchema = z.object({
  displayName: nonEmpty,
  hostname: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.-]+$/, "Enter a valid hostname."),
  primaryIp: privateIp,
  type: z.enum([
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
  ]),
  location: z.string().trim().max(120).default("Unassigned"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const serviceInputSchema = z.object({
  name: nonEmpty,
  deviceId: z.string().trim().nullable().default(null),
  host: z.string().trim().min(1).max(253),
  port,
  protocol: z.enum(["http", "https", "tcp", "dns"]),
});

export const inventoryInputSchema = z.object({
  name: nonEmpty,
  category: nonEmpty,
  manufacturer: z.string().trim().max(120).default(""),
  model: z.string().trim().max(120).default(""),
  serialNumber: z.string().trim().max(160).default(""),
  status: z.enum(["in-use", "spare", "maintenance", "archived"]),
  location: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(4000).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  assignedDeviceId: z.string().trim().nullable().default(null),
});

export const noteInputSchema = z.object({
  title: nonEmpty,
  content: z.string().trim().min(1).max(100_000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  linkedDeviceIds: z.array(z.string()).max(50).default([]),
  linkedServiceIds: z.array(z.string()).max(50).default([]),
});

export const settingsInputSchema = z.object({
  applicationName: nonEmpty,
  mode: z.enum(["demo", "live"]),
  theme: z.enum(["system", "dark", "light"]),
  refreshSeconds: z.coerce.number().int().min(2).max(3600),
  timezone: z.string().trim().min(1).max(80),
  units: z.enum(["metric", "imperial"]),
  retentionDays: z.coerce.number().int().min(1).max(3650),
  approvedCidrs: z
    .array(
      z.string().refine(isPrivateCidr, "Only private IPv4 ranges are allowed."),
    )
    .min(1)
    .max(16),
  discoveryMethod: z.enum(["passive", "ping"]),
  density: z.enum(["comfortable", "compact"]),
});

export const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add-device"), data: deviceInputSchema }),
  z.object({
    action: z.literal("update-device"),
    id: z.string().min(1),
    data: z.object({
      notes: z.string().max(20_000),
      tags: z.array(z.string().trim().min(1).max(40)).max(20),
      isFavorite: z.boolean(),
    }),
  }),
  z.object({ action: z.literal("add-service"), data: serviceInputSchema }),
  z.object({ action: z.literal("acknowledge-alert"), id: z.string().min(1) }),
  z.object({ action: z.literal("resolve-alert"), id: z.string().min(1) }),
  z.object({
    action: z.literal("save-inventory"),
    id: z.string().optional(),
    data: inventoryInputSchema,
  }),
  z.object({ action: z.literal("archive-inventory"), id: z.string().min(1) }),
  z.object({
    action: z.literal("save-note"),
    id: z.string().optional(),
    data: noteInputSchema,
  }),
  z.object({ action: z.literal("delete-note"), id: z.string().min(1) }),
  z.object({ action: z.literal("update-settings"), data: settingsInputSchema }),
  z.object({ action: z.literal("reset-demo") }),
]);

export const discoveryInputSchema = z
  .object({
    cidr: z
      .string()
      .trim()
      .refine(isPrivateCidr, "Discovery is restricted to private IPv4 ranges."),
    method: z.enum(["passive", "ping"]),
  })
  .superRefine((value, context) => {
    const prefix = Number(value.cidr.split("/")[1]);
    if (prefix < 24)
      context.addIssue({
        code: "custom",
        path: ["cidr"],
        message: "Discovery is limited to 256 addresses (/24) per run.",
      });
  });

export const diagnosticInputSchema = z
  .object({
    kind: z.enum(["ping", "dns", "tcp", "http", "tls"]),
    host: z.string().trim().min(1).max(253),
    port: port.optional(),
    protocol: z.enum(["http", "https"]).optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.kind === "tcp" || value.kind === "http" || value.kind === "tls") &&
      !value.port
    )
      context.addIssue({
        code: "custom",
        path: ["port"],
        message: "A port is required for this check.",
      });
  });

const portableId = z.string().trim().min(1).max(200);
const portableText = z.string().max(20_000);
const portableDate = z.string().trim().min(1).max(64);
const portableNumber = z.number().finite();
const portableMetricsSchema = z.object({
  cpu: portableNumber,
  memory: portableNumber,
  disk: portableNumber,
  temperature: portableNumber.nullable(),
  networkRx: portableNumber,
  networkTx: portableNumber,
});

const portableDeviceSchema = z.object({
  id: portableId,
  hostname: z.string().trim().min(1).max(253),
  displayName: nonEmpty,
  description: portableText,
  type: deviceInputSchema.shape.type,
  vendor: z.string().max(160),
  model: z.string().max(160),
  operatingSystem: z.string().max(160),
  architecture: z.string().max(80),
  primaryIp: privateIp,
  macAddress: z.string().max(40),
  status: z.enum(["healthy", "degraded", "offline", "unknown"]),
  lastSeen: portableDate,
  firstSeen: portableDate,
  location: z.string().max(120),
  tags: z.array(z.string().max(40)).max(20),
  notes: portableText,
  isFavorite: z.boolean(),
  source: z.enum(["demo", "manual", "discovery", "docker"]),
  createdAt: portableDate,
  updatedAt: portableDate,
  uptimeSeconds: portableNumber.nonnegative(),
  latencyMs: portableNumber.nonnegative(),
  metrics: portableMetricsSchema,
  metricHistory: z
    .array(
      portableMetricsSchema.extend({
        timestamp: portableDate,
        latency: portableNumber.nonnegative(),
      }),
    )
    .max(50_000),
  interfaces: z
    .array(
      z.object({
        id: portableId,
        deviceId: portableId,
        name: z.string().max(120),
        mac: z.string().max(40),
        ipv4: z.string().max(64),
        ipv6: z.string().max(128).nullable(),
        subnet: z.string().max(128),
        gateway: z.string().max(128).nullable(),
        speedMbps: portableNumber.nonnegative(),
        state: z.enum(["up", "down"]),
      }),
    )
    .max(64),
});

const portableServiceSchema = z.object({
  id: portableId,
  deviceId: portableId.nullable(),
  name: nonEmpty,
  type: z.string().max(120),
  host: z.string().trim().min(1).max(253),
  port,
  protocol: z.enum(["http", "https", "tcp", "dns"]),
  url: z.string().max(2048).nullable(),
  status: z.enum(["healthy", "degraded", "down", "unknown"]),
  responseTimeMs: portableNumber.nonnegative(),
  uptimePercent: portableNumber.min(0).max(100),
  lastChecked: portableDate,
  healthCheck: z.string().max(500),
  source: z.enum(["demo", "manual", "docker"]),
});

const portableInventorySchema = inventoryInputSchema.extend({
  id: portableId,
  purchaseDate: portableDate.nullable(),
  purchasePrice: portableNumber.nonnegative().nullable(),
  warrantyExpiration: portableDate.nullable(),
  createdAt: portableDate,
  updatedAt: portableDate,
});

const portableNoteSchema = noteInputSchema.extend({
  id: portableId,
  createdAt: portableDate,
  updatedAt: portableDate,
});

export const portableExportSchema = z
  .object({
    version: z.literal(1),
    data: z
      .object({
        devices: z.array(portableDeviceSchema).max(2_000),
        services: z.array(portableServiceSchema).max(5_000),
        inventory: z.array(portableInventorySchema).max(10_000),
        notes: z.array(portableNoteSchema).max(5_000),
        settings: settingsInputSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    const deviceIds = new Set(value.data.devices.map((device) => device.id));
    const serviceIds = new Set(
      value.data.services.map((service) => service.id),
    );
    addDuplicateIssues(
      value.data.devices.map((device) => device.id),
      ["data", "devices"],
      context,
    );
    addDuplicateIssues(
      value.data.devices.map((device) => device.primaryIp),
      ["data", "devices"],
      context,
    );
    addDuplicateIssues(
      value.data.services.map((service) => service.id),
      ["data", "services"],
      context,
    );
    for (const [index, device] of value.data.devices.entries())
      if (
        device.interfaces.some(
          (networkInterface) => networkInterface.deviceId !== device.id,
        )
      )
        context.addIssue({
          code: "custom",
          path: ["data", "devices", index, "interfaces"],
          message: "A network interface references a different device.",
        });
    for (const [index, service] of value.data.services.entries())
      if (service.deviceId && !deviceIds.has(service.deviceId))
        context.addIssue({
          code: "custom",
          path: ["data", "services", index, "deviceId"],
          message: "The linked device is not included in this export.",
        });
    for (const [index, item] of value.data.inventory.entries())
      if (item.assignedDeviceId && !deviceIds.has(item.assignedDeviceId))
        context.addIssue({
          code: "custom",
          path: ["data", "inventory", index, "assignedDeviceId"],
          message: "The assigned device is not included in this export.",
        });
    for (const [index, note] of value.data.notes.entries()) {
      if (note.linkedDeviceIds.some((id) => !deviceIds.has(id)))
        context.addIssue({
          code: "custom",
          path: ["data", "notes", index, "linkedDeviceIds"],
          message: "A linked device is not included in this export.",
        });
      if (note.linkedServiceIds.some((id) => !serviceIds.has(id)))
        context.addIssue({
          code: "custom",
          path: ["data", "notes", index, "linkedServiceIds"],
          message: "A linked service is not included in this export.",
        });
    }
  });

function addDuplicateIssues(
  values: string[],
  path: Array<string | number>,
  context: z.RefinementCtx,
): void {
  if (new Set(values).size !== values.length)
    context.addIssue({
      code: "custom",
      path,
      message: "Duplicate identifiers or addresses are not allowed.",
    });
}
