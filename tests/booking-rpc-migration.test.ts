import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/004_create_booking_rpc.sql"), "utf8");

describe("production booking RPC migration", () => {
  it("keeps schedule conflict protection in the database", () => {
    expect(migration).toContain("bookings_no_active_schedule_overlap");
    expect(migration).toContain("tstzrange(scheduled_start_at, scheduled_end_at, '[)') with &&");
    expect(migration).toContain("when exclusion_violation");
  });

  it("uses one privileged transaction boundary and does not expose it to browser roles", () => {
    expect(migration).toContain("function public.create_booking_from_request(request jsonb)");
    expect(migration).toContain("security definer");
    expect(migration).toContain("revoke all on function public.create_booking_from_request(jsonb) from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.create_booking_from_request(jsonb) to service_role");
  });

  it("persists the complete booking lifecycle and handles retries", () => {
    for (const table of ["public.customers", "public.leads", "public.quotes", "public.quote_answers", "public.bookings", "public.automation_outbox"]) {
      expect(migration).toContain(table);
    }
    expect(migration).toContain("idempotentReplay");
    expect(migration).toContain("booking.requested");
  });
});
