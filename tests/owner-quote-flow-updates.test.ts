import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEEP_CLEANING_BUNDLE_SLUGS,
  deepCleaningExtrasFromSlug,
  deepCleaningSlugForExtras,
} from "@/features/booking/deep-cleaning-options";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20260828113000_owner_quote_flow_updates.sql"), "utf8");

describe("owner quote-flow corrections", () => {
  it("keeps the three bundled packages under Deep Cleaning", () => {
    expect([...DEEP_CLEANING_BUNDLE_SLUGS]).toEqual([
      "deep-cleaning-upholstery",
      "deep-cleaning-fumigation",
      "deep-cleaning-upholstery-fumigation",
    ]);
    expect(deepCleaningSlugForExtras(true, false)).toBe("deep-cleaning-upholstery");
    expect(deepCleaningSlugForExtras(false, true)).toBe("deep-cleaning-fumigation");
    expect(deepCleaningSlugForExtras(true, true)).toBe("deep-cleaning-upholstery-fumigation");
    expect(deepCleaningExtrasFromSlug("deep-cleaning")).toEqual({ upholstery: false, fumigation: false });
  });

  it("replaces the broad zones with the exact nine supplied locations", () => {
    for (const name of ["Kubwa", "Lugbe", "Lokogoma", "Apo", "Garki", "Wuse", "Maitama", "Karu", "Asokoro"]) {
      expect(sql).toContain(`'${name}'`);
    }
    expect(sql).toContain("where slug not in ('kubwa', 'lugbe', 'lokogoma', 'apo', 'garki', 'wuse', 'maitama', 'karu', 'asokoro')");
  });

  it("prices Compound at NGN 20,000 for every Deep Cleaning package", () => {
    expect(sql).toContain("t.slug = 'compound-sweep'");
    expect(sql).toContain("select s.id, t.id, 20000, 0, true");
    for (const slug of ["deep-cleaning", "deep-cleaning-upholstery", "deep-cleaning-fumigation", "deep-cleaning-upholstery-fumigation"]) {
      expect(sql).toContain(`'${slug}'`);
    }
  });

  it("explains upholstery in customer-facing service names", () => {
    expect(sql).toContain("Upholstery (chair cleaning)");
  });
});
