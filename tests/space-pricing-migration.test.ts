import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(resolve(process.cwd(), "supabase/migrations", name), "utf8");
const pricing = read("006_space_based_pricing.sql");
const booking = read("007_booking_uses_server_pricing.sql");
const referenceData = read("008_pricing_reference_data.sql");

describe("space-based pricing migration", () => {
  it("models a property as counted spaces inside a multiplied property type", () => {
    for (const table of ["public.property_types", "public.space_types", "public.service_space_prices", "public.service_areas", "public.quote_items"]) {
      expect(pricing).toContain(`create table if not exists ${table}`);
    }
    expect(pricing).toContain("base_multiplier numeric(6,3)");
    expect(pricing).toContain("minimum_charge numeric(12,2)");
    expect(pricing).toContain("unique (service_id, space_type_id)");
  });

  it("keeps the calculator privileged and out of reach of browser roles", () => {
    expect(pricing).toContain("function public.calculate_quote(request jsonb)");
    expect(pricing).toContain("security definer");
    expect(pricing).toContain("revoke all on function public.calculate_quote(jsonb) from public, anon, authenticated");
    expect(pricing).toContain("grant execute on function public.calculate_quote(jsonb) to service_role");
  });

  it("applies the multiplier before the floor so a small job still clears a minimum", () => {
    expect(pricing).toContain("multiplied_subtotal := round(running_subtotal * property_row.base_multiplier, 2)");
    expect(pricing).toContain("minimum_value := greatest(service_row.minimum_charge, property_row.minimum_charge)");
    expect(pricing).toContain("total_value := greatest(multiplied_subtotal, minimum_value)");
  });

  it("never gives away a space it has no price for", () => {
    // The unpriced branch must route to review rather than adding a zero-cost line.
    expect(pricing).toContain("review_required := true");
    expect(pricing).toContain("is not covered by the standard");
    expect(pricing).toContain("'requiresReview', review_required");
  });

  it("withholds a total whenever the scope needs a person", () => {
    expect(pricing).toContain("if review_required then\n    total_value := null;");
  });

  it("types every review reason so `||` appends text rather than parsing an array literal", () => {
    // An untyped literal resolves `||` to anyarray || anyarray and fails at runtime with
    // 22P02. format() returns typed text; bare literals must be cast explicitly.
    const appends = pricing.match(/review_reasons \|\| .*/g) ?? [];
    expect(appends.length).toBeGreaterThan(0);
    for (const append of appends) {
      expect(append.includes("format(") || append.includes("::text")).toBe(true);
    }
  });
});

describe("booking uses server pricing", () => {
  it("prices the scope inside the booking transaction instead of trusting the caller", () => {
    expect(booking).toContain("quote_result := public.calculate_quote(");
    expect(booking).toContain("subtotal_value := coalesce((quote_result ->> 'total')::numeric(12,2), 0)");
    expect(booking).toContain("booking_total_value := subtotal_value");
  });

  it("no longer reads any amount from the request payload", () => {
    for (const clientAmount of ["{quote,subtotal}", "{booking,total}", "{quote,discount}"]) {
      expect(booking).not.toContain(clientAmount);
    }
  });

  it("derives the appointment end from the service's own duration", () => {
    expect(booking).toContain("make_interval(mins => (quote_result ->> 'durationMinutes')::integer)");
    expect(booking).not.toContain("{booking,scheduledEndAt}");
  });

  it("freezes the breakdown so a later price edit cannot rewrite an agreed quote", () => {
    expect(booking).toContain("insert into public.quote_items");
    expect(booking).toContain("jsonb_array_elements(coalesce(quote_result -> 'items'");
  });

  it("keeps the existing idempotency, identity and scheduling protections", () => {
    expect(booking).toContain("idempotentReplay");
    expect(booking).toContain("pg_advisory_xact_lock");
    expect(booking).toContain("when exclusion_violation");
    expect(booking).toContain("revoke all on function public.create_booking_from_request(jsonb) from public, anon, authenticated");
  });
});

describe("pricing reference data", () => {
  it("can express a three-bedroom home that also has a gazebo, BQ or penthouse floor", () => {
    for (const slug of ["'gazebo'", "'boys-quarters'", "'penthouse'", "'external-staircase'", "'pool-area'"]) {
      expect(referenceData).toContain(slug);
    }
  });

  it("is safe to re-run without overwriting prices staff have since edited", () => {
    expect(referenceData).toContain("on conflict (slug) do update set");
    expect(referenceData).toContain("on conflict (service_id, space_type_id) do nothing");
    expect(referenceData).not.toMatch(/on conflict \(service_id, space_type_id\) do update/);
  });

  it("creates the services it prices, since seed.sql runs after the migrations", () => {
    expect(referenceData).toContain("insert into public.services (name, slug, description, pricing_model, sort_order)");
    expect(referenceData.indexOf("insert into public.services")).toBeLessThan(referenceData.indexOf("update public.services set base_price"));
  });

  it("routes manual-quote services to a person rather than pricing them", () => {
    expect(referenceData).toContain("requires_review = true");
    expect(referenceData).toContain("'post-construction-cleaning', 'post-renovation-cleaning', 'office-cleaning', 'fumigation'");
  });
});

const manualPricing = read("009_manual_booking_pricing.sql");

describe("manual booking pricing", () => {
  it("gives staff a way to price a scope the calculator refused", () => {
    expect(manualPricing).toContain("function public.set_booking_price(request jsonb)");
    expect(manualPricing).toContain("update public.quotes");
    expect(manualPricing).toContain("requires_review = false");
    expect(manualPricing).toContain("update public.bookings");
  });

  it("records the change as a line item so the breakdown still adds up", () => {
    expect(manualPricing).toContain("'MANUAL_ADJUSTMENT'");
    expect(manualPricing).toContain("delta_value := amount_value - booking_row.total");
    expect(manualPricing).toContain("coalesce(max(sort_order) + 1, 0)");
  });

  it("locks the booking and refuses closed ones", () => {
    expect(manualPricing).toContain("for update");
    expect(manualPricing).toContain("status in ('CANCELLED', 'COMPLETED')");
  });

  it("leaves an audit trail and stays service-role only", () => {
    expect(manualPricing).toContain("insert into public.audit_logs");
    expect(manualPricing).toContain("'booking.price_set'");
    expect(manualPricing).toContain("revoke all on function public.set_booking_price(jsonb) from public, anon, authenticated");
    expect(manualPricing).toContain("grant execute on function public.set_booking_price(jsonb) to service_role");
  });
});

const crews = read("011_crews_and_booking_lifecycle.sql");

describe("crews and capacity", () => {
  it("replaces the business-wide schedule lock with a per-crew one", () => {
    // The old constraint had no crew column, so one job blocked every other customer.
    expect(crews).toContain("drop constraint if exists bookings_no_active_schedule_overlap");
    expect(crews).toContain("add constraint bookings_no_crew_schedule_overlap");
    expect(crews).toContain("crew_id with =");
  });

  it("assigns a free crew when a booking is made", () => {
    expect(crews).toContain("function public.assign_free_crew(start_value timestamptz, end_value timestamptz)");
    expect(crews).toContain("crew_value := public.assign_free_crew(start_value, end_value)");
    expect(crews).toContain("crew_id, status, scheduled_start_at");
  });

  it("counts free crews rather than treating one booking as a full day", () => {
    expect(crews).toContain("free_crews := crew_total - coalesce(busy_crews, 0)");
    expect(crews).toContain("'crewsFree', greatest(free_crews, 0)");
  });
});

describe("booking lifecycle", () => {
  it("only permits sensible status transitions", () => {
    expect(crews).toContain("function public.update_booking_status(request jsonb)");
    expect(crews).toContain("when 'PENDING' then array['CONFIRMED', 'CANCELLED', 'NO_SHOW']");
    expect(crews).toContain("when 'IN_PROGRESS' then array['COMPLETED', 'CANCELLED']");
    expect(crews).toContain("cannot become");
  });

  it("writes the timestamps the table's checks require", () => {
    expect(crews).toContain("cancelled_at = case when next_status = 'CANCELLED' then now()");
    expect(crews).toContain("completed_at = case when next_status = 'COMPLETED' then now()");
  });

  it("reschedules onto a crew that is actually free", () => {
    expect(crews).toContain("function public.reschedule_booking(request jsonb)");
    expect(crews).toContain("No crew is free at that time");
    // The variable must not shadow services.duration_minutes.
    expect(crews).toContain("select s.duration_minutes into duration_value");
  });

  it("keeps every lifecycle function service-role only", () => {
    for (const fn of ["update_booking_status(jsonb)", "reschedule_booking(jsonb)", "assign_free_crew(timestamptz, timestamptz)"]) {
      expect(crews).toContain(`revoke all on function public.${fn} from public, anon, authenticated`);
      expect(crews).toContain(`grant execute on function public.${fn} to service_role`);
    }
  });
});

const priceList = read("012_real_price_list.sql");
const compoundWashRange = read("20260820144237_compound_wash_price_range.sql");

describe("published price list", () => {
  it("stores the deep-cleaning figures exactly as published", () => {
    // 1->2 bedrooms is +21,500 while every later step is +53,750, so no formula fits.
    for (const price of ["86000", "107500", "161250", "215000", "268750", "322500"]) {
      expect(priceList).toContain(price);
    }
    expect(priceList).toContain("create table if not exists public.service_bedroom_tiers");
    expect(priceList).toContain("unique (service_id, bedrooms)");
  });

  it("sells the four packages as separate services", () => {
    for (const slug of ["'deep-cleaning-upholstery'", "'deep-cleaning-fumigation'", "'deep-cleaning-upholstery-fumigation'"]) {
      expect(priceList).toContain(slug);
    }
  });

  it("does not add a property uplift to a published price", () => {
    expect(priceList).toContain("uses_property_pricing boolean not null default true");
    expect(priceList).toContain("if service_row.uses_property_pricing then");
    expect(priceList).toContain("set requires_review = false, uses_property_pricing = false");
  });

  it("stops old per-room prices stacking on top of a tier price", () => {
    // Leftover placeholder prices would otherwise be charged in addition to the tier.
    expect(priceList).toContain("set is_active = false, updated_at = now()");
    expect(priceList).toContain("continue when uses_tiers and space_slug = 'bedroom'");
  });

  it("quotes homes above the published table by hand", () => {
    expect(priceList).toContain("We quote homes above %s bedrooms individually.");
  });

  it("prices post-construction per unit, including storeys and the compound", () => {
    for (const pair of ["'bedroom',        50000", "'living-room',    60000", "'storey',         50000", "'compound-sweep', 20000", "'compound-wash',  70000", "'extra-room',     30000"]) {
      expect(priceList).toContain(pair);
    }
  });

  it("does not freeze the bottom of the compound-washing range as a final price", () => {
    expect(compoundWashRange).toContain("NGN 70,000 to NGN 100,000");
    expect(compoundWashRange).toContain("requires_review = true");
    expect(compoundWashRange).toContain("slug = 'compound-wash'");
  });

  it("never quotes zero for an empty scope", () => {
    expect(priceList).toContain("if not review_required and total_value <= 0 then");
  });
});
