# BOOM Cleaning Services

A backend-led cleaning-services automation platform with a premium public journey, deterministic quote demonstration and staff operations console.

## Included now

- Public marketing page and complete service catalogue.
- Five-step quote-to-booking journey with service selection, property details, a custom availability calendar, appointment slots, contact capture, deterministic estimates/manual-review routing, booking confirmation and a durable browser booking reference.
- Password-protected staff console with daily KPIs, revenue pulse, schedule, attention queue, enquiries, operational navigation and immediate visibility of newly confirmed web bookings.
- PostgreSQL schema for customers, leads, quotes, availability, bookings, payments, jobs, conversations, automation events, notes, activity and reviews.
- RLS, idempotency constraints, foreign-key indexes and runtime validation.

## Local setup

1. Copy `.env.example` to `.env.local` and enter the required Supabase and admin values.
2. Create a Supabase project, then run the migrations in `supabase/migrations` and `supabase/seed.sql` in order.
3. Run `npm install` and `npm run dev`.
4. Visit `/` for the booking experience or `/admin` for protected operations.

## Quality checks

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before merging.

## Not included yet

The current browser experience uses typed demonstration data. No Paystack, Meta, Instagram, WhatsApp, Facebook, OpenAI or n8n provider is connected yet; server-side provider boundaries remain intentionally clean. See `docs/architecture.md` and `docs/database.md`.
