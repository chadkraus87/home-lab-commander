<div align="center">

# HomeLab Commander

**Your infrastructure. One command center.**

A local-first operations console for discovering, monitoring, organizing, documenting, and troubleshooting a personally owned homelab.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Open-5aa7ff?style=for-the-badge&logo=vercel&logoColor=white)](https://home-lab-commander.vercel.app)
[![CI](https://img.shields.io/github/actions/workflow/status/chadkraus87/home-lab-commander/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/chadkraus87/home-lab-commander/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-56d39a?style=for-the-badge)](LICENSE)

![HomeLab Commander overview](docs/screenshots/overview.png)

</div>

## Live showcase

Explore the public app at **[home-lab-commander.vercel.app](https://home-lab-commander.vercel.app)**. It opens in a clearly labeled Hosted Demo with a complete simulated lab—no account, credentials, or setup required.

The hosted deployment is intentionally different from a local installation:

| Capability                                                | Hosted Demo  |   Local installation    |
| --------------------------------------------------------- | :----------: | :---------------------: |
| Deterministic, evolving lab telemetry                     |      ✓       |            ✓            |
| Devices, services, topology, alerts, inventory, and notes |      ✓       |            ✓            |
| Interactive demo mutations and reset                      | ✓, ephemeral |      ✓, persistent      |
| Portable JSON export                                      |      ✓       |            ✓            |
| Portable JSON import                                      |      —       |            ✓            |
| Private-network discovery and diagnostics                 |      —       | ✓, approved ranges only |
| Read-only local Docker inventory                          |      —       |        ✓, opt-in        |

Vercel cannot reach a visitor's private network, and the hosted build does not try. Its SQLite data is temporary and may reset on a cold start or deployment. Run locally for persistent state and Live Mode.

## Product tours

### Command center, device intelligence, and topology

[![Command center tour](docs/media/command-center-tour.gif)](docs/media/command-center-tour.webm)

[Watch the full-resolution WebM tour](docs/media/command-center-tour.webm)

### Alert response and Markdown runbook workflow

[![Operator workflow tour](docs/media/operator-workflow-tour.gif)](docs/media/operator-workflow-tour.webm)

[Watch the full-resolution WebM tour](docs/media/operator-workflow-tour.webm)

The media is reproducible: start the hosted-demo profile locally, then run `npm run media:capture`.

## What it does

- **Command overview** — explainable environment health, live capacity, active alerts, recent activity, favorites, and network status.
- **Device intelligence** — searchable table/card views, persistent notes and tags, interfaces, workloads, events, resource history, and predefined safe diagnostics.
- **Network topology** — interactive XYFlow graph with filtering, detail panels, minimap, pan/zoom, automatic layout, and browser-saved positions.
- **Service monitoring** — normalized HTTP, HTTPS, TCP, and DNS monitors with response time and availability history.
- **Container visibility** — read-only Docker detection and normalized state, with a complete simulated runtime when Docker is absent.
- **Monitoring and alerts** — historical charts, retention and rollups, alert fingerprints, acknowledgement, resolution, and history.
- **Inventory and knowledge** — hardware records plus fast Markdown lab notes with GitHub Flavored Markdown preview.
- **Fast navigation** — unified `⌘ K` / `Ctrl K` infrastructure search and command palette.
- **Polished interaction** — dark/light themes, responsive navigation, keyboard support, visible focus, and reduced-motion support.
- **Safe activation** — guided Live Mode that shows the exact private-network boundary before any active operation.

## Architecture

HomeLab Commander uses Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, Zod, Node's built-in SQLite driver, XYFlow, Recharts, React Markdown, Vitest, Testing Library, and Playwright.

```mermaid
flowchart LR
  UI["Next.js App Router UI"] --> STATE["Serializable app snapshot"]
  UI --> API["Validated route handlers"]
  API --> POLICY["Private-range and hosted-mode policies"]
  STATE --> REPO["SQLite repositories"]
  API --> REPO
  POLICY --> LOCAL["Bounded local providers"]
  LOCAL --> DISCOVERY["ARP / neighbour / ping"]
  LOCAL --> DOCKER["Read-only Docker CLI"]
  SIM["Deterministic demo engine"] --> REPO
```

The application is a single Node process for a personal homelab. Server Components read the repository directly; narrow route handlers validate mutations and provider operations. UI code consumes normalized domain records instead of Docker-, OS-, or vendor-specific output.

See [Architecture](docs/ARCHITECTURE.md), [Security](docs/SECURITY.md), and [Network discovery](docs/NETWORK-DISCOVERY.md) for the complete boundaries.

## Run locally

### Prerequisites

- macOS or Linux
- Node.js 24.x
- npm 11 or newer
- Optional: Docker Desktop or Docker Engine for local container observation
- Optional: `arp`, `ip`, and `ping` for Live Mode discovery

No cloud account, API key, hosted database, or SaaS dependency is required.

### Install

```bash
git clone https://github.com/chadkraus87/home-lab-commander.git
cd home-lab-commander
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The first request creates `data/homelab.db`, applies append-only migrations, and seeds the Demo Environment.

Development and production scripts bind to loopback by default. Override the hostname only when you deliberately intend to expose the application to a trusted LAN.

### Production build

```bash
npm run build
npm run start
```

HomeLab Commander does not provide multi-user authentication in this local-first release. Keep it on loopback or a trusted, access-controlled network.

### Docker

```bash
docker compose up --build
```

Application data persists in the `homelab-data` volume. The Docker socket is not mounted by default. Mounting it grants administrative-equivalent host access; do so only deliberately and keep the app on a trusted interface.

## Demo Mode

Demo Mode is active on first launch. A useful first tour is:

1. Review the health score on **Overview**.
2. Open **Atlas Server** and inspect its resource history and services.
3. Select Atlas in the **Network** topology.
4. Acknowledge an alert and write a Markdown runbook.
5. Use **Settings → Data → Reset Demo** to restore the original lab.

Telemetry evolves deterministically: utilization, latency, throughput, uptime, response times, and events change without ever being presented as real infrastructure data. See [Demo Mode](docs/DEMO-MODE.md).

## Enable Live Mode

1. Open **Settings → Networks** and confirm a private CIDR you own and control.
2. Open **Settings → Environment**.
3. Choose passive neighbor-table discovery or a rate-limited ping sweep.
4. Review the exact range, operation, and explicit exclusions.
5. Start discovery, review the results, and choose which devices to add.
6. Optionally use **Settings → Docker** to test the local read-only provider.

Public ranges, unapproved private ranges, and discovery requests larger than one `/24` are rejected. Discovery never performs credential attempts, exploitation, arbitrary commands, or public-internet scanning.

## Configuration

| Variable                | Purpose                                                | Default                          |
| ----------------------- | ------------------------------------------------------ | -------------------------------- |
| `HOMELAB_DATABASE_PATH` | Absolute SQLite database location                      | `data/homelab.db`                |
| `HOMELAB_HOSTED_DEMO=1` | Force the demo-only hosted safety profile              | Off locally; automatic on Vercel |
| `HOMELAB_STANDALONE=1`  | Produce Next.js standalone output for the Docker image | Off                              |

Hosted mode stores SQLite in the platform's writable temporary directory. This is deliberate showcase state, not durable storage.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Install Playwright Chromium once if necessary:

```bash
npx playwright install chromium
```

The suite covers private-address enforcement, CIDR validation, hosted-deployment fail-closed behavior, health scoring, alert rules, deterministic simulation, metric downsampling, provider normalization, SQLite workflows, component interaction, and complete browser journeys. GitHub Actions runs static, unit/integration, production-build, and browser checks on pushes and pull requests.

## Deploy your own hosted showcase

[Vercel](https://vercel.com) detects the Next.js application automatically:

1. Fork the repository.
2. Import it into Vercel.
3. Keep the framework preset on **Next.js** and Node.js on **24.x**.
4. Deploy—no environment variables or external database are required for Demo Mode.

The app automatically detects Vercel and enables the hosted safety profile. Do not disable that boundary for a public deployment. A persistent, multi-user hosted edition would require authentication, authorization, durable managed storage, and a secure local agent; those are intentionally outside this release.

## Data and retention

- Local database: `data/homelab.db`
- Raw metrics: retained for the configured interval (30 days by default)
- Older metrics: aggregated into hourly min/max/average rollups before raw rows are removed
- Portable export: devices, services, inventory, notes, and non-secret settings
- Credentials and secrets: never collected or exported

## Security model

HomeLab Commander is defensive and local-first:

- Loopback binding and Demo Mode are the defaults.
- External input is validated with Zod at server boundaries.
- Discovery is restricted to explicitly approved loopback, RFC1918 IPv4, and local-link IPv6 targets.
- OS processes use fixed executable names and argument arrays—never user-built shell commands.
- Discovery and diagnostics are bounded by target limits, timeouts, and rate limits.
- Docker access is read-only and opt-in.
- Vercel deployments fail closed to hosted Demo Mode.
- No arbitrary terminal, credential attack, public scanning, or unattended disruptive action is exposed.

Review [Security](docs/SECURITY.md) before enabling Live Mode or exposing the local app beyond loopback. Please report security issues privately rather than opening a public issue with sensitive details.

## Project map

```text
src/app          Next.js pages and narrow route handlers
src/components   Shared application shell and UI primitives
src/features     Product-area client experiences
src/domain       Pure models, schemas, calculations, and policies
src/server       SQLite repositories and local providers
src/simulation   Deterministic Demo Mode data and evolution
migrations       Append-only SQLite migrations
tests            Unit, component, and integration coverage
e2e              Playwright user journeys
docs             Architecture, security, discovery, and roadmap notes
```

## Troubleshooting

**Docker is unavailable.** Nothing is broken; Demo container data remains active. Start Docker and check the connection again from a local installation.

**Discovery finds no neighbors.** Passive discovery sees only systems already known to the host. Confirm the approved `/24`, local permissions, and firewall behavior, or try the bounded ping method.

**SQLite cannot open the database.** Confirm the process can create and write the `data` directory or the path configured by `HOMELAB_DATABASE_PATH`.

**Playwright cannot launch.** Run `npx playwright install chromium` and retry.

**Hosted changes disappeared.** That is expected: the public showcase uses ephemeral state. Clone the app for persistent local data.

## Roadmap and contributing

The current release is an intentionally bounded personal-lab console. Planned work is tracked in [Roadmap](docs/ROADMAP.md) and current implementation detail in [Implementation status](docs/IMPLEMENTATION_STATUS.md).

Issues and focused pull requests are welcome. Keep changes inside the defensive product boundary, include tests for important behavior, preserve accessibility, and run the full quality suite before submitting.

## License

Released under the [MIT License](LICENSE).
