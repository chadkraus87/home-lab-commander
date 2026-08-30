# Changelog

All notable changes are documented here.

## Unreleased

### Added

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

- Provider HTTP targets must resolve entirely inside an explicitly approved private IPv4 range; redirects, oversized responses, and credential-bearing URLs are rejected.
- Hosted deployments block collector, provider, discovery, diagnostic, Wake-on-LAN, import, Docker, and server-mutation boundaries.
- Docker build context excludes local databases, backups, provider configuration, environment files, keys/certificates, and browser reports.
- Container builds apply current Alpine security updates and pull the current base image before CI scanning or tagged publication.
