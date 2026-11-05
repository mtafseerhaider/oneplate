# OnePlate

A practical, evidence-based fat-loss plan for going from **84 kg to 70 kg** without counting calories, weighing food or tracking macros. One hand-built plate a day, a 20-hour fast you can live with, and low-impact training that respects a healed tibia/fibula fracture with a titanium nail.

**📄 The full plan: [OnePlate.md](OnePlate.md)**

## What's inside

| # | Section | What it answers |
|---|---|---|
| 1 | Executive Summary | The verdict on 21–22 h OMAD and the recommended 20:4 "Two-Course Day" |
| 2 | Weight-Loss Calculations | Maintenance, deficit, weekly/monthly rate, timeline to 70 kg, muscle and bone risk |
| 3 | Recommended Fasting Method | OMAD vs 20:4 vs 18:6, scored on fat loss, muscle, recovery, adherence, productivity |
| 4 | Pakistani OMAD Meal Plan | 16 dinners (karahi, tikka, seekh kebab, fish, keema, daal…) with calories and hand portions |
| 5 | Evidence-Based Fasting Guide | Every drink and debated item: calories, insulin, appetite, autophagy, does it break the fast |
| 6 | Traffic-Light Fasting Table | Green / Yellow / Red |
| 7 | Final Fasting Verdict | Recommended / Sometimes / Avoid, plus a practical summary |
| 8 | Weekly Exercise Plan | Walking, stationary cycling and strength, phased for the nailed leg |
| 9 | Weekly Schedule | Monday to Sunday: work, fasting, training, meals, sleep |
| 10 | Cheat Meal Strategy | Saturday 7 PM; biryani, pizza, burger, BBQ, nihari portion rules |
| 11 | Eating Out Guide | Ranked foods and ordering strategies for restaurants, office, family, weddings |
| 12 | Daily Routine | Hour by hour, 6:45 AM to 10:45 PM |
| 13 | Supplement Recommendations | Whey, creatine, vitamin D3, magnesium, omega-3, electrolytes |
| 14 | Progress Tracking System | Weigh-in and waist protocols, plateau guide, tracker template, 4/8/12-week expectations |
| 15 | Risks and Safety | Muscle, recovery, bone, sustainability; warning signs and adjustments; when to see a doctor |
| 16 | 12-Week Action Plan | Week-by-week rollout and the maintenance phase |
| 17 | The Only 5 Rules I Need | The whole plan in five lines |

## The Only 5 Rules

1. **One plate, built by hand, once a day:** 2 palms protein · 2 fists veg · 1 cupped hand rice or 1 roti · 1 thumb fat · 1 bowl yogurt.
2. **During the fast, drink only what has nothing in it:** water, black coffee, plain tea.
3. **Four palms of protein every day:** one at 5:45 PM before leaving the office, three at dinner.
4. **Move every day, lift three times a week:** 8,000 steps with a 10-minute walk after dinner, cycling Tue/Thu, strength Mon/Wed/Sat.
5. **One cheat meal, Saturday 7 PM, and the kitchen closes at 9:30 PM every night.**

## Disclaimer

Educational content, not individual medical advice. Review with your physician, especially regarding the healed fracture, before starting the exercise plan.

## The app

A phone-first companion app lives in [`app/index.html`](app/index.html): a live fast timer, daily check-ins (water, protein palms, starter, session, post-dinner walk, kitchen closed), the plate builder with all 16 dinners, the phased training plan, a weigh-in log with a chart against the 0.5 kg/week line, and the fasting traffic-light guide.

It is published as a private Claude Artifact, which works on iOS, Android and desktop browsers from one link (the page switches to a sidebar layout on wide screens) with no app store or hosting setup. Weigh-ins and check-ins sync across devices through the Claude account that owns the artifact. The same file can also be served by GitHub Pages if you ever want a public URL; in that mode data stays on each device.

## Any family

OnePlate is one server for several families. Each household has its own data, members, settings and progress; nothing is shared between households except the content and the review statuses. Registration is by invitation only:

- **A new family** gets a household invite from the admin page (`/admin.html`, for the accounts in `ADMIN_EMAILS`): one link, one use, two weeks. The person who opens it creates the first account and becomes owner of a new household, with themselves on the Family tab. The very first account on a fresh server needs no invite.
- **Members of a family** get an invite from their owner on the Account card, which signs them into that household as contributor or viewer, or a family link that opens by date of birth.

The owner adds the family on the Family tab, each person with a relation and a date of birth; sons and daughters are children and never restricted. The plan asks for a start and a target weight before it runs. All content, the daily Learn set, the long-form companions and the whole Tarbiyah course, was written for one family and is personalised for every other: the owner, the spouse and the children appear by their own names and ages wherever the original names stood, and activities written for a seven-year-old and a four-year-old go to whichever child is closest in age. Ibn 'Abbas keeps his name.

Plate and kitchen scans run on the server's Anthropic key with a monthly quota per household (`SCAN_QUOTA_DEFAULT`, 60; changeable per household on the admin page); the Account card shows what is left.

## Open it from a link, with Face ID

The self-hosted OnePlate gives every adult a private **family link**. Opening the link asks for that person's date of birth, which must match the Family tab, signs the device in, and offers Face ID, Touch ID or fingerprint (a passkey). After that the link, or the installed app, opens by itself. Make the links from Progress → Account; revoke one there if it leaks. Children do not get links; their parents log for them.

Install it like an app: on Android, Chrome's menu → Install app (or the Install button on the Account card); on iPhone and iPad, Safari's Share → Add to Home Screen; on macOS, Safari's File → Add to Dock, or the install icon in Chrome and Edge. The installed app opens full screen and stays signed in.

The claude.ai artifact cannot do this: its database is only readable by people signed in to claude.ai whom the owner has shared it with, so a link that opens on a date of birth alone has to come from your own hosted copy.

## Tarbiyah

A dedicated tab for raising the children, built from `docs/tarbiyah`: sixteen analysis documents of Shaykh Usama Abdulghani's series *Raising Our Children as God Intended* (Light of Guidance), each audited against al-Kafi with al-Majlisi's and Behbudi's gradings, al-Mizan, Majma' al-Bayan, Nahj al-Balagha and the Sunni corpus. One lecture a week from the start date in Settings. The weekly card gives the thesis, the video, and watched, read and done marks for each parent. The daily card draws from that week's lecture a practice, a line worth carrying with a link into the video at its timestamp, a question for the couple, one for the table, and an activity each for Abbas and Eliyya. Opening a lecture gives the summary, the outline linked to the video by topic, the top ten, the verses with al-Mizan's reading, every narration with its grading, the action guide, the questions, the activities, the memorisation sheet, the golden lines, the corrections, a shared journal, and the full analysis. A "before you repeat anything" card carries the series corrections sheet: the stories and sayings found fabricated, misattributed or unlocated, never to be passed to the children as hadith.

`scripts/build-tarbiyah.mjs` generates the bundled index (`packages/content/src/tarbiyah.ts`) and the per-lecture files the app fetches on demand (`apps/web/public/tarbiyah/`, not committed); CI checks the index is current. Drop new analyses into `docs/tarbiyah/lectures` in the same seventeen-section format and rerun it.

## Scan a plate, or the kitchen

On the Plate tab, **Scan the plate** photographs tonight's plate and reads it: each food, its hand portion, calories and protein, matched to OnePlate's own food list where it can and estimated where it cannot, then judged against the plan (protein first, vegetables, one carb, measured fat) with two or three concrete changes. Adjust any amount with + and −, then set it as tonight's plate or save it to your meals; family portions and cook quantities follow from it. **Scan the kitchen** photographs the fridge or the shelf instead and proposes up to three plates from what is already at home, naming at most two cheap things to buy. Photos are shrunk on the phone and never stored.

The self-hosted app does this through the Claude API: set `ANTHROPIC_API_KEY` on the server (a scan costs a few cents on the default model, `SCAN_MODEL`). The claude.ai artifact sends the photo to Claude on the viewer's own account, after they allow it once. The prompt and the normaliser are shared in `packages/core/src/scan.ts`.

## Notifications and Apple Health

Installed to the Home Screen, the self-hosted app sends reminders as notifications: fast complete, protein starter at 7 pm, weigh-in on Friday morning, family circle at 8:30 pm and the Quran reading at 9:30 pm, each once and only when the thing is not already recorded. Turn them on per device from Progress → Account. iPhone needs iOS 16.4 or later and the app opened from the Home Screen icon.

Apple Health cannot be read by a web app, so OnePlate takes the free route: an iPhone Shortcut reads Health and posts weight, steps, sleep, cycling minutes and active energy to a private per-person address every night. Weight becomes a weigh-in (never overwriting one typed by hand), steps, sleep and cycling fill the day's check-ins, and the raw numbers show on Today. The Account card gives the address and the eight-step recipe for the Shortcut; `docs/SHORTCUTS.md` has the same with notes. The reverse Shortcut writes OnePlate's weigh-ins into Health. Android has no equivalent for a web app.

## Deploy it for free in ten minutes

One service runs the API and the web app together (`Dockerfile` at the root, `WEB_DIST` set), and only needs a PostgreSQL URL.

1. Create a free PostgreSQL database at [Neon](https://neon.tech) (persistent free tier) and copy its connection string.
2. On [Render](https://render.com): New → Blueprint → this repository; it reads `render.yaml`. Paste the connection string as `DATABASE_URL` and your email as `ADMIN_EMAILS`. The free plan sleeps after idle minutes and takes a few seconds to wake.
3. Open `https://<your-service>.onrender.com/account.html`, create the first account, add the family on the Family tab, then make the family links from Progress → Account and send each adult theirs.

Any host that runs a Docker image works the same way: set `DATABASE_URL`, `SESSION_SECRET`, `PUBLIC_URL` (your https address, which passkeys are bound to) and `ADMIN_EMAILS`.

## Run it yourself

OnePlate is also a locally deployable product. The architecture is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the phased plan in [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md).

```
apps/web         PWA (installable on iOS, Android, desktop), served by Caddy
apps/api         Fastify + PostgreSQL API: auth, households, invites, versioned documents, audit, OpenAPI at /docs
packages/core    Pure domain logic with tests (meals, portions, family stages, Hijri, prayer times, plan, Quran course)
packages/content Curated content with provenance
infra            Docker Compose, Caddy, backup script
app/index.html   Generated: the single-file build the claude.ai artifact serves (source in apps/web/src)
```

Quick start with Docker:

```bash
cp infra/.env.example infra/.env   # set SESSION_SECRET and POSTGRES_PASSWORD
docker compose -f infra/docker-compose.yml up --build
```

Then open https://localhost, create the first account (that is the household owner), and use the Account card on the Progress tab to create an invite code for Uzma, who registers with it as a Contributor. Sign in with a passkey (Face ID or fingerprint) once one is added from the Account card. The top-bar toggle switches the interface to Urdu, right to left, per device. Changes appear on every signed-in device within a second over Server-Sent Events; password reset links are printed in the API log until an SMTP transport is configured.

Development without Docker (needs Node 22, pnpm 10 and a local PostgreSQL):

```bash
pnpm install
pnpm -r --filter @oneplate/content --filter @oneplate/core build
DATABASE_URL=postgres://oneplate:oneplate@localhost:5432/oneplate pnpm dev:api
pnpm dev:web        # http://localhost:5173, proxies the API
pnpm test           # core, content and API tests (API tests need TEST_DATABASE_URL)
```

## Family

The Family tab covers Tafseer, Uzma, Abbas and Eliyya. Everyone eats the same OnePlate dinner; the app works out each person's portion and the total to cook. Adults get an optional goal, weigh-ins and, for Uzma, pregnancy or breastfeeding adjustments. Children are never restricted: no calories, no fasting under 7, practice fasts only by the parents' choice, growth logs shown as a trend only, and seconds whenever they are hungry. Profiles, dates of birth and logs sync through the same database.

## Daily learning, from The Bayan Library

The Learn tab turns OnePlate into a whole-self companion. Every day it serves a verse, a word, a teaching of the Prophet or the Ahl al-Bayt, a Quranic story with a moral, a surah summary, an idea, a book, a dua, a poem and a question, each written in two layers after [the-bayan-library](https://github.com/mtafseerhaider/the-bayan-library)'s notes system: one for an eight-year-old, one for an adult. Switch between Tafseer, Uzma, Abbas and Eliyya at the top. A five-minute family circle script, a reflection journal in the Bayan template, and 1/7/30-day spaced review complete it. The Today tab adds a whole-self check-in across five dimensions: Body, Mind, Heart, Soul and Family.

A daily Quran reading runs alongside: the whole Quran in 365 readings, one a day in the Quran's own order and never crossing a surah. One hundred and twelve passages are close readings with a summary, notes summarising the main lines of Allamah Tabataba'i's discussion in al-Mizan, a reflection question and a line for the children; every other reading carries its surah's summary and al-Mizan's statement of the surah's purpose, with the English al-Mizan volume (and your own page notes) for each. Progress is recorded per reading, with bulk update, and a surah-by-surah index.

Every note in Learn carries a review badge. Notes start as drafts, written for this app and not yet checked by a named person; a reviewer can mark them reviewed (checked against the source), verified (checked against the printed edition, with volume and page) or disputed. The gates follow the Bayan Library's review process. In the local build, reviewers are the accounts named in `ADMIN_EMAILS` and reviews are shared by every household; in the artifact, the owner records them.

Verses are paraphrased meanings with references, not translations of record. Teachings carry the work they are found in and a verification label following the Bayan dua program: "graded" where a named grading exists, "received" where the attribution is as found in that work and not yet checked against the printed edition. The app cites; it never rules.

## Borrowed from Qānūn al-Thuluth

Parts of the app are adapted from the [qanun-al-thuluth](https://github.com/mtafseerhaider/qanun-al-thuluth) family-nutrition project, which encodes the Prophetic rule of thirds:

- **Hijri date and Sunnah fast days** (Monday/Thursday, Ayyam al-Bid, Arafah, Ashura) on the Today tab, with a moon-sighting offset. Ported from its `prayer/hijri.ts` and `prayer/voluntary-fasts.ts`.
- **Ramadan mode** with Fajr and Maghrib for eleven Pakistani cities (University of Islamic Sciences Karachi method), a Fajr-to-Maghrib fast ring, suhoor and iftar guidance, hydration windows and weekly themes. Ported from its `prayer/astronomy.ts`, `prayer/times.ts` and `prayer/cities.ts`, and the Ramadan module in `docs/15`.
- **The 20-minute mindful dinner timer** with the fullness check at 15 minutes, from its `constants/thuluth.ts` and the rule-of-thirds recommendations.
- **Urdu names on every food** in the meal editor and meal list, following its ingredient catalog.
- **Sunnah of eating guidance** in the Guide with the hadith references its content team collected. The app cites; it never rules.
