# HomeLab Commander

**Your infrastructure. One command center.**

HomeLab Commander is a polished local-first operations console for discovering, monitoring, organizing, documenting, and troubleshooting devices and services on a personally owned homelab network. A new installation opens immediately into a dynamic deterministic Demo Environment, so the full product is useful before any physical lab exists.

![HomeLab Commander overview](docs/screenshots/overview.png)

## Features

- Dynamic overview with an explainable health score, current utilization, active alerts, recent activity, favorites, and network health.
- Searchable device inventory with table/card views, persistent notes and tags, resource history, interfaces, workloads, events, and predefined safe diagnostics.
- Interactive XYFlow topology with filters, selection details, minimap, pan/zoom, automatic layout, and locally saved positions.
- HTTP, HTTPS, TCP, and DNS service monitors with availability and response history.
- Read-only Docker detection and normalized container state; a complete simulated runtime remains available when Docker is absent.
- Historical monitoring charts with local SQLite retention and hourly rollups.
- Deduplicated alerts with acknowledgement, resolution, and history.
- Hardware inventory and fast Markdown lab notes with GFM preview.
- Unified `⌘ K` / `Ctrl K` search and command palette.
- Dark and light themes, responsive navigation, keyboard support, reduced-motion support, and explicit Demo/Live labeling.
- Validated JSON backup/import and deterministic Demo reset.
- Guided Live Mode discovery that explains and confirms the exact private-network boundary before any active operation.

## Architecture

HomeLab Commander uses Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, Zod, Node's built-in SQLite driver, XYFlow, Recharts, React Markdown, Vitest, Testing Library, and Playwright.

The app is intentionally a single local Node process for a personal homelab. Server Components read the repository directly; narrow route handlers validate mutations and local provider operations. UI code consumes normalized domain records rather than Docker, operating-system, or vendor-specific shapes.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for boundaries and data flow.

## Prerequisites

- macOS or Linux
- Node.js 24 or newer
- npm 11 or newer
- Optional: Docker Desktop or Docker Engine for local container observation
- Optional: `arp`, `ip`, and `ping` for Live Mode discovery methods

No cloud account, API key, hosted database, or SaaS dependency is required.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first request creates `data/homelab.db`, applies migrations, and seeds the Demo Environment.

Both development and production scripts bind to `127.0.0.1` by default. Deliberately override the hostname only when you intend to expose the application to a trusted LAN.

For production mode:

```bash
npm run build
npm run start
```

Keep the default loopback binding unless you deliberately choose to expose the app on a trusted LAN. HomeLab Commander does not provide multi-user authentication in this local-first release.

## Demo Mode

Demo Mode is active on first launch. Start with the overview, open **Atlas Server**, explore the **Network** topology, acknowledge an alert, create a lab note, then use **Settings → Data → Reset Demo** to restore the original state.

Telemetry evolves on a deterministic cadence: utilization, latency, throughput, uptime, response times, and activity events change without being presented as real infrastructure data. See [docs/DEMO-MODE.md](docs/DEMO-MODE.md).

## Live Mode

1. Open **Settings → Networks** and confirm the private CIDR you own and control.
2. Open **Settings → Environment**.
3. Choose the approved network and passive neighbor-table discovery or rate-limited ping discovery.
4. Review the exact discovery plan and exclusions.
5. Deliberately start discovery, review the results, and choose which devices to add.
6. Optionally open **Settings → Docker** to test the local read-only Docker provider.

Public ranges, unapproved private ranges, and discovery requests larger than one `/24` are rejected. See [docs/NETWORK-DISCOVERY.md](docs/NETWORK-DISCOVERY.md).

## Docker

Run the application in Docker without exposing it beyond loopback:

```bash
docker compose up --build
```

Application data persists in the `homelab-data` volume. The Docker socket is not mounted by default. If you later mount it to enable container observation, treat access to the Docker socket as administrative access to the host and keep the application bound to a trusted interface.

## Testing

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Install the Playwright Chromium browser once if necessary:

```bash
npx playwright install chromium
```

The suite covers private-address enforcement, CIDR validation, health scoring, alert rules and deduplication, deterministic simulation, metric downsampling, provider normalization, SQLite workflows, component interaction, and ten complete browser journeys.

## Data and retention

- Default database: `data/homelab.db`
- Override: `HOMELAB_DATABASE_PATH=/absolute/path/homelab.db`
- Raw metrics: retained for the configured interval (30 days by default)
- Older metrics: aggregated into hourly min/max/average rollups before raw rows are removed
- Portable export: excludes secrets and credential material

## Troubleshooting

**The app says Docker is unavailable.** Nothing is broken; Demo container data remains active. Start Docker and use **Check local Docker** again.

**Discovery returns no neighbors.** Passive discovery only sees systems already known to the host. Use an approved `/24`, try the rate-limited ping method, and confirm local permissions/firewall behavior.

**SQLite cannot open the database.** Confirm the process can create and write the `data` directory or the path configured by `HOMELAB_DATABASE_PATH`.

**Playwright cannot launch.** Run `npx playwright install chromium` and retry.

## Security

The default is read-only and loopback-oriented. Every external input is validated, subprocesses use fixed executables and argument arrays, discovery requires an explicit private-network allowlist, operations use timeouts/rate limits, and no arbitrary terminal is exposed. Review [docs/SECURITY.md](docs/SECURITY.md) before enabling Live Mode or exposing the application on a LAN.
