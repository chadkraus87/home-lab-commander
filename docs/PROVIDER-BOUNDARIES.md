# Provider and remote-agent boundaries

## Current providers

The current Live Mode foundation deliberately exposes only local, bounded, read-only operations:

- passive ARP/neighbour-table observation;
- rate-limited ping discovery inside an approved private `/24`;
- predefined DNS, ping, TCP, and HTTP diagnostics after local-address validation;
- read-only `docker info` and `docker ps` observation;
- manual device, service, inventory, and note records.

These tools run on demand. There is no unattended background network scan and no arbitrary command surface.

## Recommended expansion order

1. A local background collector that writes normalized metrics without requiring an open browser.
2. Read-only standards-based providers such as Prometheus, SNMP, and NUT/UPS.
3. Product-specific read-only providers such as Proxmox and UniFi.
4. An outbound-only remote agent for segmented networks.

Provider integrations are not enabled with invented endpoints or placeholder credentials. Each needs an operator-selected target, least-privilege credentials, a secret-storage decision, timeouts, and a testable normalized mapping.

## Remote-agent minimum design

A future remote agent should initiate an outbound mutually authenticated connection, enroll through a one-time approval, receive only signed typed jobs, and report normalized observations. It must not expose an inbound shell, accept free-form commands, scan public addresses, or perform disruptive actions without a separate confirmation and policy layer.

The server must bind every job to an approved private range and provider capability, record attributable audit events, rotate/revoke agent identity, cap concurrency and output, and reject stale/replayed jobs. Secret material belongs in an OS keychain or dedicated encrypted secret store, never SQLite exports or browser storage.
