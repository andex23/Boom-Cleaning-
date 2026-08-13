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

Instagram webhook requests are verified against a server-only token, authenticated with Meta's raw-body SHA-256 signature and normalized into idempotent `automation_events`. A later processor will turn approved event types into leads, conversations and outbound actions.
