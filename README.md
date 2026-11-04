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

A daily Quran reading runs alongside: a 67-reading course of surahs and verse clusters, each with a summary, notes summarising the main lines of Allamah Tabataba'i's discussion in al-Mizan, a reflection question and a line for the children, with a link to the verses on Quran.com and a done counter. Each reading names the English al-Mizan volume (40 volumes: 1 to 13 WOFIS in Rizvi's translation, 14 to 40 Tawheed Institute Australia) and the approximate Arabic volume, with a link to the WOFIS volumes online and a field to record the page from your own copy. Volume ranges come from publisher and bookseller listings; four are marked as inferred from their neighbours. The al-Mizan notes are summaries written for the app, not quotations, and should be checked against the printed tafsir before being cited.

Verses are paraphrased meanings with references, not translations of record. Teachings carry the work they are found in and a verification label following the Bayan dua program: "graded" where a named grading exists, "received" where the attribution is as found in that work and not yet checked against the printed edition. The app cites; it never rules.

## Borrowed from Qānūn al-Thuluth

Parts of the app are adapted from the [qanun-al-thuluth](https://github.com/mtafseerhaider/qanun-al-thuluth) family-nutrition project, which encodes the Prophetic rule of thirds:

- **Hijri date and Sunnah fast days** (Monday/Thursday, Ayyam al-Bid, Arafah, Ashura) on the Today tab, with a moon-sighting offset. Ported from its `prayer/hijri.ts` and `prayer/voluntary-fasts.ts`.
- **Ramadan mode** with Fajr and Maghrib for eleven Pakistani cities (University of Islamic Sciences Karachi method), a Fajr-to-Maghrib fast ring, suhoor and iftar guidance, hydration windows and weekly themes. Ported from its `prayer/astronomy.ts`, `prayer/times.ts` and `prayer/cities.ts`, and the Ramadan module in `docs/15`.
- **The 20-minute mindful dinner timer** with the fullness check at 15 minutes, from its `constants/thuluth.ts` and the rule-of-thirds recommendations.
- **Urdu names on every food** in the meal editor and meal list, following its ingredient catalog.
- **Sunnah of eating guidance** in the Guide with the hadith references its content team collected. The app cites; it never rules.
