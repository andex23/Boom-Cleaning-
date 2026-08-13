# Architecture

BOOM is one backend-led business system. Public web, staff tools and future messaging channels are adapters around the same PostgreSQL data and server-side services.

## Current demonstration boundary

The application establishes Next.js, strict TypeScript, Supabase client boundaries, environment validation, an operations-ready database schema, RLS and seed data. It now includes a fully interactive local quote experience and a data-rich operations dashboard. Payment, messaging, AI and automation providers remain explicit integration boundaries and are not connected.

## Layers

- `src/app`: route composition only.
- `src/features`: domain use-cases and repository contracts.
- `src/lib`: shared infrastructure such as environment and Supabase clients.
- `supabase/migrations`: ordered database evolution; `seed.sql` is local development data.

Future integrations must call server-side services and append domain events; they must never duplicate customer, pricing, availability or booking logic.
