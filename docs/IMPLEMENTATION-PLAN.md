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
Also done:
- Passkey sign-in (WebAuthn, discoverable credentials): add a passkey from the Account card, sign in with Face ID or fingerprint from the sign-in page; verified end to end with a virtual authenticator.
- Urdu interface as a per-device choice (toggle in the top bar): right-to-left layout, Noto Nastaliq Urdu, about 100 interface strings; the content libraries stay in English until the phase 4 content edition.
- Accessibility: skip link, main landmark, labelled navigation, every icon button labelled, visible focus, reduced-motion respected.
- SMTP transport for the Mailer (`MAIL_TRANSPORT=smtp`, `SMTP_URL`, `MAIL_FROM`), wired into Docker Compose.
Still to do:
- A real domain for the reset links (configuration, once hosted).
- Translate the remaining long-form screens (Train and Learn body text) once a reviewer for the Urdu copy is available.

## Phase 2: Decompose the UI
Step 1, done in this commit:
- The single file is split into `apps/web/src` (head, styles, markup, 21 ordered script chunks). `scripts/build-app.mjs` reassembles `app/index.html` byte for byte; the PWA build runs it first; CI fails on drift. The artifact is now a build output, not a hand-edited file.
Step 2, done:
- `@oneplate/core` and `@oneplate/content` are bundled into the app by esbuild (`apps/web/src/lib.js`) and the interface's own copies of the food table, meal maths, family portions, Hijri and prayer-time code, plan tables, all content libraries, the glossary and the Urdu strings were deleted. The interface keeps thin wrappers that read app state and call core. A 15-point snapshot of calculations taken before the change matches after it.
- Browser component tests in `apps/web/test` cover the plate builder, meal editor, family portions, progress grid, Urdu toggle and script errors; CI installs Chromium and runs them.
Step 3, later:
- Convert the interface chunks themselves to ES modules by tab, with TypeScript, once the content review workflow (phase 4) settles the data shapes.

## Phase 3: Launch readiness
Done in this commit:
- Admin routes for the addresses in `ADMIN_EMAILS` (stats, households, audit, retention run), hidden as 404 to everyone else.
- Limits: households per account (`MAX_HOUSEHOLDS_PER_USER`, default 3) and documents per household (`MAX_DOCS_PER_HOUSEHOLD`, default 25,000), plus the existing rate limits.
- `/status` and `/metrics` on the API and a public status page; structured error reporting to `ERROR_WEBHOOK_URL` on server errors, with a request id returned to the client.
- Privacy policy and terms pages linked from sign-in; data retention job every six hours (expired sessions, reset links, challenges, invites; audit events after `AUDIT_RETENTION_DAYS`).
- Backup restore drill (`infra/drill.sh`, run locally and passing), production restore script, and `docs/RELEASE-CHECKLIST.md`.
- Load test (`scripts/loadtest.mjs`) against the local API on one laptop core set: 20 clients, 1,615 requests/s, p95 39 ms; 50 clients, 1,659 requests/s, p95 80 ms; zero failures. The first run found and fixed a connection-pool deadlock in the write path (a pool client was held while awaiting a second pool query).
Not planned: app-store wrappers; the PWA installs on both platforms.

## Phase 4: Content and scholarship
Done in this commit:
- The Quran course now covers the whole text: `core.buildCourse` splits the 6,236 verses into 365 readings in canonical order, never crossing a surah, keeping the 67 curated passages intact as close readings and filling the rest with each surah's summary and al-Mizan purpose note from the new 114-surah index (`packages/content/src/surah-index.ts`). Longest reading 44 verses, median 18. Progress and page notes recorded against the old 67-reading course migrate by passage reference, once, on the owner's next open (tested).
- Scholar review workflow after the Bayan Library's gates: draft → reviewed → verified, plus disputed. `content_reviews` table (global), `GET /content/reviews` for any signed-in user, `PUT /admin/content/reviews/:key` for reviewers (the `ADMIN_EMAILS` accounts; verified requires the source checked), audited. The artifact keeps reviews in one `reviews/all` document written by the owner. Stable content keys (`core.contentKey`): readings and surahs by reference, other items by a hash of their text so reordering never moves a review. Badges on the reading, surah, teaching and story cards; an inline review panel for reviewers; a summary with counts on the Learn tab.
- Follow-up in the same phase: progress is now stored by passage key (`quran-s-f-t`, document version 3) instead of reading number, with the v1 (67 readings) and v2 (first 365-day course) key lists frozen in content so older marks move once and nothing shifts when the course changes. A reviewer's queue lists every item of one kind in one status in course order, with export and import of reviews as JSON. The close readings grew from 67 to 112, so 112 of the 365 days now carry their own al-Mizan note; longest reading still 44 verses, median 18.
Still open: every note is a draft until someone reviews it; the first pass through the close readings against the printed WOFIS volumes is the next content task (al-islam.org hosts volumes 1 to 13, which cover the readings up to 6:83, but this cloud session's network policy blocks that host), and the mechanical schedule can later be hand-tuned to ruku boundaries.

## Phase 5: Open from a link, on every device
Done in this commit:
- Family links: `member_links` table, owner-only create/list/revoke routes, and `POST /open/:token` which checks the member's date of birth against the family document, signs the device in (reusing that member's account, or creating one bound to the membership), and reports whether a passkey exists. Rate-limited; denied attempts audited. Children never get links.
- `account.html?open=<token>`: date-of-birth step, then passkey setup (Face ID, Touch ID, fingerprint), then the app; an already signed-in device goes straight in; after sign-out the page leads with the passkey button. Account card: links per adult with copy and share, revoke, an Install button where the browser offers it, and install instructions per platform.
- Single-service deploy: the API serves the built web app when `WEB_DIST` is set; root `Dockerfile`, `render.yaml` blueprint, `PUBLIC_URL` defaulting from Render's variable.
- End-to-end browser test against the real API: link created in the app, wrong and right date of birth, passkey registered through a virtual authenticator, auto-open on the next visit, passkey sign-in after sign-out. CI builds the API and runs it.
Not possible on the claude.ai artifact: its database is readable only by signed-in people the owner shared it with.

## Phase 6: Less typing
Done in this commit:
- Apple Health through an iPhone Shortcut: per-person ingest tokens (owner, or a contributor for themselves; never for a child), `POST /ingest/:token` normalising weight (kg or lb), steps, sleep, cycling minutes and active energy into the day document and a `src: health` weigh-in that never overwrites a manual one, `GET /ingest/:token/latest` for the reverse Shortcut. Recipe on the Account card and in `docs/SHORTCUTS.md`.
- Web push: VAPID keys generated once and kept in the database (or configured), subscriptions per device with per-kind preferences, a test send, and a minute scheduler that decides reminders by the household's local time (fast complete, protein starter, Friday weigh-in, family circle, Quran reading), each sent once and only when the thing is not already recorded; dead subscriptions are removed. Service worker shows and routes the notification.
- Tests: normalisation, habit application, reminder decisions across local times, token lifecycle, subscribe and unsubscribe, scheduler idempotence.
Not possible: reading Health Connect on Android from a web app.

## Phase 7: Cook from what is at home
Done in this commit:
- Plate scan and kitchen scan. `core.scanPrompt` carries the plan's ideology and the food catalog; `core.normalizeScan` turns the model's JSON into meal items (catalog ids where matched, inline custom foods where not), calories, category shares and a one-word shape (ok, carb-heavy, low-protein, low-veg). Meal items may now carry a custom food (`x`), and portions, cook quantities and the editor understand them.
- API: `POST /households/:hid/scan` (owner and contributor) through the Anthropic SDK with structured JSON, image size and rate limits, typed upstream errors; `/scan/status`; the scanner is injectable for tests. Artifact: the same prompt through the viewer's own Claude (`sample` with images), no key needed.
- UI on the Plate tab: capture, shrink to 1280 px, result with +/− per item, verdict and suggestions, set as tonight's plate or save to meals; kitchen mode lists ingredients and proposes plates with a short shopping list.
- Tests: core prompt and normalisation (4), API route with an injected scanner, browser flow from result to saved tonight's plate.

## Phase 8: Tarbiyah
Done in this commit:
- A Tarbiyah tab between Plate and Family, built from the sixteen audited lecture analyses in `docs/tarbiyah`. The build script parses the seventeen-section format into a bundled index (thesis, outline with timestamps, top ten, principles, daily practices, questions, activity titles, corrections) and per-lecture files fetched when a lecture is opened (every section, with a small markdown renderer in the app); the full analyses and the series corrections sheet ship alongside.
- Weekly lecture by start date, a daily card drawn from it, per-parent watched/read/done marks and shared notes in one `tarbiyah/progress` document that both parents may write; the day's tarbiyah mark counts toward the Family dimension on Today.
- Narrations carry their gradings; the series corrections sheet is surfaced as "before you repeat anything".
- Tests: content index coverage, API policy for both parents, browser flow through every section of a lecture and the markdown renderer.

## Phase 9: Any family
Done in this commit:
- Households are general: the roster comes from the family documents, with the owner member recorded in settings (and reported by the API); members are added and removed on the Family tab; weigh-in keys, policy, ingest, reminders and member links all use the household's own owner member instead of a fixed id. New households start with the owner on the Family tab and a plan that asks for its two numbers.
- Registration by invitation: household invites from the admin page open a new family; join invites add a person to an existing one; the first account on a server needs none. `MAX_HOUSEHOLDS_PER_USER` is 1.
- Content personalisation in core (`personalize`): the original family's names and ages become each household's, with the activity sets matched to the closest child by age; applied to the Learn set, the companions, the Quran card, the glossary, shares and the whole Tarbiyah tab, including the fetched analyses.
- Scan quota per household per month, counted and shown; admin page for invites, households and quotas.
- Tests: core roster and personalisation; API invitation flows, owner-aware policy on another family, quota; browser flow through another family's roster, content, members and plan setup.

## Phase 10: Every family's own goal
Done in this commit:
- `core/goals`: six goals (fatloss, fasting, ramadan, thuluth, learning, tarbiyah), each with its tabs, habits, fast and weights flags, lead card and reminder kinds; `goalConfig` takes the union of a household's goals, led by the first; `habitsDone` counts only the configured habits. No goals recorded means the original plan with everything on.
- Sign-up asks the family leader for the goals when the invite is a household invite (`GET /invites/kind/:code` tells the page which kind it is); registration stores them in `settings.goals`; the admin page lists each household's goals.
- The app shapes itself: tabs from the config, habit rows and the check-in ring per goal, the fast and Ramadan cards only for fasting goals, the session card only with Train, the dinner and tonight cards only with Plate, a Tarbiyah card on Today for tarbiyah families, card order by the lead goal; Progress without weights is a streak-and-habits summary; Settings carries the goal checkboxes and hides the fields a goal does not use; push preferences list only the reminders the goals send; the scheduler filters reminders by goal. A household without goals is asked once on Today, with "Keep everything" as the way out.
- Tests: core goal config; API registration with goals, invite kind, reminders filtered by goal; browser flow through a learning-only household and a switch to fasting.

## Operating rules
- Children are never restricted: enforced in `core`, validated at the API, tested in CI.
- No change to a domain rule without a test.
- The artifact and the local app are built from the same sources; a fix lands in both.
