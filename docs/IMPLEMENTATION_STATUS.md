# Implementation status

## Complete

- Strict Next.js foundation, responsive application shell, themes, search, command palette, loading/error/empty states
- SQLite schema, migrations, seed, persistence, size-limited schema-validated import/export, retention, hourly metric rollups, and verified online backups
- Deterministic Demo environment and reset
- Overview, devices, device detail, diagnostics, topology, services, service detail, containers, container detail
- Monitoring, alerts, activity, inventory, lab notes, settings, Live Mode onboarding
- Private-CIDR policy, approved-network enforcement, rate-limited discovery, Docker detection, structured logging
- Unit, component, SQLite integration, 12 local Playwright journeys, and 3 hosted-boundary journeys
- Hardened Docker packaging, network-isolated scheduled backup sidecar, and operator/security documentation
- Vercel Hosted Demo profile with per-tab browser state and server-enforced mutation/local-provider blocks
- Explicit, visible Live Mode activation selection and failure-aware promotion
- Optional single-operator local access token, security headers, and privacy-preserving structured error logging
- Public README launch page with reproducible animated and full-resolution product tours
- GitHub Actions quality and browser workflows
- Background Live Mode service collector, secret-reference provider registry, transition alerts, and ntfy/Slack adapters
- Prometheus, Proxmox, UniFi, Home Assistant, SNMP, NUT, Tailscale, and SMART health adapters
- Reconciled discovery promotion, TLS expiry diagnostics, confirmed Wake-on-LAN, and Docker CPU/memory stats
- Offline restore drill/guarded restore and private Tailscale Serve preflight
- Hosted scenario playback, deep links, guided tour, Open Graph metadata, sitemap, and robots policy
- Axe accessibility gates, JavaScript budget, CodeQL, Dependabot, scheduled audits, container scanning, and attested release workflow

## External limitations

- Rich host telemetry depends on future device agents; the current Live foundation supports safe discovery, manual devices/services, bounded service/provider checks, diagnostics, and read-only Docker inventory/stats.
- Network discovery results depend on local operating-system commands, permissions, routing, and device behavior.
- Docker runtime observation requires a working local Docker CLI and operator-authorized daemon access.
- Docker Desktop on macOS may hide the host neighbor table; use the native runtime for the fullest Live provider visibility.
- Provider usefulness depends on operator-selected systems, approved CIDRs, least-privilege credentials, local binaries, and optional hardware access. The registry is disabled by default.
