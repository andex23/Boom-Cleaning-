# BOOM Cleaning Services

A backend-led cleaning-services automation platform with a premium public journey, deterministic quote demonstration and staff operations console.

## Included now

- Public marketing page and complete service catalogue, both read from the database.
- Five-step quote-to-booking journey with service selection, a property description built from counted spaces, a custom availability calendar, appointment slots, contact capture, server-calculated estimates with an itemised breakdown, manual-review routing, booking confirmation and a durable browser booking reference.
- Space-based pricing: a property is a property type (multiplier plus minimum floor) and a set of counted spaces — bedrooms and bathrooms, but also boys' quarters, gazebo, terrace, external staircase and pool area. Per-unit prices vary by service. See `docs/architecture.md`.
- Password-protected staff console with daily KPIs, revenue pulse, schedule, attention queue, enquiries, operational navigation, immediate visibility of newly confirmed web bookings, a pricing editor and a per-booking price breakdown.
- PostgreSQL schema for customers, leads, quotes, availability, bookings, payments, jobs, conversations, automation events, notes, activity and reviews.
- RLS, idempotency constraints, foreign-key indexes and runtime validation.
- Secure Instagram webhook foundation with Meta verification, signature validation, idempotent event ingestion and admin connection status.

## Local setup

1. Copy `.env.example` to `.env.local` and enter the required Supabase and admin values.
2. Create a Supabase project, then run the migrations in `supabase/migrations` and `supabase/seed.sql` in order.
3. Run `npm install` and `npm run dev`.
4. Visit `/` for the booking experience or `/admin` for protected operations.

## Quality checks

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before merging.

## Instagram automation setup

1. Create or select the BOOM Meta app and connect the BOOM Instagram professional account.
2. Add `INSTAGRAM_APP_SECRET`, `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`, `INSTAGRAM_ACCOUNT_ID` and `INSTAGRAM_ACCESS_TOKEN` to the server environment. Never expose them with a `NEXT_PUBLIC_` prefix.
3. In Meta, set the callback URL to `https://<your-domain>/api/integrations/instagram/webhook` and use the same verify token.
4. Subscribe only to the Instagram webhook fields approved for the Meta app. Incoming events are stored in `automation_events` for later processing.

The admin status card distinguishes missing credentials, a webhook-ready app and a fully credentialed Instagram account.

## Booking confirmation email

`supabase/migrations/005_booking_confirmation_email.sql` adds a service-role-only transactional outbox workflow for booking confirmations. The protected worker at `/api/internal/automation/email/dispatch` claims one booking event at a time, sends through Resend with a deterministic provider idempotency key, and marks it delivered or schedules an exponential-backoff retry.

Set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel before invoking the worker. `EMAIL_FROM` must use a domain verified in Resend. For Vercel Cron, set `CRON_SECRET` and configure the cron request to call this route; otherwise call it with `Authorization: Bearer <AUTOMATION_WORKER_SECRET>`. The route does no work until a provider key and sender are configured.

## Changing prices

Sign in to `/admin` and open **Services** to edit service base prices and minimums, property
type multipliers and floors, per-space unit prices and travel surcharges. Changes take effect
on new quotes; quotes already created keep the line items they were built with.

Leaving a space unpriced for a service is a deliberate control, not an omission — that scope
is routed to manual review instead of being cleaned for free. Use it for anything you would
rather look at before committing to a number.

## Not included yet

The staff console's KPIs, schedule and enquiry lists still use typed demonstration data; the
pricing editor and booking breakdown read live data. The Instagram webhook adapter is implemented, but the live BOOM account is not authorized and publishing/DM workflows are not active yet. No Paystack, WhatsApp, Facebook, OpenAI or n8n provider is connected. See `docs/architecture.md` and `docs/database.md`.
