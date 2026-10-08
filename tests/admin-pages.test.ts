import { describe,it,expect } from "vitest";
import { adminAreas,adminRoutes,adminAreaForPath } from "@/data/admin-navigation";
import { pricingUpdateSchema } from "@/features/pricing/pricing-admin";
describe("admin routes and catalogue input", () => {
  it("gives every section its own stable URL including overview and trailing slash", () => {
    expect(new Set(Object.values(adminRoutes)).size).toBe(adminAreas.length);
    for(const area of adminAreas) {
      expect(adminAreaForPath(adminRoutes[area])).toBe(area);
      expect(adminAreaForPath(`${adminRoutes[area]}/`)).toBe(area);
    }
  });
  it("does not resolve unknown or authentication pages to a business section", () => {
    for(const path of ["/admin/login","/admin/unknown","/admin/bookings/BOOM-15","/quote"]) expect(adminAreaForPath(path)).toBeNull();
  });
  it("rejects invalid package identifiers and prices before database updates", () => {
    const id="c7ea3c0b-3f0a-44ce-8f4a-5156f1204c71";
    expect(pricingUpdateSchema.parse({bedroomTiers:[{id,price:140000}]}).bedroomTiers[0].price).toBe(140000);
    for(const price of [-500,NaN,Infinity,100000001,1.001]) expect(pricingUpdateSchema.safeParse({spaceTiers:[{id,price}]}).success).toBe(false);
    expect(pricingUpdateSchema.safeParse({bedroomTiers:[{id:"not-an-id",price:100}]}).success).toBe(false);
  });
});
