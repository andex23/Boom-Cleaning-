# BOOM Cleaning handoff

Prepared 8 October 2026 (Africa/Lagos).

## Production and source

- Website: https://boomcleaning.site
- Booking flow: https://boomcleaning.site/quote
- Booking terms: https://boomcleaning.site/terms
- Admin: https://boomcleaning.site/admin
- Vercel project: `boom-cleaning`, team `drus-projects-68c924fa`.
- Supabase project: `igepbyooomglsjetfcgn`.
- Repository: https://github.com/andex23/Boom-Cleaning-.git
- Working branch: `codex/boom-booking-platform`.
- Materialized working checkout: `/Users/andrewjunior/Developer/boom-paystack`.
- Original workspace: `/Users/andrewjunior/Documents/ChatGPT/Boom Cleaning`.

Use the materialized checkout for builds and deployments; the original workspace has previously had iCloud-offloaded files. Credentials and database backups are excluded from Git and deployments. Source delivery and final deployment details are recorded below after completion.

## Customer and payment workflow

1. Choose a service and quantities, appointment, address and contact details.
2. Review the server-calculated price and agree to the linked terms and conditions. Both the UI and booking API require explicit acceptance.
3. Pay the full NGN amount at Flutterwave hosted checkout. The browser cannot supply the price.
4. The server re-verifies the transaction reference, currency, full amount and successful status, then atomically confirms the booking.
5. Customer and BOOM admin receive separate branded confirmation emails containing the company logo. Delivery workers retry independently.

Staff approval is not required. Selecting a service without a published price prevents checkout. Supabase stores the accepted quote and its line items so later catalogue edits do not change an existing booking price.

Cancellation returns to the locally saved booking. New checkouts retain the provider reference and hosted link for retry. Bookings created before this update retain their details but may lack the retry link in browser storage. Browser-saved details are display data; they do not prove payment. Successful server verification takes priority over a cancellation hint in a callback URL.

## Dashboard operations

Sign in at `/admin/login` using the configured admin password. The session is signed with `ADMIN_SESSION_SECRET`. Do not send credentials in this document. Confirm that the receiving operator can sign in before handoff is considered accepted.

- Check paid bookings, dates, service scope and customer contact details before dispatching a crew.
- Update service prices and appointment availability through the dashboard where supported.
- A pending booking needs payment; it is not an approved cleaning appointment.
- Confirm disputed payments in Flutterwave and match the BOOM reference before acting.

## Provider configuration

### Flutterwave

Live account: **BOOM CLEANING SERVICE LIMITED**. A fresh live checkout displayed Card, Bank Transfer, PayPal and Bank Payment on 8 October. The Card entry form was opened successfully in Chrome; no real payment was charged during validation.

Webhook URL:

```text
https://boomcleaning.site/api/payments/flutterwave/webhook
```

The dashboard Secret Hash must match `FLUTTERWAVE_WEBHOOK_SECRET`. The v3 endpoint checks `verif-hash`, re-fetches payment data and settles idempotently. Keep retries enabled. Dashboard setup was reported completed by the owner. An authenticated health request returned HTTP 200; this does not establish actual provider-event delivery.

The callback verifies payment immediately. Daily reconciliation runs at **06:00 Lagos time** (`0 5 * * *` UTC). The protected reconciliation route is `/api/internal/automation/payments/reconcile` and uses `CRON_SECRET`.

Flutterwave controls the hosted payment UI, including its native cancellation warning. Card entry, OTP and final payment remain customer actions. Never enter a customer's card details as an operator.

### Email

- Provider: Resend.
- Sender: `BOOM Cleaning <bookings@boomcleaning.site>`.
- Reply-To and BOOM admin recipient: `boomcleaninfo@gmail.com`.
- Confirmation emails include the actual BOOM company logo.
- Payment receipt and admin notification are queued independently; one failed recipient does not block the other.
- The protected email-dispatch route is `/api/internal/automation/email/dispatch`. It accepts the configured automation-worker secret or cron secret.
- Reconciliation retries payment-confirmation emails. Booking-request email retries can be triggered through the protected email worker; there is no separate email cron in `vercel.json`.

Inspect Resend's delivery status when a recipient reports a missing message. A queued/sent API result is not an inbox-delivery guarantee. Earlier test email to an invalid customer address bounced; a separate BOOM admin test notification was delivered.

## Secrets and access

Required environment names are listed in `.env.example`. Never commit `.env.local`, expose service-role keys in browser code or paste secret values into handoff notes.

- Server: `SUPABASE_SERVICE_ROLE_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `CRON_SECRET`.
- Optional: `AUTOMATION_WORKER_SECRET` is an alternate email-worker credential and is needed for the separate Instagram processor. Production email dispatch can use the configured `CRON_SECRET`; the alternate worker secret was absent at handoff inspection.
- Browser: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Instagram variables are only needed when implementing that integration; they are not a prerequisite for booking and payment.
- `PAYSTACK_SECRET_KEY` serves legacy test-history verification; new bookings use Flutterwave.

The local secret-input FIFO is owner-only. See `secret-entry.md`. Production credentials live in Vercel environment variables. Account owners must provide access to Vercel, Supabase, Flutterwave, Resend, GitHub and Namecheap through the providers' normal access-management flows. This preparation does not transfer account ownership or grant anyone access.

## Database cleanup

The owner confirmed that all bookings were tests. On 8 October 2026, all **16 bookings** (BOOM-5 through BOOM-17, BOOM-21, BOOM-22 and BOOM-23) and their related payments, quotes, leads, customers, outbox and email-delivery records were removed. No live paid payment existed. The three unpaid Flutterwave test checkout links were disabled before deletion. Services (11), service-space prices (58), booking slots (6), catalogue rules, staff and authentication were preserved. Booking-number sequences were not reset.

The verified private pre-cleanup backup is `output/backups/handoff-20261008T154937Z/` (35 tables; every checksum verified). Directory permissions are 700 and files 600. Backups contain private customer data and are excluded from Git and deployments. Use `python3 scripts/backup-handoff.py` for a fresh backup. Do not run the development seed or old blanket reset on production.

`cleanup-test-bookings.sql` retains ROLLBACK as its safe default; the authorized execution used COMMIT after backup and live-payment checks. To recover, verify the manifest and restore selected rows in staging using dependency order. Reconcile provider state before importing into production. Do not replay pending outbox records or resend historical emails. No restore rehearsal is claimed.

## Dashboard and analytics

The desktop sidebar has Overview, Inbox, Bookings, Customers, Payments, Analytics, Services and Integrations. Every section has a direct URL under `/admin` (for example `/admin/inbox` and `/admin/services`); unknown sections return 404, and private pages require sign-in. Browser Back and refresh retain the selected section. Mobile navigation opens from the menu, supports Escape, traps focus while open and hides closed navigation from keyboard focus. The “Book for a customer” button opens the regular booking form for phone/message requests; payment still confirms the booking. Unimplemented placeholder sections are removed. Inactive Instagram is grey and does not produce a setup warning. Inbox contains actual customer enquiries, not a connected email mailbox. Inbox, bookings and payments have search/status filters; customers have contact search. Record summaries describe the records shown (up to 100 bookings/enquiries, 200 customers and 50 payment records), not uncapped business totals. Bookings include contact details, address and frozen line items. Services displays actual published bedroom/space packages and item prices; price saves use a single atomic transaction and leave existing quotes unchanged.

Revenue counts PAID Flutterwave NGN payments by the date received in Africa/Lagos. Unpaid bookings and legacy Paystack tests do not count as revenue. Scheduled work excludes pending bookings. Database aggregation avoids the default row limit when computing totals.

Analytics starts with this release; no historical visits were invented. Public Home, Booking, Terms, About, FAQ, Pricing and Services page views are counted once per anonymous session/page/30-minute bucket. Sessions expire after 30 minutes of inactivity and hashes rotate each Lagos day. Analytics shows the last 30 days, popular pages, referring hostnames and device categories. No raw IPs, full user agents, query strings, customer or payment details are stored. Do Not Track and Global Privacy Control are respected. Collection is same-origin, size-bounded and rate-limited, with private service-role-only database access. The daily reconciliation cron deletes visits older than 90 days. Per-instance rate limiting is best-effort; these are browser visit counts, not an audited measure of unique people.

Owner account onboarding is still pending, explicitly paused while the user reviews the dashboard. The requested owner email is boomcleaninfo@gmail.com. The current shared admin-password login remains in use; no owner password or account was created.

## Current Flutterwave issue

The supplied hosted Bank Transfer checkout screenshot says: “Your activity is under review due to irregular transaction patterns. Please contact support.” This originates from Flutterwave. Verification does not prove every payment method is currently unrestricted. The exact restriction requires Flutterwave support investigation; no merchant-level or card-only cause is confirmed. Avoid further live diagnostic checkouts until resolved. Include the screenshot, merchant name BOOM CLEANING SERVICE LIMITED and the relevant transaction reference when contacting support. No support message has been sent.

## Validation and acceptance

Latest completed release validation before handoff preparation: **121 tests across 20 files**, lint, TypeScript and production build passed. Production cancellation-return routing was checked using a cancellation callback URL and restored BOOM-21's saved appointment and amount. This is callback-handler proof, not a fresh paid transaction.

Before the business accepts the handoff:

- Verify admin access from the receiving operator's browser.
- Complete one owner-authorized real payment and confirm the booking becomes confirmed exactly once.
- Verify actual Flutterwave webhook delivery and successful transaction re-verification.
- Verify both the customer receipt and BOOM admin email are delivered in Resend and received.
- Open a freshly loaded booking page; tabs opened before a deployment can keep the older JavaScript and may need a reload.

Do not describe live end-to-end payment and email delivery as proved until this real transaction is completed.

## Development and deployment

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx vercel deploy --prod --scope drus-projects-68c924fa
```

For Next.js 16.3, read the relevant guides in `node_modules/next/dist/docs/` before making framework changes. Do not run the development seed against production. Use Supabase migrations for schema changes and retain the full migration history.

### Final delivery record

Production source commit: `3f3a939` on `codex/boom-booking-platform`, pushed to GitHub. Vercel deployment `dpl_AN4DANzLaG4DhmMRtYvG3s3cxXXX` is Ready and aliased to https://boomcleaning.site. All 121 tests, lint and TypeScript passed; the production deployment compiled and typechecked successfully.

Rendered canonical checks on 8 October 2026 covered all eight admin routes at desktop 1440×900 and mobile 375×812. Each section loaded its own content and URL with no horizontal page overflow. Browser Back and a direct Services refresh retained the section. Mobile navigation closed after every route selection and on Escape. No browser console errors were recorded. Screenshots are saved privately under `output/admin-pages/`. The visible dashboard has zero bookings/payments/customer/enquiry records after cleanup and one genuine verification visit, not synthetic traffic. Published catalogue editing was checked through database rollback tests; no production prices were changed. The user’s dashboard tab was refreshed to the new release.

### Payment history update, 8 October 2026

Source `7bab771` adds weekly/calendar-month payment charts to Overview and Payments, previous/next/current period controls, a date/month picker and daily breakdown. Receipt totals query all PAID Flutterwave NGN payments by Lagos `paid_at`; the latest-50 ledger remains separately labelled. Migration `20261008210000_payment_revenue_history.sql` is applied; anonymous and authenticated customer roles cannot call its aggregation function. Historical September and previous-week bounds returned complete zero-valued daily series after test cleanup. Currency symbols now have a nonbreaking space before figures; booking dropdown arrows are inset by 14px.

127 tests across 21 files, lint and TypeScript passed. Vercel production deployment `dpl_E7tJiGNE73EkJoR29yA6jibGcPei` compiled/typechecked and was aliased to boomcleaning.site. Rendered canonical checks verified previous week, September monthly view, its 30 daily rows, both chart placements and booking-filter selection. Desktop 1440×900 and mobile 469×698 were checked; mobile had no horizontal page overflow and no console errors were recorded. Screenshots are in `output/admin-pages/payment-history-desktop.png` and `payment-history-mobile.png`. No payments, prices or booking records were created or changed during these checks.
