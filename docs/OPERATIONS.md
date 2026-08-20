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

Restores are intentionally offline and manual because they replace the active database. First stop the application, verify the chosen backup, make a second copy of the current database, and only then replace it. Do not copy over a running WAL database. For Docker, export the chosen backup and database volume before restoring; do not use `docker compose down --volumes` as a restore step.

## Operational checks

- Readiness: `curl --fail http://127.0.0.1:3000/api/health`
- Native logs: structured JSON on stdout/stderr
- Docker app logs: `docker compose logs -f homelab-commander`
- Docker backup logs: `docker compose logs -f homelab-backup`
- Container state: `docker compose ps`
- Disk usage: `docker system df -v`

Client analytics are intentionally not installed. The app records privacy-preserving structured operational events and unhandled server errors without sending local inventory to an external telemetry service.
