# Security audit — 2026-08-20

## Scope

This audit covered application trust boundaries, client/server separation, mutation and import validation, private-network enforcement, optional local access control, dependency advisories, secrets hygiene, response headers, Docker runtime configuration, and container packages.

## Findings remediated

1. **Hosted visitor state could reach shared ephemeral SQLite.** Hosted edits now use a versioned browser-tab reducer, all server mutations return `403`, and a global notice asks visitors to use example data only.
2. **Portable import validation was structurally incomplete.** Imports now have a 2 MB limit, complete per-field Zod schemas, identifier/address duplicate detection, relationship validation, transactional application, and a forced return to Demo Mode.
3. **A Node-only IP helper entered the client graph.** Address validation is runtime-neutral now, preserving the same private/local address policy without bundling `node:net` into the browser.
4. **The first container scan found seven high/critical advisories.** All were in the unused npm CLI shipped by the base runtime image. npm and Corepack are now removed after the build stage. A repeat Docker Scout scan reported no vulnerable packages.
5. **Install-script review was implicit.** npm now fails on unreviewed dependency scripts. The one pending transitive development script is explicitly denied because builds and tests pass without it.
6. **Local shared-interface defense was optional only at the network layer.** A minimum-length, constant-time compared single-operator access token is available. It is disabled by default because loopback remains the safest default.
7. **Container and operational controls were incomplete.** Compose now adds a read-only root filesystem, non-root UID/GID, all-capability drop, `no-new-privileges`, loopback publishing, process/CPU/memory limits, log rotation, telemetry opt-out, and a networkless verified-backup process.

## Verification results

| Check                                  | Result                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Full `npm audit`                       | 0 known vulnerabilities                                                    |
| Production-only `npm audit --omit=dev` | 0 known vulnerabilities                                                    |
| Docker Scout final runtime image       | 0 critical, high, medium, or low package vulnerabilities                   |
| Repository secret-pattern scan         | No credential/private-key material found                                   |
| ESLint                                 | Passed                                                                     |
| Strict TypeScript                      | Passed                                                                     |
| Vitest                                 | 10 files, 29 tests passed                                                  |
| Playwright                             | 11 browser journeys passed                                                 |
| Desktop/mobile browser console audit   | No console errors, page errors, or failed responses                        |
| Next.js production build               | Passed                                                                     |
| Docker health and privilege inspection | Healthy; non-root; read-only; capabilities dropped; loopback-only port     |
| Automated backup                       | Created, mode `0600`, integrity verified, no network in sidecar            |
| Hosted mutation and discovery probes   | Both rejected with `403`                                                   |
| Optional access-control probe          | Health `200`; anonymous/wrong credentials `401`; correct credentials `200` |

## Deliberate residual boundaries

- HTTP Basic access control is only a single-operator defense. Use TLS when traffic leaves loopback; it is not multi-user authorization.
- A local administrator can change the process, database, or Docker configuration. The app is not a security boundary against its host owner.
- Docker Desktop may reduce Live discovery visibility. Native operation is recommended for complete host-neighbor and host-Docker observation.
- Credentialed providers and remote agents remain disabled until the operator chooses targets, least-privilege credentials, secret storage, and enrollment policy.
- Advisory databases change. Re-run both npm audit and the container scan when dependencies or the base image change.
