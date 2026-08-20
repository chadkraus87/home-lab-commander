<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HomeLab Commander project instructions

## Product boundary

HomeLab Commander is a local-first, defensive administration application. New installations start in clearly labeled Demo Mode. Live discovery and diagnostics must only target loopback, RFC1918 IPv4, or local-link IPv6 ranges explicitly approved by the user. Never add public-internet scanning, arbitrary shell access, credential attacks, or unattended disruptive actions.

## Architecture

- `src/app`: Next.js App Router pages and narrow HTTP route handlers.
- `src/components`: shared application shell and UI primitives.
- `src/features`: cohesive product-area client components.
- `src/domain`: normalized models, schemas, calculations, and policies with no UI imports.
- `src/server`: SQLite repositories, collectors, health checks, and provider implementations. Server-only modules must import `server-only`.
- `src/simulation`: deterministic Demo Mode data and evolution.
- `migrations`: append-only SQLite migrations.
- `tests`: unit, component, and integration tests.
- `e2e`: Playwright user journeys.

Server Components read directly from repositories. Mutations use validated route handlers because the client maintains a live simulation state and needs JSON responses. Client components receive serializable plain data only.

## Conventions

- TypeScript strict mode; do not use `any`.
- Validate external input with Zod at the server boundary.
- Keep normalized domain logic pure and independently testable.
- Use private-address helpers before every discovery or diagnostic network operation.
- Use `execFile` with fixed executable names and argument arrays when an OS command is unavoidable. Never construct shell commands from user input.
- User-facing errors say what happened and what to do next without exposing internals.
- Visible controls must work, be deliberately disabled with an explanation, or be removed.
- Demo data must remain clearly labeled and must never be presented as live telemetry.
- Preserve accessibility: semantic controls, labels, keyboard behavior, visible focus, and non-color status cues.

## Commands

- `npm run dev` — local development server.
- `npm run build` — production build.
- `npm run start` — production server.
- `npm run lint` — ESLint.
- `npm run typecheck` — TypeScript without emit.
- `npm test` — Vitest suite once.
- `npm run test:watch` — Vitest watch mode.
- `npm run test:e2e` — Playwright journeys.
- `npm run format:check` — Prettier validation.

## Definition of done

For product changes: implement the full workflow, cover important domain logic and interactions, run lint, typecheck, unit/integration tests, E2E tests, and the production build, then verify the affected workflow in a real browser. Update architecture and security documentation when a stable boundary changes.
