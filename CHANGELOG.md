# Changelog

All notable changes are documented here.

## Unreleased

### Added

- Validated scheduled maintenance windows with a global status indicator, Alerts-page context, collector notification suppression, and activity-history evidence.
- A Hosted Demo maintenance scenario and browser regression guards for console errors, uncaught page errors, and failed page responses.
- A restrictive Content Security Policy for local and hosted browser sessions.
- Deep-linked Hosted Demo scenarios, incident playback, and an accessible guided tour.
- Opt-in Live Mode collector with service transitions, deduplicated alerts, provider checks, and notification adapters.
- Schema-validated Prometheus, Proxmox, UniFi, Home Assistant, NUT, SNMP, Tailscale, and SMART provider registry using indirect secrets.
- Discovery reconciliation, TLS certificate diagnostics, confirmed one-shot Wake-on-LAN, and Docker CPU/memory stats.
- Offline restore drill and guarded restore workflow plus private Tailscale Serve preflight.
- Axe accessibility checks, JavaScript budget, CodeQL, Dependabot, scheduled dependency/container audits, and attested GHCR release workflow.
- Open Graph image, sitemap, robots metadata, public security policy, and contribution guide.

### Changed

- Fresh local databases start empty; example data is seeded only when explicitly requested or in Hosted Demo/testing.
- Secondary text contrast now meets WCAG AA on the tested dark overview.
- GitHub Actions use immutable, current action SHAs.

### Security

- Updated Next.js to 16.3.4 and Sharp to 0.35.4 to remediate newly disclosed remote-code-execution/libheif advisories, and updated transitive `js-yaml` to 4.3.2.
- Removed the unused `net-tools` runtime package after Docker Scout identified an unfixed medium-severity advisory; Linux neighbor discovery continues through `iproute2`.
- Expanded scheduled GitHub dependency auditing to include development tooling and corrected the hostname field's Unicode-aware HTML validation pattern.
- Provider HTTP targets must resolve entirely inside an explicitly approved private IPv4 range; redirects, oversized responses, and credential-bearing URLs are rejected.
- Hosted deployments block collector, provider, discovery, diagnostic, Wake-on-LAN, import, Docker, and server-mutation boundaries.
- Docker build context excludes local databases, backups, provider configuration, environment files, keys/certificates, and browser reports.
- Container builds apply current Alpine security updates and pull the current base image before CI scanning or tagged publication.
- Hosted scenario values are reduced through an explicit allowlist, and TLS diagnostics never disable certificate validation.
