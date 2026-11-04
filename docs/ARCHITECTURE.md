# OnePlate Architecture

> Target: a family well-being platform that runs on one laptop today (`docker compose up`) and can be launched as a multi-household product later without a rewrite. Everything below is chosen so that the same code serves both.

## 1. Shape of the system

```
apps/web        Progressive web app (installable on iOS, Android, desktop). Offline-first.
apps/api        HTTP API (Fastify, TypeScript). Auth, households, documents, sync, OpenAPI.
packages/core   Pure domain logic, no I/O: foods, meals, portions, family stages, Hijri,
                prayer times, training plan, Quran course, well-being scoring.
packages/content Curated content with provenance: verses, surahs, stories, teachings,
                words, ideas, books, duas, poems, the al-Mizan volume map,
                the 114-surah index with al-Mizan purpose notes, the review gates.
infra/          Docker Compose, Caddy reverse proxy, backup script, env templates.
app/index.html  The single-file build that the claude.ai artifact serves today. It stays
                the fastest way to try the app and is regenerated from the same sources.
```

Dependency rule: `web` and `api` depend on `core` and `content`; `core` depends on nothing; `content` depends on nothing. Domain rules never live in a route handler or a component.

## 2. Domain model

| Aggregate | What it holds | Owner of writes |
|---|---|---|
| Household | name, timezone, city, Hijri offset, tradition, settings | owner |
| Member | profile: name, relation, role (adult/child), date of birth, sex, goal, status | owner; contributor for non-owner members |
| User | login identity, linked to one or more memberships | self |
| Membership | user × household × access level (owner, contributor, viewer) | owner |
| Day | one document per household per date: habits, mood, sleep, gratitude, journal per member, learning per member, circle, chosen meal | owner for own fields; contributor for own member's fields |
| Weigh-in | date, member, weight, waist or height | owner; contributor for non-owner members |
| Fast | current fast start, last fast | owner |
| Meal | built-in override or custom meal: items of food × quantity | owner, contributor |
| Quran progress | one document: read and revisit flags per reading (365, the whole Quran), page notes per passage | owner |
| Content review | global, not per household: status per content key (draft, reviewed, verified, disputed), reviewer, source checked, note | reviewers named in `ADMIN_EMAILS`; the owner in the artifact |
| Audit event | who changed what, when, from where | system |

Children are never restricted. This is enforced in `core` (no calorie or target fields exist on a child member) and validated again at the API boundary.

## 3. Storage and sync

- **Server of record:** PostgreSQL. One table per aggregate with `household_id` on every row, so authorisation is one indexed predicate. JSON columns hold the flexible day and meal payloads; typed columns hold what is queried.
- **Client:** IndexedDB cache of the household's documents. Reads are served locally first; writes are queued and sent with a version; the server rejects stale versions (optimistic concurrency), and the client reconciles by re-reading. This is the same contract the artifact's database uses today, so the current UI needs an adapter, not a rewrite.
- **Sync transport:** HTTPS JSON, polling every 30 s in the foreground, plus Server-Sent Events for live updates when available. No WebSocket requirement on the host.
- **Migrations:** plain SQL files applied in order, recorded in `schema_migrations`. No ORM engine download, so builds work behind restrictive proxies.

## 4. Identity and access

- Email and password with `scrypt` hashing (Node built-in), httpOnly SameSite session cookies, CSRF token on state-changing requests, rate limits on auth routes. Passkeys and email codes are planned as additions, not replacements.
- Access levels mirror the artifact: **owner** (everything), **contributor** (own member's entries, children's entries, meals), **viewer** (read). Enforced in one policy module used by every route.
- Household invites by single-use code with expiry. No public links.
- Children have no accounts; their data belongs to the household.

## 5. Security baseline

Helmet headers, strict CORS to the configured origin, input validation with zod on every route, parameterised SQL only, secrets from environment, audit log on every write, backups of the Postgres volume by a scheduled script, dependency audit in CI. Health data is sensitive: no third-party analytics, no tracking pixels, export and delete-my-household endpoints from day one.

## 6. Observability

Structured JSON logs (pino) with request ids, `/health` and `/ready` endpoints, basic metrics exposed as JSON for a scraper, error reporting hook kept pluggable (Sentry-compatible) but off by default.

## 7. Quality gates

Type-checked TypeScript everywhere, unit tests for every function in `core`, API integration tests against a real Postgres, Playwright smoke test of the web app, CI on every push, and a release checklist in `docs/`.

## 8. Deployment

- **Local / home:** `docker compose up` starts Postgres, the API and Caddy serving the PWA with automatic local TLS. Data lives in a named volume; `infra/backup.sh` dumps it nightly.
- **Launch:** the same images on any VPS or managed container host, Postgres managed or self-hosted, Caddy or a cloud load balancer in front. Multi-tenancy is already in the schema, so launch is configuration, not code.

## 9. What stays from today

The artifact version keeps working and is still the easiest way to share with family. It and the local version are two builds of one codebase: the artifact build inlines everything into `app/index.html` and talks to the artifact database; the local build serves the same UI as a PWA and talks to the API through a thin adapter that exposes the same `doc` and `collection` calls.
