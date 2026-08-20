# Implementation status

## Complete

- Strict Next.js foundation, responsive application shell, themes, search, command palette, loading/error/empty states
- SQLite schema, migrations, seed, persistence, size-limited schema-validated import/export, retention, hourly metric rollups, and verified online backups
- Deterministic Demo environment and reset
- Overview, devices, device detail, diagnostics, topology, services, service detail, containers, container detail
- Monitoring, alerts, activity, inventory, lab notes, settings, Live Mode onboarding
- Private-CIDR policy, approved-network enforcement, rate-limited discovery, Docker detection, structured logging
- Unit, component, SQLite integration, and eleven Playwright workflow tests
- Hardened Docker packaging, network-isolated scheduled backup sidecar, and operator/security documentation
- Vercel Hosted Demo profile with per-tab browser state and server-enforced mutation/local-provider blocks
- Explicit, visible Live Mode activation selection and failure-aware promotion
- Optional single-operator local access token, security headers, and privacy-preserving structured error logging
- Public README launch page with reproducible animated and full-resolution product tours
- GitHub Actions quality and browser workflows

## External limitations

- Live telemetry depends on future device/provider agents; the current Live foundation supports safe discovery, manual devices/services, diagnostics, and read-only Docker inventory.
- Network discovery results depend on local operating-system commands, permissions, routing, and device behavior.
- Docker runtime observation requires a working local Docker CLI and operator-authorized daemon access.
- Docker Desktop on macOS may hide the host neighbor table; use the native runtime for the fullest Live provider visibility.
- Credentialed provider and remote-agent integrations require operator-selected systems and a secret-storage/enrollment design; their safe boundary is documented but they are not falsely enabled.
