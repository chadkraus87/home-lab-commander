# Demo Mode

Demo Mode makes HomeLab Commander useful before physical infrastructure exists. It is deterministic, clearly labeled, and isolated from Live provider claims.

## Environment

The simulated `192.168.10.0/24` lab contains a gateway, managed switch, Docker/AI server, Raspberry Pi DNS host, NAS, Mac workstation, Wi-Fi access point, Linux laptop, and isolated rack sensor. It includes realistic interfaces, topology links, services, containers, metrics, alerts, events, inventory, and Markdown notes.

## Evolution

Seeded randomness generates repeatable 24-hour histories. While the UI is open, a deterministic tick updates:

- CPU and memory;
- temperature;
- RX/TX throughput;
- latency;
- uptime;
- service response time;
- periodic activity events.

The previous snapshot is never mutated, which keeps React behavior and tests predictable. The timer changes the in-memory Demo view; persistent user workflows still write to SQLite.

## Reset

**Settings → Data → Reset Demo** runs a transaction that restores the complete original environment. The action requires browser confirmation and replaces manual records, so it is intentionally separated from normal navigation.

## Hosted Demo

The Vercel showcase runs the same deterministic environment with an additional server-enforced safety profile. Visitors can edit example records and reset the lab inside one browser tab. State is stored in versioned `sessionStorage`, resets when that tab closes, and is never written into a shared server database. Private-network discovery, diagnostics, imports, Docker access, and Live Mode are unavailable because a cloud function cannot safely administer a visitor's LAN.

The UI labels this profile **Hosted showcase** and **Demo-only · ephemeral**, plus a global example-data privacy notice, so simulated telemetry is never confused with a live environment and visitors know not to enter sensitive information.

The hosted control bar can load four deterministic scenarios: Balanced, Capacity, Outage, and Recovery. A scenario replaces the browser snapshot from the pristine seed so outcomes do not depend on previous edits. `?scenario=outage&tour=1` creates a shareable portfolio path into an accessible five-step guided tour. Scenario alerts and events use `demo-scenario:`/`demo.scenario.*` identifiers and `simulated: true` metadata.

## Testing

Unit tests pin the clock and assert identical snapshots for identical inputs. E2E tests reset the Demo Environment before every journey so workflows remain independent and reproducible. A second hosted profile verifies scenario deep links, tour navigation, WCAG Axe checks, and `403` responses across every local-operator API.
