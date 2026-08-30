# Provider and remote-agent boundaries

## Current providers

The current Live Mode foundation deliberately exposes only local, bounded, read-only operations:

- passive ARP/neighbour-table observation;
- rate-limited ping discovery inside an approved private `/24`;
- predefined DNS, ping, TCP, HTTP, and TLS certificate diagnostics after explicit allowlist validation;
- read-only `docker info`, `docker ps`, and one-shot `docker stats` observation;
- manual and opt-in collector checks for Prometheus, Proxmox, UniFi, Home Assistant, SNMP, NUT, Tailscale, and SMART;
- one-shot Wake-on-LAN behind approved-CIDR, stored-device, valid-MAC, Live Mode, and exact confirmation gates;
- manual device, service, inventory, and note records.

Network discovery and operator actions run on demand. The background collector is explicit, idle outside Live Mode, restricted to saved manual services and enabled configured providers, and never performs discovery or Wake-on-LAN. There is no arbitrary command surface.

## Recommended expansion order

1. Normalize richer read-only metrics from the current health/readiness providers.
2. Add saved alert thresholds, maintenance windows, and notification history.
3. Add platform agents for normalized host telemetry.
4. Add an outbound-only remote agent for segmented networks.

Provider integrations remain disabled in the example registry. Each needs an operator-selected target, least-privilege credential reference, approved range, installed local binary when applicable, timeouts, and a testable normalized mapping. Secrets are resolved server-side from `HOMELAB_SECRET_*` environment variables or macOS Keychain and never returned to the UI.

## Remote-agent minimum design

A future remote agent should initiate an outbound mutually authenticated connection, enroll through a one-time approval, receive only signed typed jobs, and report normalized observations. It must not expose an inbound shell, accept free-form commands, scan public addresses, or perform disruptive actions without a separate confirmation and policy layer.

The server must bind every job to an approved private range and provider capability, record attributable audit events, rotate/revoke agent identity, cap concurrency and output, and reject stale/replayed jobs. Secret material belongs in an OS keychain or dedicated encrypted secret store, never SQLite exports or browser storage.
