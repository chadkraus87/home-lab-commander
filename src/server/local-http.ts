import "server-only";

import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import {
  isAllowedLocalAddress,
  isIpInCidr,
  isPrivateIpv4,
} from "@/domain/network";

const MAX_RESPONSE_BYTES = 64 * 1024;

export interface LocalHttpResponse {
  status: number;
  body: string;
  headers: IncomingHttpHeaders;
  latencyMs: number;
}

export async function requestApprovedLocalUrl(
  input: URL,
  options: {
    approvedCidrs: string[];
    headers?: Record<string, string>;
    method?: "GET" | "HEAD" | "POST";
    body?: string;
    allowSelfSigned?: boolean;
  },
): Promise<LocalHttpResponse> {
  if (input.protocol !== "http:" && input.protocol !== "https:")
    throw new Error("Provider endpoints must use HTTP or HTTPS.");
  if (input.username || input.password)
    throw new Error(
      "Put credentials in a secret reference, not the endpoint URL.",
    );

  const addresses = await resolveApprovedAddresses(
    input.hostname,
    options.approvedCidrs,
  );
  const address = addresses[0];
  if (!address)
    throw new Error("The endpoint did not resolve to an approved address.");

  const started = performance.now();
  const request = input.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const outgoing = request(
      {
        protocol: input.protocol,
        hostname: address,
        port: input.port || (input.protocol === "https:" ? 443 : 80),
        method: options.method ?? "GET",
        path: `${input.pathname}${input.search}`,
        headers: {
          host: input.host,
          accept: "application/json, text/plain;q=0.8",
          ...options.headers,
        },
        servername: isPrivateIpv4(input.hostname) ? undefined : input.hostname,
        rejectUnauthorized: !(options.allowSelfSigned ?? false),
      },
      (response) => {
        let body = "";
        let size = 0;
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          size += Buffer.byteLength(chunk);
          if (size > MAX_RESPONSE_BYTES) {
            outgoing.destroy(new Error("Provider response exceeded 64 KB."));
            return;
          }
          body += chunk;
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            body,
            headers: response.headers,
            latencyMs: performance.now() - started,
          }),
        );
      },
    );
    outgoing.setTimeout(4_000, () =>
      outgoing.destroy(new Error("Provider request timed out.")),
    );
    outgoing.once("error", reject);
    outgoing.end(options.body);
  });
}

export async function resolveApprovedAddresses(
  host: string,
  approvedCidrs: string[],
): Promise<string[]> {
  const addresses = isAllowedLocalAddress(host)
    ? [host]
    : (await lookup(host, { all: true, verbatim: true })).map(
        (record) => record.address,
      );
  if (addresses.length === 0)
    throw new Error("The provider hostname did not resolve.");
  if (addresses.some((address) => !isAllowedLocalAddress(address)))
    throw new Error(
      "Provider endpoints must resolve only to private, loopback, or local-link addresses.",
    );
  if (
    addresses.some(
      (address) =>
        !isPrivateIpv4(address) ||
        !approvedCidrs.some((cidr) => isIpInCidr(address, cidr)),
    )
  )
    throw new Error(
      "Provider endpoints must be inside an explicitly approved private IPv4 range.",
    );
  return [...new Set(addresses)];
}
