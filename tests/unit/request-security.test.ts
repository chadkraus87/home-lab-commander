import { describe, expect, it } from "vitest";

import {
  assertSameOrigin,
  RequestSecurityError,
} from "@/server/request-security";

describe("request security", () => {
  it("accepts the browser authority from the Host header", () => {
    const request = new Request("http://localhost:3100/api/state", {
      headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
    });

    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("rejects a cross-origin mutation", () => {
    const request = new Request("http://localhost:3100/api/state", {
      headers: { host: "127.0.0.1:3100", origin: "https://attacker.example" },
    });

    expect(() => assertSameOrigin(request)).toThrow(RequestSecurityError);
  });
});
