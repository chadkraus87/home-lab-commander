# Network discovery

## Safety first

Discovery operates only after a deliberate multi-step review in **Settings → Environment**. The server independently enforces the boundary; the UI is not the security control.

Every request must satisfy all of the following:

1. valid IPv4 CIDR;
2. entirely inside RFC1918 space;
3. already present in the approved-network allowlist;
4. `/24` or narrower for that run;
5. rate limit of one run per 30 seconds.

## Methods

### Passive neighbor table

The recommended default reads `arp -an`, with `ip neigh show` as a Linux fallback. It performs no new host contact. Results depend on what the operating system already knows, so an empty result is normal on a new or quiet network.

### Rate-limited ping

The active method enumerates usable hosts in one approved `/24`, checks eight at a time, and applies a 1.5-second timeout. It does not scan ports, attempt authentication, fingerprint services, or modify devices.

## Result confidence

- **High:** a neighbor entry includes both IP and MAC.
- **Medium:** a host responds or a partial neighbor record is present.
- **Low:** reserved for future weak signals; current providers do not automatically promote low-confidence results.

Discovered records remain reviewable until the operator chooses which systems to add. Promoted devices start with `unknown` type and no invented Live telemetry.

## Platform limitations

Command availability and ping flags differ across macOS and Linux. Missing commands, local firewall rules, lack of ICMP permission, sleeping Wi-Fi clients, VLAN isolation, and IPv6-only networks can reduce results. These conditions produce an explanatory empty/error state rather than crashing the application.

Docker Desktop adds another network namespace. Passive discovery inside the container can see its VM/container neighbor table instead of the Mac host's complete ARP table. Routed diagnostics may still work, but a native HomeLab Commander process is recommended when host-level discovery fidelity matters.

## Not implemented

The current release does not use SNMP, SSH, aggressive port scans, vendor-cloud APIs, credential probes, public-internet scanning, or exploitation. Future discovery providers must preserve the same normalized result model and server-side allowlist checks.
