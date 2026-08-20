# Roadmap

The current application is complete for its local-first Demo and foundational Live workflows. The following are sensible future extensions, not missing stubs in the current UI.

## Near term

- Background collector process that persists Live metrics without an open browser.
- Read-only Docker stats and opt-in bounded log retrieval.
- Device editing beyond notes/tags, including provider ownership and merge resolution.
- Notification adapters for local email, Slack, or ntfy with explicit secret storage.
- Saved custom alert thresholds and scheduled maintenance windows.
- Guided, offline restore drill with explicit database replacement confirmation.

## Provider expansion

- Agent for Linux, macOS, Windows, and Raspberry Pi telemetry.
- SNMP for switches, routers, access points, printers, and UPS devices.
- Proxmox, Home Assistant, Prometheus, Grafana, Tailscale, SMART, and Wake-on-LAN adapters.
- Remote collectors for segmented VLANs with signed enrollment and least privilege.

## Platform evolution

- Authenticated multi-user mode with role-based authorization and attributable audit events.
- Encrypted credential-reference store backed by the operating-system keychain.
- Encrypted off-host backup integration and verified restore drills.
- Desktop packaging and signed auto-updates.
- Optional evidence-grounded local AI troubleshooting using Ollama, clearly separating observations from hypotheses.

Every future provider must preserve private-network enforcement, normalized models, timeouts, read-only defaults, explicit confirmation for disruption, and no arbitrary shell surface.
