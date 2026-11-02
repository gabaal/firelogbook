# FireLogbook

The fire safety logbook for small sites: a fixed checklist, phone-first recording
with photo evidence, an overdue engine, a weekly digest email, and a dated audit
pack — with accounts, firm-level tenancy, a 14-day trial and per-site billing.

Data lives in Neon Postgres (via the `DATABASE_URL` environment variable), photos
in Vercel Blob (with a Neon fallback), and PDF export rendered in-process with
`@react-pdf/renderer`. Stripe and Resend are optional and switch on when their env
vars are present.

## Run it

```bash
pnpm install      # npm install works too
pnpm dev          # http://localhost:3100
```

`package.json` pins port 3100. `.npmrc` keeps the package store inside the project
and uses a hoisted `node_modules`, so nothing is written outside this folder.

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to a Neon connection
string before running anything.

Check photos are stored in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set (the
Vercel Blob integration adds it automatically). Private stores are supported and
served through `/api/blob/[...path]`; public stores use their direct URLs. Without
a Blob store, production stores photos in the Neon `check_photos` table and serves
them from `/api/photos/[id]`; local development uses `/tmp/uploads` and
`/api/uploads/[name]`. Connect a Blob store before the table gets large.

The free-logbook and email paths create any missing tables lazily with
`CREATE TABLE IF NOT EXISTS`, so a fresh database works without a separate
migration step. They do not seed demo data: `src/lib/seed.ts` still holds the old
SQLite seeding code and is not run automatically.

| Route | What it shows |
| --- | --- |
| `/` | Landing page with the £29/site/month offer |
| `/free-logbook` | Public lead magnet: build a printable blank log book |
| `/free-logbook/[id]` | The generated six-page A4 log book |
| `/signin` | Passwordless sign-in and the demo button |
| `/onboarding` | Three fields → site created → first audit pack |
| `/sites` | Portfolio dashboard: overdue, due, open actions |
| `/sites/[id]` | One logbook: due now, actions, recent activity |
| `/sites/[id]/check/[key]` | The recording screen (pass / fail / N/A, photo, name) |
| `/sites/[id]/log` | Full history, filterable by check |
| `/sites/[id]/audit` | The audit pack, date range, share link |
| `/billing` | Trial state, per-site pricing, checkout, cancellation |
| `/reminders` | Schedule, escalation ladder, what would send now, send log |
| `/reminders/[id]` | The exact email that went out |
| `/unsubscribe` | One-click opt-out from an email, no sign-in |
| `/api/audit/[id]/pdf` | Rendered A4 PDF (auth cookie or share token) |

## The free log book (top of funnel)

`/free-logbook` answers the first question every prospect asks: *why pay when there
is a free template?* It builds a real one — six A4 pages, the thirteen checks with
what good looks like, 31 days of daily rows, half a year of weekly rows,
monthly/quarterly/annual grids, and a service record — with the premises' details
already printed on the cover.

No account, no card. The email field is optional; when it is filled in the lead goes
into `leads`, and the link is emailed if a mail provider is configured.

The point is not charity:

- it targets the same keyword the retailers rank for, with a better artefact than a
  generic PDF;
- it captures an email at the exact moment somebody is setting up a logbook;
- it can say, honestly, that paper cannot tell you a check is three weeks late.

Throttled in memory at five log books per IP per hour. That is fine for a lead
magnet and not fine for anything that matters.

## Gate A: charging and onboarding

**Accounts without passwords.** A signed magic link (HMAC-signed session cookie,
30 days, revocable rows in `sessions`) creates the user, firm and owner membership
on first verify. Sessions are DB-backed so they can be killed server-side.

**Email is swappable.** With `RESEND_API_KEY` set, links and reminders go through
Resend. Without it the app runs in *outbox mode*: messages land in the `outbox`
table and the sign-in screen shows the link so the flow is walkable locally.
Outbox mode must never run on a public deployment — it is the one place the app
hands out a login link.

**Tenancy.** Every site lookup is `WHERE id = ? AND firm_id = ?`. The write APIs
(`/api/checks`, `/api/actions/[id]/close`, `/api/digest`, `/api/onboarding`) all
resolve the firm from the session rather than trusting the request. The e2e script
asserts that a second firm gets 404 on another firm's site and PDF.

**Billing.** £29/site/month or £290/site/year, quantity = number of sites.
14-day trial with full access, then the app redirects to `/billing` until a
subscription is live. With `STRIPE_SECRET_KEY` and `STRIPE_PRICE_MONTHLY` set,
`/api/billing/checkout` creates a real Checkout session and `/api/stripe/webhook`
(hand-verified HMAC signature, no SDK) keeps `firms.subscription_status` in sync.
Without keys, checkout runs against a local simulator that flips the same columns,
so the whole gate is testable offline.

**Share links.** The audit page and PDF accept `?k=` — an HMAC token scoped to one
site with an expiry. Owners get a 7-day "Share link" button for insurers and
inspectors; the PDF renderer gets a 10-minute one because it fetches the page
without cookies.

## Gate B: the engine that chases

**Escalation, not one email.** Four levels, computed from the worst overdue item on
a site: due this week → one week → three weeks → thirty days. Levels 1–2 go to the
site's responsible person; levels 3–4 go to the account owner, because by then the
person on site has already been asked twice.

**Idempotent by construction.** `notifications` has `UNIQUE(site_id, level, week_key)`,
and the row is inserted before the send. A second pass in the same week is a no-op;
a failed send deletes its row so the next pass retries rather than waiting a week.

**Trigger.** `POST /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET`
(run it daily; it only sends on the firm's chosen day and hour). The owner session
can also call it — that is what the "Send now" button does, with `?force=1`.
`?dry=1` returns the plan without writing anything.

**Opt-out that works on a phone.** Signed, non-expiring token per site, no login
required. Opted-out sites drop out of the plan entirely.

**Every message is kept.** The body is stored verbatim in `notifications` and can be
read at `/reminders/[id]`, which is what you show a customer who asks "what did you
actually send me?".

Locally this runs in outbox mode; set `RESEND_API_KEY` and the same code sends for
real. A daily cron on the host is enough:

```bash
CRON_SECRET=... curl -fsS -X POST https://your-domain/api/cron/reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Verifying it

```bash
node scripts/e2e.mjs        # 36 assertions against a running server
```

Covers: public vs protected routes, magic-link → session → onboarding, first audit
pack, trial state, simulated checkout, recording a check, PDF export, cross-firm
isolation, share links (valid and forged), demo login, the reminder engine
(dry run, send accounting, idempotency, escalation level), unsubscribe, the free
blank-log-book funnel, and sign-out.

The reminder pass only sends once per site per week, so one assertion degrades to
"accounted for" if you re-run the suite within the same week. Delete `data/` and
restart to see a real send.

`scripts/probe.mjs <url> <w> <h> [out.png] [cookie]` opens a page through the
DevTools protocol, reports any element that overflows the viewport and optionally
saves a screenshot. `scripts/mkcookie.mjs demo|new <email>` prints a session cookie
for that.

Reset the demo data at any time:

```bash
# stop the server first
rm -rf data && pnpm dev
```

## What the logbook does

**Recording.** Thirteen checks across daily, weekly, monthly, quarterly and
annual frequencies, each with plain-English guidance and the standard behind it
(RR(FS)O 2005, BS 5839-1, BS 5266-1, BS 5306-8). Pass, fail or not applicable;
a photo compressed on the phone to ~1600px JPEG; a note; a name.

**Offline.** If the network drops, the record is queued in IndexedDB with its
photo and replayed on the next visit with a connection. Plant rooms have no signal.

**Failures become actions.** A failed check can raise a remedial action with a due
date. Actions stay open until someone closes them with a note, and both the raise
and the close appear in the audit pack.

**Due engine.** Each check has its own interval. "Due now" at 85% of the interval,
overdue after it. Site health is red for anything overdue or never recorded.

**Weekly digest.** Plain-text email per site listing what is overdue, what is due
and which actions are open. `/digest` previews it; the Queue button writes to
`email_log`. Wire it to Resend or Postmark from `/api/digest`.

**Audit pack.** Dated A4 document: period, responsible person, a summary table of
expected vs recorded vs missed per check, daily checks by month, the full record of
scheduled checks, failures and remedial actions, photo evidence, and a signature
block. Downloadable as PDF.

## Where the seams are now

- **PDF off the request path.** The audit pack now renders in-process with
  React-PDF. For very large packs, queue the render and store the artefact so the
  request stays fast.
- **Multi-user.** One membership per user today. Add invitations and roles; the
  check form still asks for a name rather than using the session, which weakens
  attribution once more than one person records checks.
- **Cancellation semantics.** Cancelled accounts currently hit the paywall.
- **Editing a site.** The responsible person's email is set at onboarding and shown
  on the site page, but not editable yet — which will bite the first time a reminder
  bounces.
- **Migrations.** Tables are created lazily with `CREATE TABLE IF NOT EXISTS`; add a
  versioned migration runner before the schema starts changing in place.

## Design decisions worth keeping

- **No template builder.** The checklist is fixed on purpose. A flexible
  builder turns this into a platform and a losing competition.
- **Records are not editable.** Corrections are new records. An inspector
  trusts a logbook that shows its history, not one that is tidy.
- **No compliance claims.** The footer and the audit pack both say this records
  what was checked; it is not a risk assessment and does not make anyone compliant.
- **The PDF is the product.** Everything else exists so the PDF is produced.
- **An empty logbook is not a failure.** A new site's first pack explains that the
  logbook has just opened rather than reporting 366 missed daily checks.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Neon Postgres +
Drizzle · Vercel Blob · @react-pdf/renderer · IndexedDB · Stripe via the REST API ·
Resend (optional) · no UI library, no CSS framework.
