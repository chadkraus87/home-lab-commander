import "server-only";

import { execFile } from "node:child_process";
import { lookup } from "node:dns/promises";
import { createConnection } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { promisify } from "node:util";
import { isAllowedLocalAddress } from "@/domain/network";
import type {
  HealthCheckProvider,
  HealthCheckResult,
} from "@/domain/providers";

const execFileAsync = promisify(execFile);

export class SafeHealthCheckProvider implements HealthCheckProvider {
  async run(input: {
    kind: HealthCheckResult["kind"];
    host: string;
    port?: number | undefined;
    protocol?: "http" | "https" | undefined;
  }): Promise<HealthCheckResult> {
    const addresses = await resolveAllowed(input.host);
    const address = addresses[0];
    if (!address)
      throw new Error(
        "The target could not be resolved to an approved local address.",
      );
    if (input.kind === "dns")
      return {
        ok: true,
        kind: "dns",
        latencyMs: null,
        message: `${input.host} resolves to ${addresses.join(", ")}`,
        observed: addresses.map((item) => `Resolved local address: ${item}`),
        likelyExplanation: null,
        recommendation: "No action is needed.",
      };
    if (input.kind === "ping") return ping(address);
    if (!input.port) throw new Error("A port is required for this diagnostic.");
    if (input.kind === "tcp") return tcp(address, input.port);
    if (input.kind === "tls")
      return tlsCertificate(address, input.host, input.port);
    return http(address, input.host, input.port, input.protocol ?? "http");
  }
}

async function tlsCertificate(
  address: string,
  hostname: string,
  port: number,
): Promise<HealthCheckResult> {
  const started = performance.now();
  return new Promise((resolve) => {
    const socket = tlsConnect({
      host: address,
      port,
      servername: isAllowedLocalAddress(hostname) ? undefined : hostname,
      rejectUnauthorized: false,
    });
    socket.setTimeout(3_000);
    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      const validTo = Date.parse(certificate.valid_to ?? "");
      const days = Number.isFinite(validTo)
        ? Math.floor((validTo - Date.now()) / 86_400_000)
        : null;
      const authorized = socket.authorized;
      socket.destroy();
      const ok = days !== null && days >= 14 && authorized;
      resolve({
        ok,
        kind: "tls",
        latencyMs: performance.now() - started,
        message:
          days === null
            ? "The peer did not provide a readable TLS certificate."
            : `TLS certificate expires in ${days} day${days === 1 ? "" : "s"}.`,
        observed: [
          days === null
            ? "Certificate expiration unavailable"
            : `Valid until ${certificate.valid_to}`,
          authorized
            ? "Certificate chain trusted by this host"
            : `Certificate chain not trusted: ${socket.authorizationError ?? "unknown reason"}`,
        ],
        likelyExplanation: ok
          ? null
          : days !== null && days < 14
            ? "The certificate is expired or inside the 14-day renewal window."
            : "The local host does not trust the certificate chain.",
        recommendation: ok
          ? "No action is needed."
          : "Renew the certificate if needed and verify the local trust chain before relying on this endpoint.",
      });
    });
    const fail = () => {
      socket.destroy();
      resolve({
        ok: false,
        kind: "tls",
        latencyMs: null,
        message: "A TLS handshake could not be completed.",
        observed: ["No certificate was received before timeout"],
        likelyExplanation:
          "The service may not use TLS on this port or may be unavailable.",
        recommendation: "Confirm the HTTPS port and service state.",
      });
    };
    socket.once("timeout", fail);
    socket.once("error", fail);
  });
}

async function resolveAllowed(host: string): Promise<string[]> {
  if (isAllowedLocalAddress(host)) return [host];
  const records = await lookup(host, { all: true, verbatim: true });
  const addresses = records.map((record) => record.address);
  if (
    addresses.length === 0 ||
    addresses.some((address) => !isAllowedLocalAddress(address))
  )
    throw new Error(
      "Diagnostics are restricted to private, loopback, and local-link addresses.",
    );
  return addresses;
}

async function ping(address: string): Promise<HealthCheckResult> {
  const args =
    process.platform === "darwin"
      ? ["-c", "1", "-W", "1000", address]
      : ["-c", "1", "-W", "1", address];
  const started = performance.now();
  try {
    await execFileAsync("ping", args, { timeout: 1_500, maxBuffer: 32_000 });
    const latencyMs = performance.now() - started;
    return {
      ok: true,
      kind: "ping",
      latencyMs,
      message: `Host responded in ${latencyMs.toFixed(1)} ms`,
      observed: ["Host is reachable by ICMP"],
      likelyExplanation: null,
      recommendation: "No action is needed.",
    };
  } catch {
    return {
      ok: false,
      kind: "ping",
      latencyMs: null,
      message: "The host did not answer the ping before timeout.",
      observed: ["No ICMP reply was received"],
      likelyExplanation:
        "The host may be offline, blocking ICMP, or unreachable on the selected network.",
      recommendation:
        "Check power and link state, then try a TCP check for a known service.",
    };
  }
}

async function tcp(address: string, port: number): Promise<HealthCheckResult> {
  const started = performance.now();
  return new Promise((resolve) => {
    const socket = createConnection({ host: address, port });
    socket.setTimeout(2_500);
    socket.once("connect", () => {
      const latencyMs = performance.now() - started;
      socket.destroy();
      resolve({
        ok: true,
        kind: "tcp",
        latencyMs,
        message: `TCP port ${port} accepted a connection in ${latencyMs.toFixed(1)} ms`,
        observed: [`Host reachable`, `Port ${port} open`],
        likelyExplanation: null,
        recommendation: "No action is needed.",
      });
    });
    const fail = () => {
      socket.destroy();
      resolve({
        ok: false,
        kind: "tcp",
        latencyMs: null,
        message: `TCP port ${port} did not accept a connection.`,
        observed: [`No successful connection to port ${port}`],
        likelyExplanation:
          "The service may be stopped, listening on another interface, or blocked by a firewall.",
        recommendation:
          "Confirm the configured port and inspect the service on the host.",
      });
    };
    socket.once("timeout", fail);
    socket.once("error", fail);
  });
}

async function http(
  address: string,
  hostname: string,
  port: number,
  protocol: "http" | "https",
): Promise<HealthCheckResult> {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch(`${protocol}://${address}:${port}/`, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: { host: hostname },
    });
    const latencyMs = performance.now() - started;
    const ok = response.status < 500;
    return {
      ok,
      kind: "http",
      latencyMs,
      message: `HTTP ${response.status} received in ${latencyMs.toFixed(1)} ms`,
      observed: [`Host reachable`, `HTTP status ${response.status}`],
      likelyExplanation: ok
        ? null
        : "The host is reachable, but the web service returned a server error.",
      recommendation: ok
        ? "No action is needed."
        : "Inspect the web service logs and upstream dependencies.",
    };
  } catch {
    return {
      ok: false,
      kind: "http",
      latencyMs: null,
      message: "The HTTP check did not complete before timeout.",
      observed: ["No HTTP response received"],
      likelyExplanation:
        "The web service may be stopped or unreachable on the configured port.",
      recommendation: "Run a TCP check, then inspect the service on the host.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
