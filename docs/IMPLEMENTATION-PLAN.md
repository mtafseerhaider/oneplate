# Implementation Plan

Each phase ends with something that runs. Estimates assume part-time work.

## Phase 0: Foundation (this commit)
- Monorepo with pnpm workspaces, shared TypeScript config, CI workflow.
- `packages/core` extracted from the single file with unit tests: foods and meal maths, portions and cook quantities, family stages and factors, Hijri and Sunnah fast days, prayer times, training phases, Quran course index and al-Mizan volume map, well-being scoring.
- `packages/content` with the curated libraries and their provenance fields.
- `apps/api`: Fastify server, SQL migrations, auth, households, memberships, generic household documents with optimistic versions, audit log, OpenAPI at `/docs`, integration tests against Postgres.
- `apps/web`: the current UI served as a PWA with a manifest and service worker, plus the API adapter so the existing app runs unchanged against the local backend.
- `infra`: Docker Compose, Caddy, backup script, `.env.example`.
- Exit: `docker compose up` on a laptop gives a working OnePlate at `https://localhost` with sign-up, household creation and an invite for Uzma.

## Phase 1: Product hardening
Done in this commit:
- Live updates over Server-Sent Events, backed by Postgres LISTEN/NOTIFY so several API instances share one stream; polling stays as the fallback.
- Conflicts refresh the document from the server and tell the user, instead of failing silently.
- Export my household and delete my household from inside the app (owner only, delete needs a second tap).
- Email delivery behind a Mailer interface: password reset by one-hour token, invite emails; console transport locally, memory transport in tests.
- Invite Uzma from the app's Account card; sign out.
Still to do:
- Passkey sign-in on supported devices.
- Accessibility pass and Urdu interface strings (RTL) using the existing Urdu food names as the seed.
- SMTP or provider transport for the Mailer (one class), and a real domain for the reset links.

## Phase 2: Decompose the UI (3–4 weeks)
- Move the single-file UI into `apps/web/src` modules by tab, keeping the design tokens. The artifact build becomes a bundler target that inlines the result, so `app/index.html` is generated, not hand-edited.
- Component tests for the plate builder, meal editor and progress grid.

## Phase 3: Launch readiness (2–3 weeks)
- Multi-household admin, usage limits, status page, structured error reporting, privacy policy and terms, data retention policy, backup restore drill, load test of the sync endpoints.
- App-store wrappers (Capacitor) only if a store presence is wanted; the PWA already installs on both platforms.

## Phase 4: Content and scholarship
- Scholar review workflow for teachings and al-Mizan notes with verification status shown in the UI, following the Bayan Library's review gates.
- Expand the Quran course to the full text in 365 readings.

## Operating rules
- Children are never restricted: enforced in `core`, validated at the API, tested in CI.
- No change to a domain rule without a test.
- The artifact and the local app are built from the same sources; a fix lands in both.
