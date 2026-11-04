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

## Phase 1: Product hardening (2–3 weeks)
- Replace polling with Server-Sent Events; conflict toasts in the UI.
- Export my household (JSON) and delete my household endpoints and screens.
- Email delivery (invite emails, password reset) behind an interface; console transport locally.
- Passkey sign-in on supported devices.
- Accessibility pass and Urdu interface strings (RTL) using the existing Urdu food names as the seed.

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
