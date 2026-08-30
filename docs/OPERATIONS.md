# Local operations

## Choose a runtime

HomeLab Commander has three deliberately different profiles:

| Profile        | Best for                        | Data                  | Local network access                       |
| -------------- | ------------------------------- | --------------------- | ------------------------------------------ |
| Hosted Demo    | Public evaluation               | This browser tab only | Blocked                                    |
| Native local   | Fullest Live Mode behavior      | Local SQLite          | Best visibility from the Mac/Linux host    |
| Docker Compose | Always-on isolation and restart | Docker volumes        | Bounded by the container network namespace |

For a Mac that needs passive LAN discovery or host Docker inventory, the native production build is the most capable choice. For an always-on console that remains private to the same machine, Docker Compose is a good and safe choice, with the limitations below.

## Native local operation

Use development mode while changing code:

```bash
npm install
npm run dev
```

For routine use, run the tested production build:

```bash
npm run build
npm run start
```

Both commands bind to `127.0.0.1` by default. Only processes on the same machine can connect. Stop them with `Ctrl C`.

A fresh local database is empty by design. Use **Settings → Data → Reset Demo** only when you want the deterministic example lab; switching to Live Mode no longer requires keeping seed records.

## Optional single-operator access control

Loopback-only operation does not normally need another login. If you deliberately make the process reachable from a trusted LAN, set a long random token:

```bash
export HOMELAB_ACCESS_USERNAME=homelab
export HOMELAB_ACCESS_TOKEN="$(openssl rand -base64 32)"
npm run start
```

The browser will show its HTTP Basic sign-in prompt. The token is compared in constant time and never sent to client JavaScript. Basic authentication must have TLS in front of it when traffic leaves loopback; do not expose the raw HTTP service to a shared or public network. The health endpoint remains unauthenticated and discloses only coarse readiness information.

## Always-on Docker Compose

Start the application and backup sidecar in the background:

```bash
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:3000/api/health
```

Enable Docker Desktop's “start at login” setting if the containers should return after a Mac restart. Compose uses `restart: unless-stopped`, so they restart with the Docker engine unless you intentionally stopped them.

The application container is non-root, read-only outside its data volume and temporary directory, bound only to host loopback, stripped of Linux capabilities, protected with `no-new-privileges`, and constrained by process, CPU, memory, and log limits. The backup sidecar has no network at all.

The collector is enabled by default in Compose but remains idle in Demo Mode. Its provider directory is mounted read-only from `config/`; create the ignored local registry with:

```bash
cp config/providers.example.json config/providers.json
```

Edit only local endpoints and secret references. Put actual values in `HOMELAB_SECRET_*` environment variables or macOS Keychain—not in the JSON file or Docker image. Provider binaries and hardware access vary by runtime; SMART and host Tailscale checks are usually best in a native process.

Stop without deleting data:

```bash
docker compose stop
```

Start again:

```bash
docker compose start
```

`docker compose down` removes containers and the network but preserves named volumes. Do not add `--volumes` unless you explicitly intend to delete the database and backups.

### Docker limitations on macOS

- Passive discovery sees the container/VM neighbor table, not necessarily the Mac host's full ARP table.
- Routed private-address ping and diagnostics may work, but VLAN routing and host firewall policy still apply.
- The host Docker daemon is intentionally unavailable because the Docker socket is not mounted. Mounting that socket would grant host-administrative power and is not recommended for this setup.
- Bonjour/mDNS and broadcast discovery are not implemented.

## Backups

### Native

`npm run backup` uses SQLite's online backup API, sets mode `0600`, runs `PRAGMA integrity_check`, and retains the newest 14 matching backups by default. The live database can remain open.

```bash
npm run backup
npm run backup:verify -- backups/homelab-YYYYMMDDTHHMMSS.sssZ.db
```

Customize the destination or retention with `HOMELAB_BACKUP_DIRECTORY` and `HOMELAB_BACKUP_RETENTION`.

### Docker

The network-isolated sidecar performs an immediate backup after it starts and repeats every 24 hours. It keeps verified backups in the `homelab-backups` named volume.

```bash
docker compose logs homelab-backup
docker compose exec homelab-backup ls -lh /app/backups
docker compose cp homelab-backup:/app/backups ./docker-backups
```

Copy backups to another physical disk or encrypted backup system. Keeping a backup beside the database protects against application/database failure, not loss of the host disk.

### Restore policy

First rehearse a restore without changing live data:

```bash
npm run restore:drill -- backups/homelab-YYYYMMDDTHHMMSS.sssZ.db
```

Restores are intentionally offline because they replace the active database. Stop the native process or Compose application, then run the guarded command:

```bash
npm run restore -- backups/homelab-YYYYMMDDTHHMMSS.sssZ.db --apply --confirm=REPLACE_LOCAL_DATABASE
```

The script verifies the backup and HomeLab schema, refuses a busy database, creates a verified pre-restore safety backup, stages the replacement with owner-only permissions, atomically renames it, removes stale WAL sidecars, and verifies the result. For Docker, copy both backup and current volume data out first and perform the restore with containers stopped. Never use `docker compose down --volumes` as a restore step.

## Private remote access with Tailscale

Keep the app and Docker port bound to `127.0.0.1`. Install Tailscale on the Mac host, connect it to your Tailnet, and run the read-only preflight:

```bash
npm run remote:check
```

When every check is ready, review and run:

```bash
tailscale serve --bg http://127.0.0.1:3000
tailscale serve status
```

This publishes HTTPS only to authenticated devices in your Tailnet while the app remains on loopback. Configure `HOMELAB_ACCESS_TOKEN` as defense in depth. Do not use `tailscale funnel`, which creates a public endpoint. Remove access with `tailscale serve reset`.

## Collector and providers

- Native runtime: set `HOMELAB_COLLECTOR_ENABLED=1` before `npm run start`.
- Compose: enabled by default; set it to `0` in `.env` to disable it.
- Cadence: `HOMELAB_COLLECTOR_INTERVAL_SECONDS`, clamped to 30–3,600 seconds.
- Safety state: always idle in Demo Mode and always disabled on Vercel.
- Scope: manual services plus enabled providers, at four concurrent checks, inside approved private IPv4 ranges.
- UI: **Settings → Integrations** shows redacted configuration and run status.

Prometheus, Proxmox, UniFi, Home Assistant, SNMP, and NUT targets must resolve only to an approved private range. Tailscale and SMART use fixed local executable argument arrays. SNMP v2 community strings are passed to `snmpget` because that CLI requires it; prefer a dedicated read-only community and understand that same-host process inspection may expose arguments.

Self-hosted ntfy delivery must also use an approved local endpoint. Slack delivery accepts only an HTTPS `hooks.slack.com` URL resolved indirectly through `HOMELAB_SLACK_WEBHOOK_REF`. Notification failures do not stop collection and secrets are not logged.

## Deliberate operator actions

- TLS certificate diagnostics read a private endpoint's peer certificate, report expiration and local trust, and never follow redirects.
- Wake-on-LAN is available only for non-demo devices in Live Mode. It requires an approved `/24` or smaller CIDR, a valid stored MAC, and exact `WAKE <hostname>` confirmation for every packet. It is never scheduled.
- Docker inventory runs `info`, `ps`, and one-shot `stats` only. Container logs and lifecycle controls remain excluded because they can expose secrets or change workloads.

## Operational checks

- Readiness: `curl --fail http://127.0.0.1:3000/api/health`
- Native logs: structured JSON on stdout/stderr
- Docker app logs: `docker compose logs -f homelab-commander`
- Docker backup logs: `docker compose logs -f homelab-backup`
- Container state: `docker compose ps`
- Disk usage: `docker system df -v`

Client analytics are intentionally not installed. The app records privacy-preserving structured operational events and unhandled server errors without sending local inventory to an external telemetry service.
