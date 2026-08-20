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

Zod schemas validate persistent mutations, ports, hosts, CIDRs, diagnostic kinds, and discovery methods. The network policy accepts loopback, RFC1918 IPv4, IPv6 unique-local, and IPv6 link-local addresses where relevant. Discovery additionally requires a CIDR already saved in the application's approved allowlist and caps each active run at 256 addresses.

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

The repository ignores `.env` files, database files, private keys, and runtime artifacts. Portable export includes devices, services, inventory, notes, and non-secret settings; credential material is not part of the domain model. Structured logs must never include secrets.

## Browser protections

Mutation routes compare an incoming browser `Origin` to the request host. Responses include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restrictive Permissions Policy. Status is conveyed through text and icons in addition to color.

## Known boundary

This release has no application-owned sign-in because it is designed for one local operator on loopback. Do not bind it to a public interface. Before exposing it on a shared LAN, place it behind authenticated TLS access and reassess CSRF, authorization, audit identity, and secret storage.

## Reporting

Do not include credentials, internal IP inventories, or sensitive logs in public vulnerability reports. Provide a minimal reproduction against Demo Mode when possible.
