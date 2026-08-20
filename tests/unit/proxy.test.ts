import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("optional local access control", () => {
  it("stays disabled unless the operator configures a token", () => {
    const response = proxy(new NextRequest("http://127.0.0.1:3000/"));
    expect(response.status).toBe(200);
  });

  it("challenges requests and accepts exact credentials", () => {
    vi.stubEnv("HOMELAB_ACCESS_TOKEN", "correct-horse-battery-staple");
    vi.stubEnv("HOMELAB_ACCESS_USERNAME", "commander");
    const denied = proxy(new NextRequest("http://127.0.0.1:3000/"));
    expect(denied.status).toBe(401);
    expect(denied.headers.get("www-authenticate")).toContain(
      "HomeLab Commander",
    );

    const authorization = Buffer.from(
      "commander:correct-horse-battery-staple",
    ).toString("base64");
    const accepted = proxy(
      new NextRequest("http://127.0.0.1:3000/", {
        headers: { authorization: `Basic ${authorization}` },
      }),
    );
    expect(accepted.status).toBe(200);
  });

  it("refuses weak token configuration", () => {
    vi.stubEnv("HOMELAB_ACCESS_TOKEN", "too-short");
    const response = proxy(new NextRequest("http://127.0.0.1:3000/"));
    expect(response.status).toBe(503);
  });

  it("keeps health checks available without credentials", () => {
    vi.stubEnv("HOMELAB_ACCESS_TOKEN", "correct-horse-battery-staple");
    const response = proxy(new NextRequest("http://127.0.0.1:3000/api/health"));
    expect(response.status).toBe(200);
  });
});
