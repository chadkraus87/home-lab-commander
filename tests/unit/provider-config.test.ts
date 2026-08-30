import { describe, expect, it } from "vitest";
import {
  providerRegistrySchema,
  secretReferenceSchema,
} from "@/domain/provider-config";

describe("provider configuration policy", () => {
  it("accepts references but rejects embedded secret values", () => {
    expect(
      secretReferenceSchema.safeParse("env:HOMELAB_SECRET_PROXMOX").success,
    ).toBe(true);
    expect(
      secretReferenceSchema.safeParse("keychain:homelab-commander/proxmox")
        .success,
    ).toBe(true);
    expect(secretReferenceSchema.safeParse("super-secret-value").success).toBe(
      false,
    );
  });

  it("rejects duplicate provider identifiers and arbitrary SMART paths", () => {
    const duplicate = providerRegistrySchema.safeParse({
      version: 1,
      providers: [
        { id: "same", label: "One", kind: "tailscale", enabled: false },
        {
          id: "same",
          label: "Two",
          kind: "smart",
          devices: ["/etc/passwd"],
          enabled: false,
        },
      ],
    });
    expect(duplicate.success).toBe(false);
  });
});
