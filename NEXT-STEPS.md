# Next steps — website + tracker

Notes to come back to, as of 25 October 2026. Covers this website (KNB-GRANT-WEBSITE) and the KNB Attendance Tracker (`~/Documents/GitHub/KNB-ATTENDANCE-TRACKER`). The technical details of what was built are in the tracker's `HANDOFF.md` (work log) and this repo's `CLAUDE_HANDOFF.md`.

## 1. To switch on what's already built

- [ ] **Push both repos** (the website's rebuilt `docs/` folder included), let Vercel deploy the tracker.
- [ ] **Run migration `061_inquiry_auto_reply.sql`** in Supabase (058, 059 and 060 are already done).
- [ ] **Google safety check** for lead websites — until this is set, every site shows "Caution":
  1. console.cloud.google.com → create a project (your own account, not Parasym).
  2. APIs & Services → Library → **Web Risk API** → Enable (may ask for a billing account; free up to 100,000 lookups a month).
  3. Credentials → Create credentials → **API key** → Edit → API restrictions → Web Risk API only.
  4. Vercel → tracker → Settings → Environment Variables → `GOOGLE_WEB_RISK_API_KEY` (Production) → redeploy.
- [ ] **Auto-reply emails** to people who fill in a form — off until a sender is added in Vercel, then redeploy:
  - Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER` = the Gmail address, `SMTP_PASS` = a Google **App Password** (needs 2-step verification), `AUTO_REPLY_FROM=Grant Dev14 <grant.dev14@gmail.com>`.
  - Or, with a custom domain: Resend's SMTP (`smtp.resend.com`, port 465, user `resend`, password = Resend API key).
  - Optional: `AUTO_REPLY_TO`, `AUTO_REPLY_SITE_URL`. `LEADS_AUTO_REPLY=off` pauses it.
- [ ] **Cloudflare Turnstile** (anti-bot check on the forms) — set both keys together:
  1. dash.cloudflare.com → Turnstile → Add site → `angelomig.github.io` (add the custom domain too, later).
  2. **Site key** → this repo's `.env` as `PUBLIC_TURNSTILE_SITE_KEY`, then `npm run build:github` and push.
  3. **Secret key** → tracker in Vercel as `TURNSTILE_SECRET_KEY` → redeploy.
- [ ] **Switch the form inbox back**: `src/data/forms.ts` still sends to the test address `angelobmig@gmail.com` → set `FORM_INBOX` to `grant.dev14@gmail.com`.
- [ ] **Clean up test leads** in Inquiries (the "TEST" audit, the "test" estimate, the Direct lead with no name) → Archive.
- [ ] Optional: `LEADS_DISCORD_WEBHOOK_URL` + `LEADS_DISCORD_ALERTS=on` to bring back Discord alerts (archived for now; they never include client details).

## 2. Decided / on hold

- **Discord alerts for leads** — archived (off). Code kept; see above to turn back on.
- **Sending replies from inside the tracker** (not just opening your email app) and **reading client replies in the tracker** — skipped for now, to re-evaluate.
- **Custom domain** (e.g. grant-dev14.com / grantdev14.com, about $10–12 a year) — recommended: looks more professional, removes the shared-origin risk of `angelomig.github.io` for the quote builder's tracker sign-in, and allows a domain email for auto-replies. When added: Settings → Pages → Custom domain, the DNS records (4 × `A` to 185.199.108–111.153, `CNAME www` → `angelomig.github.io`), `docs/CNAME`, Astro `site`/`base`, and `LEADS_ALLOWED_ORIGINS` in the tracker.

## 3. Ideas for the website

1. **Accept a quote online** — the client clicks "Accept" on a quote link; the tracker lead turns Won by itself.
2. **Pay online** — a Stripe or PayPal link on each invoice that marks it Paid in the tracker.
3. **Instant speed check** — a free "test your site" tool (Google PageSpeed) that gives a score on the spot and creates a lead.
4. **Book the call** — a calendar embed (e.g. Cal.com) after every form, with the booking on the lead.
5. **Client page** — a private link where a client sees their quote, invoices and project status.
6. **Case studies with numbers** — before/after speed and conversion results on the work pages.
7. **Support plans page** — the packages with prices and a "Start a plan" button feeding the quote builder.
8. **A short blog** — Shopify/Webflow tips for search traffic, each post ending in the free audit.
9. **WhatsApp / Messenger button** — for visitors who'd rather chat than fill in a form.
10. **Privacy-friendly analytics** (e.g. Plausible) — see which pages lead to inquiries.

Suggested first: 1 and 2 (they let the tracker update itself from accepted quotes and payments).

## 4. Tracker housekeeping

- **Split up `app/page.tsx`** (about 13,000 lines; Reports and Leave pages into their own files) — postponed earlier.
- **Leave and Audit Log pages** scroll sideways at about 1024 px wide.
- The tracker folder is in iCloud-synced Documents: after any `npm install` / `npm ci`, run `scripts/icloud-safe-folders.sh`. Moving the repo out of iCloud would remove the problem for good.
- Testimonials: written quotes need the client's approval — never invent them.

## 5. Done (for reference)

- Inquiries inbox in the tracker: list and pipeline, filters, bulk actions, CSV export, starred/archive/spam, follow-up reminders, waiting clock, notes, status history, lost reasons, turn a won lead into a task, insights (leads per week, first reply, win rate, money).
- Lead drawer: pipeline header, tabs (Overview / Documents / Activity), reply templates, email templates for every document and stage.
- Documents and money per lead: quotes, invoices (part payments), receipts, contracts, expenses, support plans; quoted / invoiced / received / outstanding / overdue / costs / profit; approved change orders in Quoted.
- Website forms → tracker (audit, enquiry, estimator with its PDF); the estimator asks for name and email first.
- Quote builder → tracker sync (sign in once on the Tracker panel): quotes with full details (scope, recommended add-ons, schedule), support plans with hours used, invoices, receipts, change orders, audits, kick-off, handover and usage-report PDFs; quotes from an estimate attach to that estimate's lead; deleted items marked "Removed".
- Website safety check on every lead (Google Web Risk + red flags), Safe / Caution / Danger badges and a gate before opening a site.
- Security review fixes (incl. the profile role guard), rate limits, honeypot, Turnstile support, auto-reply support.
