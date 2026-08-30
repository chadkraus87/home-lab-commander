import { z } from "zod";

const id = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9._-]+$/);
const label = z.string().trim().min(1).max(120);
const enabled = z.boolean().default(false);
export const secretReferenceSchema = z
  .string()
  .trim()
  .max(240)
  .refine(
    (value) =>
      /^env:HOMELAB_SECRET_[A-Z0-9_]+$/.test(value) ||
      /^keychain:[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(value),
    "Use env:HOMELAB_SECRET_NAME or keychain:service/account.",
  );

const base = z.object({ id, label, enabled });
const endpoint = z.string().url().max(2048);

export const providerConfigSchema = z.discriminatedUnion("kind", [
  base.extend({
    kind: z.enum(["prometheus", "proxmox", "unifi", "home-assistant"]),
    endpoint,
    secretRef: secretReferenceSchema.optional(),
    allowSelfSigned: z.boolean().default(false),
  }),
  base.extend({
    kind: z.literal("snmp"),
    host: z.string().trim().min(1).max(253),
    communityRef: secretReferenceSchema,
    oid: z
      .string()
      .trim()
      .regex(/^\d+(\.\d+){2,30}$/)
      .default("1.3.6.1.2.1.1.1.0"),
  }),
  base.extend({
    kind: z.literal("nut"),
    host: z.string().trim().min(1).max(253),
    upsName: id,
  }),
  base.extend({ kind: z.literal("tailscale") }),
  base.extend({
    kind: z.literal("smart"),
    devices: z
      .array(z.string().regex(/^\/dev\/(disk\d+|sd[a-z]+|nvme\d+n\d+)$/))
      .min(1)
      .max(16),
  }),
]);

export const providerRegistrySchema = z
  .object({
    version: z.literal(1),
    providers: z.array(providerConfigSchema).max(64),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.providers.map((provider) => provider.id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["providers"],
        message: "Provider identifiers must be unique.",
      });
  });

export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type ProviderRegistry = z.infer<typeof providerRegistrySchema>;
