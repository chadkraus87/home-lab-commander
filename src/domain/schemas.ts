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
    kind: z.enum(["ping", "dns", "tcp", "http"]),
    host: z.string().trim().min(1).max(253),
    port: port.optional(),
    protocol: z.enum(["http", "https"]).optional(),
  })
  .superRefine((value, context) => {
    if ((value.kind === "tcp" || value.kind === "http") && !value.port)
      context.addIssue({
        code: "custom",
        path: ["port"],
        message: "A port is required for this check.",
      });
  });
