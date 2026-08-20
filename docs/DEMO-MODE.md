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

## Testing

Unit tests pin the clock and assert identical snapshots for identical inputs. E2E tests reset the Demo Environment before every journey so workflows remain independent and reproducible.
