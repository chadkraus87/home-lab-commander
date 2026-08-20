# Security model

## Trust boundaries

HomeLab Commander is a defensive administration tool for systems the operator owns and controls. The browser, local Node server, SQLite file, optional Docker CLI, and explicitly approved private networks form separate trust boundaries.

The default installation:

- starts in Demo Mode;
- needs no credentials or cloud services;
- stores no plaintext passwords;
- performs no network discovery until the operator reviews and starts it;
- does not expose arbitrary shell access;
- does not enable disruptive Docker actions;
- should remain bound to loopback.

## Input validation

Zod schemas validate persistent mutations, ports, hosts, CIDRs, diagnostic kinds, discovery methods, and every record in a portable import. Imports are capped at 2 MB, applied transactionally only after complete validation, and force Demo Mode so restored networks receive a fresh review. The network policy accepts loopback, RFC1918 IPv4, IPv6 unique-local, and IPv6 link-local addresses where relevant. Discovery additionally requires a CIDR already saved in the application's approved allowlist and caps each active run at 256 addresses.

SQLite operations use prepared statements. User input is never interpolated into SQL or shell command strings.

## Subprocess policy

Some local observations require `arp`, `ip`, `ping`, or `docker`. Each is called with Node `execFile`, a fixed executable name, fixed argument structure, bounded output, and a timeout. The application never passes a constructed shell command and exposes no arbitrary command field.

## Network policy

- Public addresses are rejected for managed-device input and provider operations.
- DNS diagnostic results are resolved and checked against the local-address policy before connection attempts.
- HTTP checks do not follow redirects.
- TCP and HTTP checks have short timeouts.
- Active discovery runs at eight hosts per batch and is rate-limited to once every 30 seconds per process.
- Passive discovery reads only the host neighbor table.

These controls reduce risk; they do not turn the app into a security boundary against a malicious local administrator.

## Docker

The Docker provider runs only `docker info` and `docker ps -a` with fixed formatting. The application does not mount the Docker socket by default. A Docker socket provides host-level administrative power even if mounted read-only; enable it only on a trusted host and never expose the app to untrusted users.

## Data and secrets

The repository ignores `.env` files, database files, backup database files, private keys, and runtime artifacts. Portable export includes devices, services, inventory, notes, and non-secret settings; credential material is not part of the domain model. Structured logs contain event names, coarse counts, status, and error classes—not request bodies, tokens, note content, or inventories.

npm install scripts fail closed unless explicitly reviewed. The only pending transitive script is denied because the application builds and tests without it. Container builds also disable framework telemetry.

SQLite online backups receive owner-only permissions and an integrity check. Automated retention deletes only files matching the application's exact backup filename pattern. The Docker backup process has no network access.

## Browser protections

Mutation routes compare an incoming browser `Origin` to the request host. Optional local access control uses a minimum-length token and constant-time comparison before requests reach application routes. Responses include `X-Content-Type-Options`, `X-Frame-Options`, `X-DNS-Prefetch-Control`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Referrer-Policy`, and a restrictive Permissions Policy. Status is conveyed through text and icons in addition to color.

## Public showcase boundary

Vercel deployments fail closed into Hosted Demo, even if no custom environment variable is configured. The server:

- forces snapshots to report Demo Mode;
- provides pristine seed data from ephemeral SQLite;
- keeps interactive visitor changes only in that browser tab's versioned session storage;
- rejects every server-side mutation, including Live Mode activation;
- rejects private-network discovery and diagnostics;
- rejects portable imports;
- never invokes the Docker provider.

Browser-local Demo mutations, reset, and export remain available so visitors can explore the workflow. A global notice tells visitors to use example data only. State disappears when the tab closes, and a warm serverless instance cannot share it with another visitor. A persistent public edition would require authenticated users, per-tenant authorization, durable managed storage, audit identity, and a separately authenticated local agent.

## Known boundary

This release has no multi-user identity because Live Mode is designed for one local operator on loopback. An optional HTTP Basic token adds defense in depth for a single operator, but it is not role-based authorization. Do not expose a Live Mode process publicly. Before exposing it on a shared LAN, place it behind authenticated TLS access and reassess CSRF, authorization, audit identity, and secret storage. Only the constrained Hosted Demo profile is intended for a public URL.

## Container boundary

Compose publishes only `127.0.0.1:3000`, runs the app as a non-root user with a read-only root filesystem, drops all Linux capabilities, sets `no-new-privileges`, limits processes/CPU/memory, rotates logs, and mounts only dedicated data. npm/Corepack build tooling is removed from the runtime image. The host Docker socket is not mounted. A second container backs up SQLite with no network namespace.

## Reporting

Do not include credentials, internal IP inventories, or sensitive logs in public vulnerability reports. Provide a minimal reproduction against Demo Mode when possible.

The most recent recorded review is [Security audit — 2026-08-20](SECURITY-AUDIT.md).
