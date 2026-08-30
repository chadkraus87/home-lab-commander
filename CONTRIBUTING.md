# Contributing

Focused issues and pull requests are welcome.

1. Keep changes inside the defensive, local-first product boundary in `AGENTS.md`.
2. Branch from `main`, use strict TypeScript, validate external input with Zod, and preserve accessibility.
3. Add focused tests for policy, domain logic, or user workflows.
4. Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run test:e2e:hosted`, `npm run build`, and `npm run performance:budget`.
5. Never commit `.env`, `config/providers.json`, databases, backups, tokens, internal inventories, or real homelab screenshots.

Security reports belong in the private advisory flow described in [SECURITY.md](SECURITY.md), not a public issue.
