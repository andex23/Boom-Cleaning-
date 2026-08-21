# Architecture

BOOM is one backend-led business system. Public web, staff tools and future messaging channels are adapters around the same PostgreSQL data and server-side services.

## Current demonstration boundary

The application establishes Next.js, strict TypeScript, Supabase client boundaries, environment validation, an operations-ready database schema, RLS and seed data. It includes a fully interactive local quote experience, a data-rich operations dashboard and a secure Instagram webhook adapter. The live Instagram account, publishing, DM processing, payments and AI remain explicit integration boundaries and are not connected.

## Layers

- `src/app`: route composition only.
- `src/features`: domain use-cases and repository contracts.
- `src/lib`: shared infrastructure such as environment and Supabase clients.
- `supabase/migrations`: ordered database evolution; `seed.sql` is local development data.

Future integrations must call server-side services and append domain events; they must never duplicate customer, pricing, availability or booking logic.

## Pricing

Money is calculated in one place: `public.calculate_quote` in the database. Nothing else is
allowed to produce a price.

A property is described as a **property type** (a characteristic that scales the whole job,
carrying a multiplier and a minimum floor — penthouse, duplex, bungalow) plus a set of
counted **spaces** (bedroom, bathroom, boys' quarters, gazebo, terrace, pool area). Per-unit
prices live in `service_space_prices` and vary by service, because a gazebo after
construction is not the same job as a gazebo in a routine deep clean.

    total = greatest(
      (service base + Σ chargeable spaces + area surcharge) × property multiplier,
      greatest(service minimum, property type minimum)
    )

Three rules keep the number trustworthy:

- **The browser never sends an amount.** `/api/bookings` accepts pricing *inputs* only, and
  `create_booking_from_request` prices the scope inside the booking transaction. A tampered
  request cannot change what a customer is charged, and a price edit mid-checkout cannot be
  exploited.
- **`/api/quote` and the booking write call the same function**, so the estimate a customer
  sees is the amount they are charged.
- **An unpriced space is never free.** Selecting a space the service has no active price for
  routes the whole quote to manual review rather than adding a zero-cost line.

Line items are frozen into `quote_items` when a quote is created, so staff can edit prices
without rewriting quotes that customers have already agreed to.

Instagram webhook requests are verified against a server-only token, authenticated with Meta's raw-body SHA-256 signature and normalized into idempotent `automation_events`. A later processor will turn approved event types into leads, conversations and outbound actions.
