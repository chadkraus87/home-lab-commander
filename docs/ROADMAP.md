# Roadmap

The current application is complete for its local-first Demo and foundational Live workflows. The following are sensible future extensions, not missing stubs in the current UI.

## Near term

- Device editing beyond notes/tags, including provider ownership and merge resolution.
- Saved custom alert thresholds and scheduled maintenance windows.
- Provider-specific telemetry normalization beyond current health/readiness checks.
- Privacy-aware notification templates and delivery history.

## Provider expansion

- Agent for Linux, macOS, Windows, and Raspberry Pi telemetry.
- Read-only agent telemetry for switches, routers, access points, printers, and UPS devices beyond current identity/health checks.
- Grafana metadata and deeper Proxmox, Home Assistant, Prometheus, UniFi, Tailscale, SMART, and NUT metrics.
- Remote collectors for segmented VLANs with signed enrollment and least privilege.

## Platform evolution

- Authenticated multi-user mode with role-based authorization and attributable audit events.
- Encrypted credential-reference store backed by the operating-system keychain.
- Encrypted off-host backup integration and verified restore drills.
- Desktop packaging and signed auto-updates.
- Optional evidence-grounded local AI troubleshooting using Ollama, clearly separating observations from hypotheses.

Every future provider must preserve private-network enforcement, normalized models, timeouts, read-only defaults, explicit confirmation for disruption, and no arbitrary shell surface.
