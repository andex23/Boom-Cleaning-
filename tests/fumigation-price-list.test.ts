import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/014_fumigation_price_list.sql"), "utf8");

describe("published fumigation price list", () => {
  it("stores every bedroom step exactly as published", () => {
    // 50/70/90/100/120/140/150/170 — the steps are 20,20,10,20,20,10,20, so no formula fits.
    for (const price of ["50000", "70000", "90000", "100000", "120000", "140000", "150000", "170000"]) {
      expect(sql).toContain(price);
    }
  });

  it("prices boys' quarters by quantity, because a second room adds 20,000 not 30,000", () => {
    expect(sql).toContain("create table if not exists public.service_space_tiers");
    expect(sql).toContain("unique (service_id, space_type_id, quantity)");
    expect(sql).toContain("(1, 30000::numeric)");
    expect(sql).toContain("(2, 50000)");
    expect(sql).toContain("t.slug = 'boys-quarters'");
  });

  it("turns fumigation into an instant quote without a property uplift", () => {
    expect(sql).toContain("set requires_review = false, uses_property_pricing = false");
  });

  it("stops per-room prices stacking on top of the published table", () => {
    expect(sql).toMatch(/update public\.service_space_prices[\s\S]*s\.slug = 'fumigation'/);
  });

  it("refuses to invent a figure for a quantity the table does not cover", () => {
    expect(sql).toContain("We quote %s in that quantity individually.");
  });
});

describe("tier-priced services include the rooms they do not itemise", () => {
  it("no longer sends a whole-home tier quote to review over a living room", () => {
    // Regression: a 3-bed deep clean quoted 161,250, but adding a living room returned
    // "Living room is not covered by the standard Deep cleaning price." and refused a total.
    expect(sql).toContain("if uses_tiers then\n        continue;");
  });

  it("still refuses to give away an unpriced room on a per-room service", () => {
    expect(sql).toContain("is not covered by the standard");
    expect(sql).toContain("review_required := true");
  });
});
