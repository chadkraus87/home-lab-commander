export interface ParsedCidr {
  address: string;
  prefix: number;
  network: number;
  broadcast: number;
  hostCount: number;
}

export function ipv4ToNumber(address: string): number | null {
  const parts = address.split(".");
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)
  )
    return null;
  return parts
    .map(Number)
    .reduce((value, octet) => ((value << 8) | octet) >>> 0, 0);
}

export function numberToIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

export function parseCidr(value: string): ParsedCidr | null {
  const [address, prefixValue, ...rest] = value.trim().split("/");
  if (
    !address ||
    !prefixValue ||
    rest.length > 0 ||
    ipv4ToNumber(address) === null
  )
    return null;
  const prefix = Number(prefixValue);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const addressNumber = ipv4ToNumber(address);
  if (addressNumber === null) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (addressNumber & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  return {
    address,
    prefix,
    network,
    broadcast,
    hostCount: 2 ** (32 - prefix),
  };
}

export function isPrivateIpv4(address: string): boolean {
  const numeric = ipv4ToNumber(address);
  if (numeric === null) return false;
  const first = numeric >>> 24;
  const second = (numeric >>> 16) & 255;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

export function isAllowedLocalAddress(address: string): boolean {
  if (isPrivateIpv4(address)) return true;
  if (!isIpv6(address)) return false;
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function isIpv6(address: string): boolean {
  if (!address.includes(":") || address.includes("%")) return false;
  try {
    const url = new URL(`http://[${address}]/`);
    return url.hostname.startsWith("[") && url.hostname.endsWith("]");
  } catch {
    return false;
  }
}

export function isPrivateCidr(value: string): boolean {
  const cidr = parseCidr(value);
  if (!cidr) return false;
  return (
    isPrivateIpv4(numberToIpv4(cidr.network)) &&
    isPrivateIpv4(numberToIpv4(cidr.broadcast))
  );
}

export function isIpInCidr(address: string, value: string): boolean {
  const numeric = ipv4ToNumber(address);
  const cidr = parseCidr(value);
  if (numeric === null || !cidr) return false;
  return numeric >= cidr.network && numeric <= cidr.broadcast;
}

export function enumerateHosts(value: string, maximum = 256): string[] {
  const cidr = parseCidr(value);
  if (!cidr || cidr.hostCount > maximum) return [];
  if (cidr.prefix === 32) return [numberToIpv4(cidr.network)];
  const start = cidr.network + 1;
  const end = cidr.broadcast - 1;
  const hosts: string[] = [];
  for (let address = start; address <= end; address += 1)
    hosts.push(numberToIpv4(address));
  return hosts;
}
