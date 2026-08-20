import { describe, expect, it } from "vitest";
import {
  enumerateHosts,
  isAllowedLocalAddress,
  isIpInCidr,
  isPrivateCidr,
  isPrivateIpv4,
  parseCidr,
} from "@/domain/network";

describe("private network policy", () => {
  it("accepts RFC1918 and loopback addresses", () => {
    expect(isPrivateIpv4("10.2.3.4")).toBe(true);
    expect(isPrivateIpv4("172.31.255.4")).toBe(true);
    expect(isPrivateIpv4("192.168.10.5")).toBe(true);
    expect(isPrivateIpv4("127.0.0.1")).toBe(true);
    expect(isAllowedLocalAddress("::1")).toBe(true);
    expect(isAllowedLocalAddress("fd10::5")).toBe(true);
  });

  it("rejects public and malformed addresses", () => {
    expect(isPrivateIpv4("8.8.8.8")).toBe(false);
    expect(isPrivateIpv4("999.1.1.1")).toBe(false);
    expect(isPrivateIpv4("192.168.001.1")).toBe(false);
    expect(isAllowedLocalAddress("2606:4700:4700::1111")).toBe(false);
    expect(isAllowedLocalAddress("fd10::5%en0")).toBe(false);
    expect(isAllowedLocalAddress("not-an-address")).toBe(false);
  });

  it("validates the complete CIDR boundary", () => {
    expect(isPrivateCidr("192.168.10.0/24")).toBe(true);
    expect(isPrivateCidr("10.0.0.0/8")).toBe(true);
    expect(isPrivateCidr("172.15.0.0/16")).toBe(false);
    expect(isPrivateCidr("0.0.0.0/0")).toBe(false);
    expect(parseCidr("192.168.1.1/33")).toBeNull();
  });

  it("checks membership and bounds enumeration", () => {
    expect(isIpInCidr("192.168.10.42", "192.168.10.0/24")).toBe(true);
    expect(isIpInCidr("192.168.11.42", "192.168.10.0/24")).toBe(false);
    expect(enumerateHosts("192.168.10.0/30")).toEqual([
      "192.168.10.1",
      "192.168.10.2",
    ]);
    expect(enumerateHosts("10.0.0.0/8")).toEqual([]);
  });
});
