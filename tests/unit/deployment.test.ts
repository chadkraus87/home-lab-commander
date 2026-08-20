import { afterEach, describe, expect, it } from "vitest";
import { isHostedDemo } from "@/server/deployment";

const originalHostedDemo = process.env.HOMELAB_HOSTED_DEMO;
const originalVercel = process.env.VERCEL;

afterEach(() => {
  restoreEnvironment("HOMELAB_HOSTED_DEMO", originalHostedDemo);
  restoreEnvironment("VERCEL", originalVercel);
});

describe("hosted deployment policy", () => {
  it("stays local by default", () => {
    delete process.env.HOMELAB_HOSTED_DEMO;
    delete process.env.VERCEL;
    expect(isHostedDemo()).toBe(false);
  });

  it("fails closed on Vercel", () => {
    delete process.env.HOMELAB_HOSTED_DEMO;
    process.env.VERCEL = "1";
    expect(isHostedDemo()).toBe(true);
  });

  it("supports an explicit hosted showcase override", () => {
    process.env.HOMELAB_HOSTED_DEMO = "1";
    delete process.env.VERCEL;
    expect(isHostedDemo()).toBe(true);
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
