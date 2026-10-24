# Security audit — 2026-10-23

## Scope

This audit covered application trust boundaries, client/server separation, mutation and import validation, private-network enforcement, collector/provider/Wake-on-LAN boundaries, maintenance notification behavior, optional local access control, public Git history and Actions logs, dependency advisories and signatures, secrets hygiene, response headers, browser failure telemetry, accessibility, telemetry-label integrity, Docker runtime configuration, and container packages.

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
12. **Public portfolio release needed repository-history and supply-chain gates.** The complete pre-release history and all historical Actions logs were scanned; Gitleaks 8.30.1 found no leaks. Tracked media and configuration contain examples only. CodeQL, Dependabot, secret scanning/push protection, scheduled audits, immutable Actions, container scanning, and attested release builds were added.
13. **Docker's build context did not mirror all Git exclusions.** The Docker ignore policy now excludes backups, databases/WAL files, local provider configuration, environment files, keys/certificates, and all Playwright reports before `COPY . .` can create an image layer.
14. **The release image contained a stale Alpine OpenSSL package.** Docker Scout identified seven fixable high-severity findings in OpenSSL 3.5.7. The shared base stage now applies Alpine security upgrades, and CI/release builds pull the current base before scanning or publishing.
15. **Local browser QA could attach to an unrelated process on its test port.** The Playwright profile now uses a dedicated port and refuses to reuse an existing server, so a collision fails closed instead of testing the wrong application.
16. **CodeQL found a dynamic tour link and disabled TLS certificate validation.** Tour navigation now uses an allowlisted scenario parser plus framework navigation without a dynamic DOM link. TLS diagnostics require normal certificate validation and report untrusted handshakes as failures instead of connecting insecurely.
17. **New framework, image-processing, and YAML advisories affected the dependency graph.** Next.js was upgraded to 16.3.4, Sharp to 0.35.4, and transitive `js-yaml` to 4.3.2. The scheduled workflow now audits development dependencies as well as production packages.
18. **Browser policy depended on individual headers without a Content Security Policy.** A restrictive CSP now limits scripts, styles, images, fonts, connections, forms, frames, object embedding, and framing origins for both local and hosted deployments.
19. **Browser journeys did not fail on console, page, or response errors.** Shared guards now make every local and hosted journey fail on console errors, uncaught page errors, and HTTP responses at or above 400. The first guarded run exposed and fixed an asynchronous form-reset error and an invalid Unicode-aware HTML hostname pattern.
20. **Planned work could create noisy outbound incident notifications.** Maintenance windows are schema-validated, limited in count and duration, reject overlaps, and preserve all alerts and activity. During an active window the collector suppresses only the first outbound outage notification and records the suppression decision and window identifier.
21. **The rebuilt runtime image contained an unfixed medium-severity `net-tools` advisory.** The package was unused and removed; Linux neighbor discovery continues through `iproute2`. A repeat all-severity scan found no vulnerable packages.
22. **New Next.js advisories affected the deployed framework line.** Next.js was upgraded from 16.3.8 to 16.4.3, above the 16.4.1 fix floor for GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r, and GHSA-673q-mjm6-r5xr. Sharp remains at the fixed 0.35.5 release.
23. **The test toolchain resolved to vulnerable Vite and Vitest releases.** Vitest was upgraded to 5.0.5 and Vite is now an explicit 8.3.5 development dependency. Full and production-only npm audits both report zero known vulnerabilities.
24. **Overview-only Axe coverage missed route-specific WCAG failures.** Automated WCAG A/AA checks now cover 14 primary local routes and the same 14 Hosted Demo routes. The pass fixed unlabeled Activity and Inventory filters, invalid ARIA on topology status markers, a 23-pixel notes target, and primary-button contrast.
25. **Browser tests exercised the development compiler instead of the production artifact.** Both Playwright profiles now build and start the production server, avoiding lazy-compile navigation races and matching Docker/Vercel runtime behavior more closely.
26. **The network map hid required React Flow attribution.** The unsupported attribution override was removed, restoring the library's visible credit and eliminating its license warning.
27. **Pinned CI and developer-tool dependencies had verified upstream updates available.** Checkout, setup-node, Docker login/metadata, and Trivy Action now use the current immutable Dependabot-provided commit SHAs. ESLint 10, TypeScript 6.0.3, and Vitest 5 passed their migration checks. Node 24 remains the runtime because it is the supported LTS line; Node 25 is intentionally deferred.
28. **Overview copy could contradict the current environment.** Demo/Live banners and descriptions are now mode-aware, and availability, restart, device, gateway, DNS, allowlist, link-health, and overall health summaries are calculated from the active snapshot instead of presenting fixed sample-lab values as current telemetry. A new installation reports a neutral “No data” health state until it has observations.

## Verification results

| Check                                  | Result                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Full `npm audit`                       | 0 known vulnerabilities                                                    |
| Production-only `npm audit --omit=dev` | 0 known vulnerabilities                                                    |
| Trivy 0.76.1 final runtime image       | 0 fixable critical/high OS or Node package vulnerabilities                 |
| Current source secret-pattern scan     | 2.08 MB scanned after generated/dependency exclusions; no leaks found      |
| ESLint                                 | Passed                                                                     |
| Strict TypeScript                      | Passed                                                                     |
| npm registry signatures                | 622 verified signatures and 165 verified attestations                      |
| Vitest                                 | 14 files, 41 tests passed                                                  |
| Playwright                             | 14 local journeys plus 4 hosted-boundary journeys                          |
| Axe WCAG A/AA                          | 14 local and 14 hosted primary routes passed                               |
| JavaScript budget                      | 2,049,974 bytes; below the 4,000,000-byte budget                           |
| Desktop/mobile browser error guard     | No console errors, page errors, or failed responses                        |
| Maintenance visual inspection          | Active state, alert context, scheduling UI, and removal control verified   |
| Next.js production build               | Passed                                                                     |
| Docker health and privilege inspection | Healthy; non-root; read-only; capabilities dropped; loopback-only port     |
| Automated backup                       | Created, mode `0600`, integrity verified, no network in sidecar            |
| Hosted mutation and discovery probes   | Both rejected with `403`                                                   |
| Hosted local-operation probes          | Discovery, diagnostics, collector, providers, and Wake-on-LAN rejected 403 |
| Release source scan (Gitleaks 8.30.1)  | 2.08 MB scanned after generated/dependency exclusions; no leaks found      |
| Full tracked Git history (Gitleaks)    | 28 commits / 1.24 MB scanned; no leaks found                               |
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
- TypeScript 7 is an intentional compatibility deferral, not a known-vulnerability exception: the current `typescript-eslint` release explicitly requires the TypeScript 6 compiler API. Node 25 is likewise deferred because this production app targets the Node 24 LTS line.
- ESLint 10 is supported by `eslint-config-next` 16.4 and the lint gate passes, but several nested ESLint plugins have not yet widened their peer-version declarations beyond ESLint 9, so `npm ci` emits non-blocking peer metadata warnings. These should be removed when the upstream plugins publish compatible declarations.
