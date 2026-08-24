import { describe, expect, it } from "vitest";
import { serviceSchema } from "../src/lib/validation/service";
describe("serviceSchema", () => {
  it("accepts a valid configurable service", () => expect(serviceSchema.parse({ name: "Deep cleaning", slug: "deep-cleaning", pricingModel: "BEDROOM_BASED", sortOrder: 2 }).slug).toBe("deep-cleaning"));
  it("rejects a slug that cannot become a stable URL", () => expect(() => serviceSchema.parse({ name: "Deep cleaning", slug: "Deep Cleaning", pricingModel: "FIXED", sortOrder: 0 })).toThrow());
});
