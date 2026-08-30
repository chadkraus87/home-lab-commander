import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { secretReferenceSchema } from "@/domain/provider-config";

const execFileAsync = promisify(execFile);

export async function resolveSecretReference(
  reference: string,
): Promise<string> {
  const parsed = secretReferenceSchema.safeParse(reference);
  if (!parsed.success)
    throw new SecretReferenceError("Invalid secret reference.");

  if (parsed.data.startsWith("env:")) {
    const name = parsed.data.slice(4);
    const value = process.env[name];
    if (!value)
      throw new SecretReferenceError(
        `The ${name} environment variable is not configured.`,
      );
    return value;
  }

  if (process.platform !== "darwin")
    throw new SecretReferenceError(
      "Keychain references are available only on macOS. Use an HOMELAB_SECRET_* environment reference on this host.",
    );

  const [service, account] = parsed.data.slice("keychain:".length).split("/");
  if (!service || !account)
    throw new SecretReferenceError("Invalid keychain reference.");
  try {
    const { stdout } = await execFileAsync(
      "security",
      ["find-generic-password", "-s", service, "-a", account, "-w"],
      { timeout: 3_000, maxBuffer: 16_000 },
    );
    const value = stdout.trim();
    if (!value) throw new Error("Empty keychain item");
    return value;
  } catch {
    throw new SecretReferenceError(
      `The macOS Keychain item ${service}/${account} is unavailable.`,
    );
  }
}

export class SecretReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecretReferenceError";
  }
}
