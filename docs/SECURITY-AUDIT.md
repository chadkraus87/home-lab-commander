# Security audit — 2026-08-29

## Scope

This audit covered application trust boundaries, client/server separation, mutation and import validation, private-network enforcement, collector/provider/Wake-on-LAN boundaries, optional local access control, public Git history and Actions logs, dependency advisories, secrets hygiene, response headers, Docker runtime configuration, and container packages.

## Findings remediated

1. **Hosted visitor state could reach shared ephemeral SQLite.** Hosted edits now use a versioned browser-tab reducer, all server mutations return `403`, and a global notice asks visitors to use example data only.
2. **Portable import validation was structurally incomplete.** Imports now have a 2 MB limit, complete per-field Zod schemas, identifier/address duplicate detection, relationship validation, transactional application, and a forced return to Demo Mode.
3. **A Node-only IP helper entered the client graph.** Address validation is runtime-neutral now, preserving the same private/local address policy without bundling `node:net` into the browser.
4. **The first container scan found seven high/critical advisories.** All were in the unused npm CLI shipped by the base runtime image. npm and Corepack are now removed after the build stage. A repeat Docker Scout scan reported no vulnerable packages.
5. **Install-script review was implicit.** npm now fails on unreviewed dependency scripts. The one pending transitive development script is explicitly denied because builds and tests pass without it.
6. **Local shared-interface defense was optional only at the network layer.** A minimum-length, constant-time compared single-operator access token is available. It is disabled by default because loopback remains the safest default.
7. **Container and operational controls were incomplete.** Compose now adds a read-only root filesystem, non-root UID/GID, all-capability drop, `no-new-privileges`, loopback publishing, process/CPU/memory limits, log rotation, telemetry opt-out, and a networkless verified-backup process.
8. **Diagnostics accepted any private address rather than the saved allowlist.** Diagnostics now perform the same DNS and explicit-CIDR approval gate before ping, DNS, TCP, HTTP, or TLS work.
9. **Discovery promotion could duplicate existing devices.** Results are reconciled by normalized MAC, IP, then hostname; matched records are visibly disabled for promotion.
10. **Muted dark-theme text missed WCAG AA contrast.** The shared secondary token was raised and an Axe serious/critical gate now covers local and hosted overviews.
11. **New local integrations needed a strict secret and SSRF boundary.** Provider configuration accepts only indirect `HOMELAB_SECRET_*`/Keychain references; HTTP requests reject public or mixed DNS answers, unapproved ranges, redirects, URL credentials, oversized bodies, and long responses.
12. **Public portfolio release needed repository-history and supply-chain gates.** Seven tracked commits and all historical Actions logs were scanned; Gitleaks 8.30.1 found no leaks. Tracked media and configuration contain examples only. CodeQL, Dependabot, secret scanning/push protection, scheduled audits, immutable Actions, container scanning, and attested release builds were added.
13. **Docker's build context did not mirror all Git exclusions.** The Docker ignore policy now excludes backups, databases/WAL files, local provider configuration, environment files, keys/certificates, and all Playwright reports before `COPY . .` can create an image layer.
14. **The release image contained a stale Alpine OpenSSL package.** Docker Scout identified seven fixable high-severity findings in OpenSSL 3.5.7. The shared base stage now applies Alpine security upgrades, and CI/release builds pull the current base before scanning or publishing.
15. **Local browser QA could attach to an unrelated process on its test port.** The Playwright profile now uses a dedicated port and refuses to reuse an existing server, so a collision fails closed instead of testing the wrong application.
16. **CodeQL found a dynamic tour link and disabled TLS certificate validation.** Tour navigation now uses an allowlisted scenario parser plus framework navigation without a dynamic DOM link. TLS diagnostics require normal certificate validation and report untrusted handshakes as failures instead of connecting insecurely.

## Verification results

| Check                                  | Result                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Full `npm audit`                       | 0 known vulnerabilities                                                    |
| Production-only `npm audit --omit=dev` | 0 known vulnerabilities                                                    |
| Docker Scout image `a4e3ada4c98e`      | 0 critical, high, medium, or low package vulnerabilities                   |
| Repository secret-pattern scan         | No credential/private-key material found                                   |
| ESLint                                 | Passed                                                                     |
| Strict TypeScript                      | Passed                                                                     |
| Vitest                                 | 13 files, 34 tests passed                                                  |
| Playwright                             | 12 local journeys plus 3 hosted-boundary journeys                          |
| Axe                                    | No serious or critical overview violations after contrast remediation      |
| JavaScript budget                      | 1,974,368 bytes; below the 4,000,000-byte budget                           |
| Desktop/mobile browser console audit   | No console errors, page errors, or failed responses                        |
| Next.js production build               | Passed                                                                     |
| Docker health and privilege inspection | Healthy; non-root; read-only; capabilities dropped; loopback-only port     |
| Automated backup                       | Created, mode `0600`, integrity verified, no network in sidecar            |
| Hosted mutation and discovery probes   | Both rejected with `403`                                                   |
| Hosted local-operation probes          | Discovery, diagnostics, collector, providers, and Wake-on-LAN rejected 403 |
| Full tracked Git history (Gitleaks)    | 7 commits scanned; no leaks found                                          |
| Historical Actions-log scan            | No high-confidence secrets or local filesystem paths found                 |
| Optional access-control probe          | Health `200`; anonymous/wrong credentials `401`; correct credentials `200` |

## Deliberate residual boundaries

- HTTP Basic access control is only a single-operator defense. Use TLS when traffic leaves loopback; it is not multi-user authorization.
- A local administrator can change the process, database, or Docker configuration. The app is not a security boundary against its host owner.
- Docker Desktop may reduce Live discovery visibility. Native operation is recommended for complete host-neighbor and host-Docker observation.
- Configured providers require the operator to choose targets, approved ranges, least-privilege credentials, and secret references. Missing local binaries fail unavailable without broadening the boundary.
- SNMP v2c requires the read-only community value in `snmpget` arguments; same-host process inspection is a residual exposure. Prefer a dedicated community and a trusted single-user host.
- Slack notifications are a deliberate opt-in outbound HTTPS call to the exact `hooks.slack.com` host; notification content should avoid sensitive inventory.
- Advisory databases change. Re-run both npm audit and the container scan when dependencies or the base image change.
