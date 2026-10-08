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

The pre-cleanup inventory contained **14 bookings, 14 quotes, 14 leads, 11 customers, 6 payment rows, 19 outbox records and 17 email-delivery records**. Five payment rows used Paystack test mode. The one Flutterwave payment was pending. No Flutterwave `PAID` row was present at inventory time.

Identified test bookings: BOOM-12, BOOM-14, BOOM-15, BOOM-16, BOOM-17 and today's unpaid BOOM-21. Older bookings BOOM-5 through BOOM-11 and BOOM-13 require the owner's classification before removal.

A verified private backup is at `output/backups/handoff-20261008T154019Z/` in the materialized checkout (35 tables; all hashes and counts verified). A new backup is generated by `python3 scripts/backup-handoff.py` into `output/backups/handoff-<UTC timestamp>/`. Each JSON table export has a SHA-256 checksum and row count in `manifest.json`; the directory has mode 700 and files mode 600. Backups contain private customer data, are ignored by Git and must be transferred only through an agreed private channel.

Do not use the old blanket `reset-test-bookings.sql` against production. The prepared selective cleanup preserves pricing, services, availability, crews, staff, authentication and booking-number sequences. It aborts if selected records contain a paid live Flutterwave payment or operational dependencies needing review. Only orphaned customers and leads associated with removed records are eligible for deletion. A recoverable export does not make removal harmless; confirm the selected booking list first.

To recover: review the manifest, verify hashes, then restore the selected rows in a staging database using the installed schema and foreign-key dependency order. Reconcile provider state before importing into production. Do not blindly replay outbox records marked pending or resend historical emails. No restore rehearsal has been claimed.

Cleanup execution status: **Awaiting owner confirmation of the older records; no deletion has been executed.**

## Validation and acceptance

Latest completed release validation before handoff preparation: **113 tests across 18 files**, lint, TypeScript and production build passed. Production cancellation-return routing was checked using a cancellation callback URL and restored BOOM-21's saved appointment and amount. This is callback-handler proof, not a fresh paid transaction.

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

Source checkpoint `b6a53d3` is pushed to `origin/codex/boom-booking-platform`. The selective six-booking cleanup passed a rolled-back preview: 8 bookings remained, with all 11 services, 58 service-space pricing rows and 6 slots preserved. A subsequent read confirmed all 14 original bookings still exist. Permanent cleanup remains pending owner classification. All 113 tests passed during handoff preparation; no potential live secret values were detected in the staged source scan. Production release `dpl_BYer3JyDN4GyCvs88oN6X1CgC1So` is Ready and aliased to https://boomcleaning.site. The live FAQ was rendered and shows Flutterwave full-payment confirmation wording. Production environment-name inspection confirmed the core server credentials and `CRON_SECRET` are present; secret values were not exported.
