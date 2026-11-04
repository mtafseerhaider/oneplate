# Release checklist

Run through this before exposing OnePlate beyond a laptop. Each line names where it is checked.

## Before deploying
- [ ] `pnpm typecheck && pnpm test` green; `node scripts/build-app.mjs --check` passes (CI does both).
- [ ] `infra/.env` set: strong `SESSION_SECRET` (32+ random chars), `POSTGRES_PASSWORD`, `PUBLIC_HOST`, `PUBLIC_ORIGIN`, `MAIL_TRANSPORT=smtp` with `SMTP_URL` and `MAIL_FROM`, `ADMIN_EMAILS` (also the content reviewers), optionally `ERROR_WEBHOOK_URL`. Single-service hosts (Render): `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAILS`; `PUBLIC_URL` once a custom domain is attached, since passkeys are bound to it.
- [ ] DNS points `PUBLIC_HOST` at the server; ports 80 and 443 open; Caddy obtains a certificate on first start.
- [ ] Backups: `infra/backup.sh` in cron nightly; `infra/drill.sh` run once against the real data and passing.
- [ ] Load: `node scripts/loadtest.mjs https://your-host 20 10` shows p95 under 300 ms with zero failures.

## After deploying
- [ ] `https://host/status` shows ok, db connected, live updates on.
- [ ] Register the owner, create the household, add a passkey, invite Uzma, sign in on both phones, see a change arrive live.
- [ ] Export once from the Account card and keep the file.
- [ ] Privacy and terms pages reachable from the sign-in page; edit the operator contact if it is not the owner.

## Every month
- [ ] Check `/admin/stats` growth and database size against disk.
- [ ] Run `infra/drill.sh` on the latest backup.
- [ ] `pnpm audit --audit-level=high`, update, rerun tests, redeploy.

## Incident basics
- API down: `docker compose logs api --tail 200`; `/ready` says whether the database answers.
- Lost password: the owner resets by email; an admin can also delete the user's sessions in the database.
- Bad deploy: `docker compose up --build` the previous commit; data is in the volume, not the image.
